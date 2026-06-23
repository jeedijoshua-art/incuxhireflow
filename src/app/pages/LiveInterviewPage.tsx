import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import AIAvatar from "../components/interview/AIAvatar";
import CandidateCamera from "../components/interview/CandidateCamera";
import { useNavigate } from "react-router-dom";
import { PhoneOff, ArrowRight, Activity, Eye, Mic, Zap, Smile, AlertTriangle } from "lucide-react";
import { stopAllInterviewResources, registerInterval } from "../utils/mediaCleanup";

interface TelemetryData {
  timestamp: number;
  faceDetected: boolean;
  emotion: string;
  confidence: number;
  attention: number;
  eyeContact: number;
}

export default function LiveInterviewPage() {
  const navigate = useNavigate();
  const [interviewState, setInterviewState] = useState<"listening" | "thinking" | "speaking">("speaking");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [questionIndex, setQuestionIndex] = useState(1);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: 0,
    faceDetected: false,
    emotion: "Neutral",
    confidence: 0,
    attention: 0,
    eyeContact: 0
  });

  const [violations, setViolations] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isEndingInterviewRef = useRef(false);
  
  // Speech Recognition / Transcript State
  const [transcript, setTranscript] = useState("");


  const handleFullscreenChange = () => {
    if (isEndingInterviewRef.current) return;
    if (!document.fullscreenElement) {
      setViolations(prev => [...prev, `Exited fullscreen at ${new Date().toLocaleTimeString()}`]);
      alert("Interview Integrity Violation Detected: Exited Fullscreen. Please return to fullscreen.");
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
      }
    }
  };

  const handleVisibilityChange = () => {
    if (isEndingInterviewRef.current) return;
    if (document.hidden) {
      setViolations(prev => [...prev, `Tab hidden/switched at ${new Date().toLocaleTimeString()}`]);
    }
  };

  const handleBlur = () => {
    if (isEndingInterviewRef.current) return;
    setViolations(prev => [...prev, `Window lost focus at ${new Date().toLocaleTimeString()}`]);
  };

  useEffect(() => {

    document.title = "HireFlow | Mock Interview";
    
    // Phase 2: Request Fullscreen on mount
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen request failed", err);
      }
    };
    requestFullscreen();

    // Setup WebSocket for Telemetry
    const ws = new WebSocket("ws://localhost:8000/ws/telemetry");
    ws.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);
        setTelemetry(data);
      } catch (e) {
        console.error("Failed to parse telemetry", e);
      }
    };
    wsRef.current = ws;

    // Timer
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    registerInterval(timer as unknown as number);

    // Violation Tracking

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Placeholder for where audio connection would be set up
    
    return () => {
      clearInterval(timer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      stopAllInterviewResources();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextQuestion = () => {
    setQuestionIndex(prev => prev + 1);
    setInterviewState("thinking");
    
    // Save current turn data locally
    const sessionData = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
    sessionData.push({
      question: questionIndex,
      transcript,
      telemetry,
    });
    localStorage.setItem("hireflow_session", JSON.stringify(sessionData));
    
    setTranscript("");
    setTimeout(() => setInterviewState("speaking"), 2000);
  };

  // ----------------------------------------------------
  // PLACEHOLDER RECORDING ARCHITECTURE
  // Future callbacks to attach voice processing logic
  // ----------------------------------------------------
  const onStartRecording = () => {
    setInterviewState("listening");
    console.log("[Placeholder] Started recording");
  };

  const onStopRecording = () => {
    setInterviewState("speaking");
    console.log("[Placeholder] Stopped recording");
  };

  const onTranscriptUpdate = (newText: string) => {
    setTranscript(newText);
    console.log("[Placeholder] Transcript updated manually");
  };

  const handleClearAnswer = () => {
    setTranscript("");
  };
  // ----------------------------------------------------

  const handleEndInterview = () => {
    isEndingInterviewRef.current = true;
    
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur);

    // Save final turn
    const sessionData = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
    sessionData.push({
      question: questionIndex,
      transcript,
      telemetry,
      violations
    });
    localStorage.setItem("hireflow_session", JSON.stringify(sessionData));

    stopAllInterviewResources();
    navigate("/processing");
  };

  const handleFrameCaptured = (b64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(b64);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">HireFlow</h1>
          </div>
          <div className="text-sm text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Session Recording Active
          </div>
        </div>
        
        {violations.length > 0 && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{violations.length} Violations Detected</span>
          </div>
        )}

        <div className="font-mono text-xl font-medium text-teal-400">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left: AI Avatar */}
        <div className="lg:col-span-1 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <AIAvatar state={interviewState} />
          <div className="mt-8 text-center text-zinc-400 text-sm">
            {interviewState === "speaking" ? "AI is speaking..." : interviewState === "thinking" ? "AI is thinking..." : "AI is listening..."}
          </div>
        </div>

        {/* Center: Current Question */}
        <div className="lg:col-span-2 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="text-teal-400 text-sm font-semibold mb-4 uppercase tracking-wider">Question {questionIndex}</div>
            <h2 className="text-2xl text-zinc-100 leading-relaxed font-medium">
              "Could you walk me through a time when you had to design a complex system from scratch? What was your approach to balancing user needs with technical constraints?"
            </h2>
          </div>

            <div className="flex-1 mt-6 flex flex-col gap-4">
              <textarea
                className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-zinc-100 text-lg md:text-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[100px] md:min-h-[160px]"
                placeholder="Your answer will appear here..."
                value={transcript}
                onChange={(e) => onTranscriptUpdate(e.target.value)}
              />
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {interviewState !== "listening" ? (
                    <button 
                      onClick={onStartRecording}
                      className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </button>
                  ) : (
                    <button 
                      onClick={onStopRecording}
                      className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-colors flex items-center gap-2 animate-pulse"
                    >
                      <span className="w-3 h-3 bg-white rounded-full" />
                      Stop Recording
                    </button>
                  )}
                  
                  <button 
                    onClick={handleClearAnswer}
                    disabled={!transcript}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 font-medium rounded-xl transition-colors"
                  >
                    Clear Answer
                  </button>
                </div>
              </div>
            </div>

          <div className="flex items-center justify-end pt-8 mt-6 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button 
                onClick={handleEndInterview}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Interview
              </button>
              <button 
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-white hover:bg-zinc-200 text-zinc-900 font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                Next Question
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Metrics */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <CandidateCamera onFrameCaptured={handleFrameCaptured} />
          
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl flex-1 p-6 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> Live Telemetry
            </h3>
            
            <div className="space-y-8 flex-1 flex flex-col justify-center">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Confidence
                  </div>
                  <span className="text-cyan-400 font-mono text-sm font-bold">{telemetry.confidence}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.confidence}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-cyan-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Eye className="w-4 h-4 text-violet-400" />
                    Eye Contact
                  </div>
                  <span className="text-violet-400 font-mono text-sm font-bold">{telemetry.eyeContact}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.eyeContact}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-violet-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Attention
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-bold">{telemetry.attention}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.attention}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-emerald-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Smile className="w-4 h-4 text-amber-400" />
                    Emotion
                  </div>
                  <span className="text-amber-400 font-mono text-sm font-bold">{telemetry.emotion}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    Face Detected
                  </div>
                  <span className={`font-mono text-sm font-bold ${telemetry.faceDetected ? 'text-green-400' : 'text-red-400'}`}>
                    {telemetry.faceDetected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
