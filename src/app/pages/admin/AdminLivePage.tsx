import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Video, Clock, Activity, Target } from "lucide-react";
import { fetchLiveInterviews } from "../../utils/adminApi";
import { useNavigate } from "react-router-dom";

export default function AdminLivePage() {
  const navigate = useNavigate();
  const [liveInterviews, setLiveInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLiveInterviews();
    const interval = setInterval(loadLiveInterviews, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const loadLiveInterviews = async () => {
    try {
      const data = await fetchLiveInterviews();
      setLiveInterviews(data || []);
    } catch (error) {
      console.error("Failed to load live interviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2 flex items-center gap-3">
            Live Interviews
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {liveInterviews.length} Active
            </span>
          </h1>
          <p className="text-zinc-400">Monitor ongoing candidate interviews in real-time.</p>
        </div>
      </motion.div>

      {isLoading && liveInterviews.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">Loading live sessions...</div>
      ) : liveInterviews.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No active interviews at the moment.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {liveInterviews.map((interview, i) => (
            <motion.div 
              key={interview.id}
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              className={`bg-[rgba(10,15,25,0.72)] backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden ${
                interview.status === 'Warning' ? 'border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)]'
              }`}
            >
              {/* Live indicator top right */}
              <div className="absolute top-6 right-6 flex items-center gap-2 text-xs font-bold text-zinc-400">
                <Clock className="w-3.5 h-3.5" />
                {interview.remainingTime || "Unknown"} left
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-white/[0.05]">
                  {interview.candidate ? interview.candidate.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{interview.candidate || "Candidate"}</h3>
                  <p className="text-sm text-teal-400 font-medium">{interview.role || "Role"}</p>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-xl border border-white/[0.04] mb-6">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Current Question
                </div>
                <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                  "{interview.currentQuestion || "Interview in progress..."}"
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${(interview.confidence || 0) >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-sm text-zinc-400">Confidence Score: <span className="font-bold text-zinc-200">{interview.confidence || 0}%</span></span>
                </div>
                
                <button 
                  onClick={() => navigate(`/admin/live/${interview.id}`)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-medium rounded-lg border border-white/[0.08] transition-colors flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Spectate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
