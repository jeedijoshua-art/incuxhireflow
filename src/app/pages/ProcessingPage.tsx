import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Brain, Loader2 } from "lucide-react";
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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    document.title = "HireFlow | Processing";
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let timeout: ReturnType<typeof setTimeout>;

    if (currentStep < STEPS.length) {
      timeout = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, STEPS[currentStep].duration);
    } else {
      timeout = setTimeout(() => {
        navigate("/results", { replace: true });
      }, 1000);
    }

    return () => clearTimeout(timeout);
  }, [currentStep, navigate, isMounted]);

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
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(45,212,191,0.15) 0%, transparent 50%)",
            backgroundSize: "120% 120%",
          }}
        />
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 1000),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 1000),
              scale: Math.random() * 0.5 + 0.5,
              opacity: Math.random() * 0.3,
            }}
            animate={{
              y: [null, Math.random() * -100 - 50],
              opacity: [null, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute w-1.5 h-1.5 bg-teal-500 rounded-full blur-[1px]"
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
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
            <img
              src="/favicon.png"
              alt="HireFlow Logo"
              className="w-8 h-8 rounded-lg"
            />
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              HireFlow
            </h1>
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
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isCurrent ? "bg-[rgba(10,15,25,0.72)] backdrop-blur-md border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)]" : "bg-transparent border-transparent"}`}
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
                <div
                  className={`font-medium ${isCurrent ? "text-teal-400" : isCompleted ? "text-zinc-300" : "text-zinc-600"}`}
                >
                  {step.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
