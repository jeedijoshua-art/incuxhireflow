import { useState, useEffect } from "react";
import { motion } from "motion/react";
import AIAvatar from "../components/interview/AIAvatar";
import { useNavigate } from "react-router-dom";
import { PhoneOff, ArrowRight, Activity, Eye, Mic, Zap } from "lucide-react";

export default function LiveInterviewPage() {
  useEffect(() => {
    document.title = "HireFlow | Mock Interview";
  }, []);

  const navigate = useNavigate();
  const [interviewState, setInterviewState] = useState<"listening" | "thinking" | "speaking">("speaking");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [questionIndex, setQuestionIndex] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextQuestion = () => {
    setQuestionIndex(prev => prev + 1);
    setInterviewState("thinking");
    setTimeout(() => setInterviewState("speaking"), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 p-6">
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
        <div className="font-mono text-xl font-medium text-teal-400">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left: AI Avatar */}
        <div className="lg:col-span-1 bg-zinc-900 border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <AIAvatar state={interviewState} />
          <div className="mt-8 text-center text-zinc-400 text-sm">
            {interviewState === "speaking" ? "AI is speaking..." : interviewState === "thinking" ? "AI is thinking..." : "AI is listening..."}
          </div>
        </div>

        {/* Center: Current Question */}
        <div className="lg:col-span-2 bg-zinc-900 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="text-teal-400 text-sm font-semibold mb-4 uppercase tracking-wider">Question {questionIndex}</div>
            <h2 className="text-2xl text-zinc-100 leading-relaxed font-medium">
              "Could you walk me through a time when you had to design a complex system from scratch? What was your approach to balancing user needs with technical constraints?"
            </h2>
          </div>

          <div className="flex items-center justify-between pt-8 mt-12 border-t border-white/[0.06]">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setInterviewState("listening")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${interviewState === "listening" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700"}`}
              >
                Start Answering
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button 
                onClick={() => navigate("/processing")}
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
          <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl flex-1 p-6 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> Live Telemetry
            </h3>
            
            <div className="space-y-8 flex-1 flex flex-col justify-center">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Mic className="w-4 h-4 text-teal-400" />
                    Communication
                  </div>
                  <span className="text-teal-400 font-mono text-sm font-bold">92%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: ["85%", "92%", "88%", "95%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-teal-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Confidence
                  </div>
                  <span className="text-cyan-400 font-mono text-sm font-bold">88%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: ["80%", "88%", "82%", "89%"] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
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
                  <span className="text-violet-400 font-mono text-sm font-bold">95%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: ["90%", "95%", "92%", "96%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-violet-500 rounded-full" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
