import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, BrainCircuit, ArrowRight, CheckCircle2 } from "lucide-react";

const MODES = [
  {
    id: "resume-ai",
    title: "Resume AI Interview",
    description: "Our AI analyzes your uploaded resume to understand your skills, projects, education and experience before generating personalized interview questions tailored specifically to your profile.",
    features: [
      "AI Resume Analysis",
      "Personalized Questions",
      "Skill Assessment",
      "Project-Based Evaluation",
      "Experience-Based Discussion"
    ],
    buttonText: "Choose Resume AI",
    icon: <Briefcase className="w-8 h-8 text-teal-400" />
  },
  {
    id: "recruiter",
    title: "Recruiter Interview",
    description: "Experience a structured interview designed by recruiters and administrators with role-specific technical, behavioural and HR questions.",
    features: [
      "Recruiter Question Bank",
      "Technical Questions",
      "Behavioural Questions",
      "HR Assessment",
      "Role-Based Evaluation"
    ],
    buttonText: "Choose Recruiter Interview",
    icon: <BrainCircuit className="w-8 h-8 text-cyan-400" />
  }
];

export default function InterviewModePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, targetRole } = location.state || {};

  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  if (!file || !targetRole) {
    navigate("/dashboard");
    return null;
  }

  const handleSelect = (modeId: string) => {
    setSelectedMode(modeId);
    setTimeout(() => {
      if (modeId === "resume-ai") {
        navigate("/resume-analysis", {
          state: { file, targetRole, generatingAI: true }
        });
      } else {
        navigate("/interview-preparation", {
          state: { file, targetRole, interviewMode: modeId }
        });
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden text-zinc-100 font-sans">
      <div className="max-w-4xl w-full z-10 pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Choose Interview Mode</h1>
          <p className="text-zinc-400 text-lg">Select how you want to be evaluated for the {targetRole} role.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MODES.map((mode, idx) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleSelect(mode.id)}
              className={`relative cursor-pointer group rounded-2xl p-8 transition-all duration-300 border flex flex-col ${
                selectedMode === mode.id 
                ? "bg-teal-500/10 border-teal-500 shadow-[0_0_30px_rgba(45,212,191,0.2)] scale-[1.02]" 
                : "bg-white/5 border-white/10 hover:border-teal-500/50 hover:bg-white/10"
              }`}
            >
              <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {mode.icon}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">{mode.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 flex-grow">{mode.description}</p>
              
              <div className="space-y-3 mb-8">
                {mode.features.map(feature => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto flex justify-center w-full">
                <button className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${selectedMode === mode.id ? "bg-teal-600 text-white" : "bg-white/10 text-white group-hover:bg-teal-600/80"}`}>
                  {mode.buttonText} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
