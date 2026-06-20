import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, UploadCloud, Target, Mic, FileText, CheckCircle } from "lucide-react";

const TIMELINE_STEPS = [
  { icon: UploadCloud, title: "Upload Resume", desc: "Share your professional background." },
  { icon: Target, title: "Choose Role", desc: "Select your target position and level." },
  { icon: Mic, title: "AI Interview", desc: "Practice with our adaptive AI coach." },
  { icon: Brain, title: "Analysis", desc: "Get real-time insights on your performance." },
  { icon: FileText, title: "Results", desc: "Review your detailed readiness report." },
];

export default function PracticePage() {
  useEffect(() => {
    document.title = "HireFlow | Practice";
  }, []);

  const navigate = useNavigate();
  const [demoInput, setDemoInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoInput.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-teal-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center bg-zinc-950/75 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
              <Brain className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
            </div>
            <span className="text-zinc-100 font-bold tracking-tight">HireFlow</span>
          </div>
          <button onClick={() => navigate("/login")} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Sign In
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-24">
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">How HireFlow Works</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Master your interview skills through our intelligent 5-step preparation process.</p>
        </motion.div>

        {/* Timeline Visualization */}
        <div className="relative mb-32">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 hidden md:block" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {TIMELINE_STEPS.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-teal-500/30 flex items-center justify-center mb-4 relative z-10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Interactive Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-zinc-900 border border-white/[0.06] rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full bg-teal-600/[0.03] blur-[100px] pointer-events-none" />
          
          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl font-bold mb-3">Try the AI Analysis Demo</h2>
            <p className="text-zinc-400">Answer the question below to see how our AI evaluates your response.</p>
          </div>

          <div className="max-w-2xl mx-auto bg-zinc-950 rounded-xl border border-white/[0.06] p-6 relative z-10">
            <div className="flex gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <div className="font-medium text-teal-400 mb-1">AI Interviewer</div>
                <div className="text-zinc-100">"Why do you think you are a good fit for this role?"</div>
              </div>
            </div>

            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <textarea 
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Type your response here..."
                className="w-full bg-zinc-900 border border-white/[0.1] rounded-lg p-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none h-32"
                disabled={isAnalyzing || showResults}
              />
              {!showResults ? (
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isAnalyzing || !demoInput.trim()}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze Response"}
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-white/[0.06]">
                  <h4 className="font-medium text-zinc-100 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Analysis Complete
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 p-4 rounded-lg border border-white/[0.05]">
                      <div className="text-xs text-zinc-400 mb-1">Confidence</div>
                      <div className="text-xl font-bold text-cyan-400">89%</div>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-lg border border-white/[0.05]">
                      <div className="text-xs text-zinc-400 mb-1">Communication</div>
                      <div className="text-xl font-bold text-teal-400">92%</div>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-lg border border-white/[0.05]">
                      <div className="text-xs text-zinc-400 mb-1">Technical Clarity</div>
                      <div className="text-xl font-bold text-violet-400">85%</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowResults(false); setDemoInput(""); }} className="mt-6 text-sm text-teal-400 hover:text-teal-300">
                    Try another response
                  </button>
                </motion.div>
              )}
            </form>
          </div>
        </motion.div>

        <div className="mt-20 text-center">
          <button onClick={() => navigate("/login")} className="px-8 py-4 bg-white text-zinc-950 hover:bg-zinc-200 font-bold rounded-xl transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2 mx-auto">
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
