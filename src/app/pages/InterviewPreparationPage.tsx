import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { 
  CheckCircle2, Clock, ListChecks, 
  Briefcase, Cpu, Shield, 
  MessageSquare, Camera, Mic, Wifi, AudioLines, ArrowRight
} from "lucide-react";

export default function InterviewPreparationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, targetRole, interviewMode, generatedQuestions } = location.state || {};
  const [isStarting, setIsStarting] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<{duration: number, questions: number} | null>(null);

  useEffect(() => {
    if (interviewMode === "recruiter") {
      fetch("http://localhost:8000/admin/templates")
        .then(res => res.json())
        .then(templates => {
          const t = templates.find((t: any) => t.roleName === targetRole && t.status === "Active");
          if (t) {
            setTemplateInfo({
              duration: t.totalDuration || 30,
              questions: (t.hrQuestions || 0) + (t.technicalQuestions || 0) + (t.behavioralQuestions || 0)
            });
          }
        })
        .catch(console.error);
    }
  }, [interviewMode, targetRole]);

  if (!file || !targetRole) {
    navigate("/dashboard");
    return null;
  }

  const handleStartInterview = async () => {
    setIsStarting(true);
    try {
      const payload = {
        resume_text: "Mock Resume Content", // Will be replaced by actual parsed text in future
        target_role: targetRole,
        difficulty: "medium",
        max_questions: 10,
        generated_questions: generatedQuestions || null,
        interview_mode: interviewMode
      };
      
      const res = await fetch("http://localhost:8000/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to start interview");
      
      const data = await res.json();
      if (data.session_id) {
        localStorage.setItem("hireflow_session_id", data.session_id);
        if (data.config) {
          localStorage.setItem("hireflow_session_config", JSON.stringify(data.config));
        }
      }
      
      // Navigate to readiness check first, passing state along
      navigate("/interview-readiness", { state: { file, targetRole, interviewMode } });
    } catch (error) {
      console.error(error);
      alert("Failed to initialize interview. Is the backend running?");
      setIsStarting(false);
    }
  };

  const getModeLabel = () => {
    switch (interviewMode) {
      case "resume-ai": return "Resume AI Interview";
      case "recruiter": return "Recruiter Interview";
      default: return "Interview";
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 relative overflow-hidden text-zinc-100 font-sans pt-24 pb-20">
      <div className="max-w-6xl w-full mx-auto z-10 space-y-8">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Interview Preparation</h1>
          <p className="text-zinc-400 text-lg">Review your interview configuration before starting.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-teal-400" />
                Interview Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <OverviewItem label="Target Role" value={targetRole} icon={<Briefcase className="w-4 h-4 text-zinc-400" />} />
                <OverviewItem label="Mode" value={getModeLabel()} icon={<Cpu className="w-4 h-4 text-zinc-400" />} />
                <OverviewItem label="Duration" value={interviewMode === 'recruiter' && templateInfo ? `~${templateInfo.duration} Mins` : "~30 Mins"} icon={<Clock className="w-4 h-4 text-zinc-400" />} />
                <OverviewItem label="Questions" value={interviewMode === 'recruiter' && templateInfo ? `${templateInfo.questions} Questions` : "12 Questions"} icon={<MessageSquare className="w-4 h-4 text-zinc-400" />} />
              </div>
            </motion.div>

            {/* What to Expect */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-400" />
                What to Expect
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Resume-based Questions" desc="Questions generated directly from your uploaded experience." />
                <SectionCard title="Technical Evaluation" desc="Role-specific technical and domain knowledge assessment." />
                <SectionCard title="Behavioural Assessment" desc="Situation-based and leadership scenario questions." />
                <SectionCard title="Communication Analysis" desc="Evaluation of your speaking pace, clarity and confidence." />
                <SectionCard title="Final AI Report" desc="A detailed post-interview report with actionable feedback." />
              </div>
            </motion.div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* System Check */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 text-white">System Check</h2>
              <div className="space-y-4">
                <SystemCheckItem label="Camera Ready" icon={<Camera className="w-4 h-4" />} />
                <SystemCheckItem label="Microphone Ready" icon={<Mic className="w-4 h-4" />} />
                <SystemCheckItem label="Internet Stable" icon={<Wifi className="w-4 h-4" />} />
                <SystemCheckItem label="Speech Engine" icon={<AudioLines className="w-4 h-4" />} />
              </div>
            </motion.div>

            {/* Start Button */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <button 
                disabled={isStarting}
                onClick={handleStartInterview}
                className="w-full py-5 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-bold rounded-2xl shadow-[0_0_30px_rgba(45,212,191,0.3)] transition-all flex justify-between items-center group text-lg disabled:opacity-70 disabled:cursor-wait"
              >
                <span>{isStarting ? "Initializing..." : "Start Interview"}</span>
                <div className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="font-semibold text-white text-sm">{value}</div>
    </div>
  );
}

function SectionCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-start gap-3 h-full">
      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="w-4 h-4 text-teal-400" />
      </div>
      <div>
        <h4 className="font-medium text-white text-sm mb-1">{title}</h4>
        <p className="text-zinc-400 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SystemCheckItem({ label, icon }: { label: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
      <div className="flex items-center gap-3 text-zinc-300">
        <div className="text-zinc-400">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    </div>
  );
}
