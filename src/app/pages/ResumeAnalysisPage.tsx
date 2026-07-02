import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Sparkles, Cpu } from "lucide-react";

const STAGES = [
  "Resume Uploaded",
  "Parsing Resume",
  "Extracting Skills",
  "Identifying Experience",
  "Matching Selected Role",
  "Preparing Interview Plan",
  "Generating AI Questions",
  "Almost Ready"
];

export default function ResumeAnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, targetRole, generatingAI } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    document.title = "HireFlow | Analyzing Resume";

    if (!file || !targetRole) {
      navigate("/dashboard");
      return;
    }
    
    // IF generatingAI is true, we do the real API call!
    if (generatingAI) {
      const generateQuestions = async () => {
        try {
          // Fake progress loop just for visuals
          const progressInterval = setInterval(() => {
             setProgress(prev => Math.min(prev + (100 / 100), 90));
             setCurrentStage(prev => Math.min(Math.floor((progress / 100) * STAGES.length), STAGES.length - 2));
          }, 100);
          
          const formData = new FormData();
          formData.append("file", file);
          formData.append("target_role", targetRole);
          
          const res = await fetch("http://localhost:8000/resume/analyze", {
            method: "POST",
            body: formData
          });
          
          if (!res.ok) throw new Error("Failed to generate questions");
          const data = await res.json();
          
          clearInterval(progressInterval);
          setProgress(100);
          setCurrentStage(STAGES.length - 1);
          
          const generatedQuestions = data.questions;
          
          setTimeout(() => {
            navigate("/interview-preparation", { 
              state: { file, targetRole, interviewMode: "resume-ai", generatedQuestions } 
            });
          }, 800);
          
        } catch (error) {
          console.error(error);
          alert("Unable to generate personalized interview questions.");
          // Fallback or retry logic (just go back for now)
          navigate("/interview-mode", { state: { file, targetRole } });
        }
      };
      
      generateQuestions();
      return;
    }

    // ORIGINAL SIMULATED FLOW for initial analysis
    const duration = 6000; // 6 seconds
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount++;
      const newProgress = Math.min((stepCount / steps) * 100, 100);
      setProgress(newProgress);

      const stageIdx = Math.min(
        Math.floor((newProgress / 100) * STAGES.length),
        STAGES.length - 1
      );
      setCurrentStage(stageIdx);

      if (stepCount >= steps) {
        clearInterval(interval);
        setTimeout(() => {
          navigate("/interview-mode", { state: { file, targetRole } });
        }, 800);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [file, targetRole, generatingAI, navigate]);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 relative overflow-hidden text-zinc-100 font-sans selection:bg-teal-500/30">
      <div className="max-w-2xl w-full z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-5 mb-10"
        >
          <div className="w-20 h-20 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.15)] relative">
            <Cpu className="w-10 h-10 text-teal-400 absolute" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-teal-500/30 rounded-2xl"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3 flex items-center justify-center gap-3">
              Analyzing Resume <Sparkles className="w-6 h-6 text-teal-400" />
            </h1>
            <p className="text-zinc-400 text-lg">
              Our AI is reviewing your profile for the <span className="text-teal-400 font-medium">{targetRole}</span> role.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Progress Bar */}
          <div className="mb-8 relative z-10">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-teal-400">Analysis Progress</span>
              <span className="text-3xl font-bold font-mono text-white">{Math.floor(progress)}%</span>
            </div>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stages List */}
          <div className="space-y-4 relative z-10">
            {STAGES.map((stage, idx) => {
              const isActive = idx === currentStage && progress < 100;
              const isComplete = idx < currentStage || progress === 100;
              const isWaiting = idx > currentStage;

              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ 
                    opacity: isWaiting ? 0.3 : 1, 
                    x: 0,
                    scale: isActive ? 1.02 : 1
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-white/10 border border-white/20 shadow-lg" : "border border-transparent"
                  }`}
                >
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <CheckCircle2 className="w-6 h-6 text-teal-400" />
                      </motion.div>
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                    )}
                  </div>
                  <span className={`font-medium text-lg ${isComplete ? "text-zinc-300" : isActive ? "text-white" : "text-zinc-500"}`}>
                    {stage}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
