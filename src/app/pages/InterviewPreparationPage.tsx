import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Brain, CheckCircle2, Cpu, Activity, Mic, Eye, Database, Sparkles, Loader2, Network, File as FileIcon, AlertTriangle, RefreshCw } from "lucide-react";

const STAGES = [
  "Resume Loaded",
  "Interview Questions Prepared",
  "AI Interviewer Initialized",
  "Voice Persona Loaded",
  "Camera & Microphone Configuration",
  "Behaviour Tracking Models Ready",
  "Final System Checks"
];

const MESSAGES = [
  "Analyzing resume...",
  "Preparing interview questions...",
  "Loading AI interviewer...",
  "Synchronizing speech engine...",
  "Initializing behavioural tracking...",
  "Building confidence profile...",
  "Preparing interview environment...",
  "Almost ready..."
];

export default function InterviewPreparationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, targetRole } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    document.title = "HireFlow | Preparing Interview";
    
    if (!file || !targetRole) {
      setError("Missing configuration data. Please return to the dashboard.");
      setIsError(true);
      return;
    }

    let isMounted = true;
    let fakeProgressInterval: any;

    async function processInterview() {
      setIsError(false);
      setError(null);
      setProgress(0);
      setCurrentStage(0);

      try {
        // Start fake visual progress up to 90% while waiting for network
        fakeProgressInterval = setInterval(() => {
          setProgress(p => {
             if (p < 30) return p + 1;
             if (p < 60) return p + 0.5;
             if (p < 90) return p + 0.1;
             return p;
          });
        }, 50);

        // Stage 1: Resume Loading & Analysis
        const formData = new FormData();
        formData.append("file", file);
        
        console.log("[DEBUG] Starting /resume/analyze");
        const res1 = await fetch("/resume/analyze", {
          method: "POST",
          body: formData
        });
        
        if (!res1.ok) {
          const errText = await res1.text();
          throw new Error(`Resume analysis failed: ${errText || res1.status}`);
        }
        
        const result1 = await res1.json();
        if (!isMounted) return;
        
        localStorage.setItem("hireflow_resume_data", JSON.stringify(result1));
        localStorage.setItem("hireflow_target_role", targetRole);

        // visually jump to midway
        setProgress(Math.max(progress, 40));
        setCurrentStage(2); 

        // Stage 2: Interview Session Start
        const resumeText = result1.raw_text || JSON.stringify(result1);
        const payload = { resume_text: resumeText, target_role: targetRole };
        
        console.log("[DEBUG] Starting /interview/start");
        const res2 = await fetch("/interview/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (!res2.ok) {
          const errText = await res2.text();
          throw new Error(`Interview initialization failed: ${errText || res2.status}`);
        }
        
        const result2 = await res2.json();
        if (!isMounted) return;
        
        localStorage.removeItem("hireflow_session");
        localStorage.setItem("hireflow_session_id", result2.session_id);

        // Success: Snap to 100% and finish
        clearInterval(fakeProgressInterval);
        setProgress(100);
        setCurrentStage(STAGES.length - 1);
        
        setTimeout(() => {
          if (isMounted) navigate("/interview-readiness");
        }, 1000);

      } catch (err: any) {
        if (!isMounted) return;
        clearInterval(fakeProgressInterval);
        setIsError(true);
        setError(err.message || "An unexpected network error occurred.");
      }
    }

    processInterview();

    return () => {
      isMounted = false;
      if (fakeProgressInterval) clearInterval(fakeProgressInterval);
    };
  }, [file, targetRole, navigate, retryCount]);

  useEffect(() => {
    // Map the current visual progress to the stages dynamically (if not forced earlier)
    if (progress < 100 && !isError) {
      const stageIdx = Math.min(
        Math.floor((progress / 100) * STAGES.length),
        STAGES.length - 1
      );
      // Only increment stage naturally, don't decrement if we jumped ahead
      setCurrentStage(prev => Math.max(prev, stageIdx));
    }
  }, [progress, isError]);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(messageTimer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden text-zinc-100 font-sans selection:bg-teal-500/30"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/10 via-black to-blue-900/5" />
        <motion.div
          animate={{ 
            backgroundPosition: ["0% 0%", "100% 100%"],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(45,212,191,0.15) 0%, transparent 50%)",
            backgroundSize: "120% 120%"
          }}
        />
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3
            }}
            animate={{
              y: [null, Math.random() * -100 - 50],
              opacity: [null, 0.5, 0]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-1.5 h-1.5 bg-teal-500 rounded-full blur-[1px]"
          />
        ))}
      </div>

      <div className="max-w-5xl w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Header & Progress */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.15)]">
              <Network className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
                Preparing Your Interview
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
                Our AI is analyzing your profile and preparing a personalized interview experience tailored to your exact skillset.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Error Overlay */}
            <AnimatePresence>
              {isError && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center"
                >
                  <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Preparation Failed</h3>
                  <p className="text-zinc-400 text-sm mb-6 max-w-sm">{error}</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => navigate("/dashboard")}
                      className="px-6 py-2.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors"
                    >
                      Go Back
                    </button>
                    <button 
                      onClick={() => setRetryCount(r => r + 1)}
                      className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Bar */}
            <div className="mb-8 relative z-10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">System Initialization</span>
                <span className="text-2xl font-bold font-mono text-white">{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-3 relative z-10">
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
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-white/5 border border-white/10" : "border border-transparent"
                    }`}
                  >
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-teal-400" />
                        </motion.div>
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                      )}
                    </div>
                    <span className={`font-medium ${isComplete ? "text-zinc-300" : isActive ? "text-white" : "text-zinc-500"}`}>
                      {stage}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Side: AI Intelligence Card */}
        <div className="lg:col-span-5 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 25 }}
            className="bg-gradient-to-b from-teal-900/20 to-black/40 backdrop-blur-xl border border-teal-500/20 rounded-2xl p-6 shadow-[0_0_50px_rgba(45,212,191,0.05)] relative overflow-hidden"
          >
            {/* Subtle inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
            
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI Intelligence</h3>
            </div>

            <div className="space-y-6">
              <IntelligenceItem 
                icon={<FileIcon className="w-4 h-4" />} 
                label="Resume Analysis" 
                value={progress > 10 ? "100%" : "Analyzing..."} 
                active={progress > 0} 
              />
              <IntelligenceItem 
                icon={<Database className="w-4 h-4" />} 
                label="Question Bank" 
                value={progress > 25 ? "Ready" : "Compiling..."} 
                active={progress > 25} 
              />
              <IntelligenceItem 
                icon={<Mic className="w-4 h-4" />} 
                label="Speech Engine" 
                value={progress > 50 ? "Ready" : "Initializing..."} 
                active={progress > 50} 
              />
              <IntelligenceItem 
                icon={<Eye className="w-4 h-4" />} 
                label="Vision AI" 
                value={progress > 70 ? "Ready" : "Loading..."} 
                active={progress > 70} 
              />
              <IntelligenceItem 
                icon={<Activity className="w-4 h-4" />} 
                label="Telemetry" 
                value={progress > 85 ? "Ready" : "Connecting..."} 
                active={progress > 85} 
              />
              <IntelligenceItem 
                icon={<Cpu className="w-4 h-4" />} 
                label="Interview Engine" 
                value={progress === 100 ? "Ready" : "Warming up..."} 
                active={progress > 95} 
              />
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-teal-400 font-medium bg-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20">
                <Sparkles className="w-4 h-4" />
                <span>Premium Quality Enabled</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Rotating Messages */}
      {!isError && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-400 text-sm font-medium tracking-wide flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/5"
        >
          <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
          <AnimatePresence mode="wait">
            <motion.span
              key={messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {MESSAGES[messageIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

function IntelligenceItem({ icon, label, value, active }: { icon: React.ReactNode, label: string, value: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-3 transition-colors duration-500 ${active ? "text-white" : "text-zinc-500"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500 ${active ? "bg-teal-500/10 text-teal-400" : "bg-white/5 text-zinc-500"}`}>
          {icon}
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <span className={`text-sm font-mono font-medium transition-colors duration-500 ${active ? "text-cyan-400" : "text-zinc-600"}`}>
        {value}
      </span>
    </div>
  );
}
