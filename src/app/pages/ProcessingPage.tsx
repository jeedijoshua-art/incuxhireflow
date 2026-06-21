import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Brain, Loader2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { label: "Transcribing Audio", duration: 1500 },
  { label: "Analyzing Communication", duration: 2000 },
  { label: "Analyzing Confidence", duration: 2000 },
  { label: "Analyzing Eye Contact", duration: 1800 },
  { label: "Generating Insights", duration: 1200 },
  { label: "Generating Final Report", duration: 1500 },
];

export default function ProcessingPage() {
  useEffect(() => {
    document.title = "HireFlow | Processing";
  }, []);

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (currentStep < STEPS.length) {
      timeout = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, STEPS[currentStep].duration);
    } else {
      timeout = setTimeout(() => {
        navigate("/results");
      }, 1000);
    }

    return () => clearTimeout(timeout);
  }, [currentStep, navigate]);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-dashed border-teal-500/30 flex items-center justify-center mx-auto mb-6"
          >
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-6 h-6 text-teal-400" />
            </motion.div>
          </motion.div>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">HireFlow</h1>
          </div>
          <p className="text-zinc-400 text-sm">Processing Interview...</p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <motion.div 
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isCurrent ? "bg-[rgba(10,15,25,0.72)] backdrop-blur-[20px] border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)]" : "bg-transparent border-transparent"}`}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  )}
                </div>
                <div className={`font-medium ${isCurrent ? "text-teal-400" : isCompleted ? "text-zinc-300" : "text-zinc-600"}`}>
                  {step.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
