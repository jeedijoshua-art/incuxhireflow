import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Briefcase, Clock, Target, Activity, Eye, Smile, AlertTriangle, Zap, CameraOff, Video } from "lucide-react";
import { fetchLiveSessionDetails } from "../../utils/adminApi";

export default function AdminLiveObservePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 2000); // 2-second polling
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadSession = async () => {
    try {
      if (!sessionId) return;
      const data = await fetchLiveSessionDetails(sessionId);
      setSession(data);
    } catch (error) {
      console.error("Failed to load live session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !session) {
    return <div className="p-8 text-center text-zinc-500">Loading session data...</div>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <div className="text-zinc-500 mb-4">Session not found or has ended.</div>
        <button onClick={() => navigate("/admin/live")} className="px-4 py-2 bg-white/[0.04] text-white rounded-lg">Back to Live Interviews</button>
      </div>
    );
  }

  const { telemetry = {}, warnings = [], latestFrame } = session;

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate("/admin/live")}
          className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            Observing: {session.candidate}
            {session.status === "Warning" ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">WARNING</span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">LIVE</span>
            )}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT PANEL: Candidate Summary */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-400" /> Candidate Profile
            </h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-2xl text-zinc-300 font-bold border border-white/[0.05]">
                {session.candidate.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">{session.candidate}</h2>
                <div className="text-sm text-zinc-400">{session.candidateEmail}</div>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                <span className="text-zinc-500 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Role</span>
                <span className="font-medium text-zinc-200">{session.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                <span className="text-zinc-500 flex items-center gap-2"><Video className="w-4 h-4"/> Type</span>
                <span className="font-medium text-zinc-200">{session.interviewType}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                <span className="text-zinc-500 flex items-center gap-2"><Clock className="w-4 h-4"/> Elapsed</span>
                <span className="font-medium text-teal-400">{session.elapsedTime}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500 flex items-center gap-2"><Target className="w-4 h-4"/> Progress</span>
                <span className="font-medium text-zinc-200">{session.progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-teal-500 h-full" style={{ width: `${session.progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Video, Question, Transcript */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-4 flex flex-col min-h-0 h-full">
            
            {/* Live Camera Feed */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center border border-white/[0.05]">
              {latestFrame ? (
                <img src={`data:image/jpeg;base64,${latestFrame}`} alt="Candidate Stream" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-zinc-600">
                  <CameraOff className="w-12 h-12 mb-2" />
                  <span className="text-sm">Camera Offline / Syncing...</span>
                </div>
              )}
              <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 rounded text-xs font-mono text-zinc-400 backdrop-blur-sm">
                0.5 FPS (Telemetry)
              </div>
            </div>

            <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
              Question {session.currentQuestionIndex} of {session.totalQuestions}
            </div>
            <h2 className="text-xl font-medium text-zinc-100 mb-6 leading-relaxed">
              "{session.currentQuestion}"
            </h2>

            <div className="flex-1 bg-black/30 rounded-xl p-4 border border-white/[0.04] overflow-y-auto flex flex-col min-h-[150px]">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Live Transcript</div>
              <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                {session.transcript ? (
                  session.transcript
                ) : (
                  <span className="text-zinc-600 italic">Listening...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Telemetry and Timeline */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 flex flex-col flex-1 min-h-0">
            <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> AI Telemetry
            </h3>
            
            <div className="space-y-6 mb-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium"><Activity className="w-4 h-4 text-cyan-400"/> Confidence</div>
                  <span className="text-cyan-400 font-mono text-sm font-bold">{telemetry.confidence || 0}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${telemetry.confidence || 0}%` }} /></div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium"><Eye className="w-4 h-4 text-violet-400"/> Eye Contact</div>
                  <span className="text-violet-400 font-mono text-sm font-bold">{telemetry.eyeContact || 0}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${telemetry.eyeContact || 0}%` }} /></div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium"><Zap className="w-4 h-4 text-emerald-400"/> Attention</div>
                  <span className="text-emerald-400 font-mono text-sm font-bold">{telemetry.attention || 0}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${telemetry.attention || 0}%` }} /></div>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium"><Smile className="w-4 h-4 text-amber-400"/> Emotion</div>
                <span className="text-amber-400 text-sm font-bold">{telemetry.emotion || "Neutral"}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">Face Detected</div>
                <span className={`text-sm font-bold ${telemetry.faceDetected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {telemetry.faceDetected ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-t border-white/[0.04] pt-6">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Event Timeline
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3">
              {warnings.length === 0 ? (
                <div className="text-sm text-zinc-500 italic">No violation events detected.</div>
              ) : (
                warnings.map((w: string, i: number) => (
                  <div key={i} className="flex gap-3 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-red-200">{w}</span>
                  </div>
                )).reverse()
              )}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
