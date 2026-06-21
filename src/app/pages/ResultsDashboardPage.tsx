import { useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle, TrendingUp, AlertTriangle, Play, Download, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResultsDashboardPage() {
  useEffect(() => {
    document.title = "HireFlow | Results";
  }, []);

  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">HireFlow</h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">Senior Product Designer • Mock Session</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Play className="w-4 h-4" /> Watch Recording
          </button>
          <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-teal-900/20">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1 bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-[20px] border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <div className="relative w-40 h-40 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle 
                cx="50" cy="50" r="45" fill="none" stroke="#0D9488" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - 0.92) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">92</span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Excellent Performance</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">You are highly prepared for this role. Your communication and confidence were outstanding.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-[20px] border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">Performance Breakdown</h3>
          <div className="space-y-6">
            {[
              { label: "Communication", score: 94, color: "bg-teal-500" },
              { label: "Confidence", score: 88, color: "bg-cyan-500" },
              { label: "Eye Contact", score: 96, color: "bg-violet-500" },
              { label: "Technical Knowledge", score: 91, color: "bg-emerald-500" },
              { label: "Behavioral Responses", score: 89, color: "bg-blue-500" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{metric.label}</span>
                  <span className="font-mono text-zinc-500 dark:text-zinc-400">{metric.score}%</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    className={`h-full rounded-full ${metric.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-emerald-400">Key Strengths</h3>
          </div>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-zinc-900 dark:text-zinc-200 text-sm mb-1">Structured Storytelling</strong>
                <span className="text-zinc-600 dark:text-zinc-400 text-sm">You successfully used the STAR method to answer behavioral questions.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-zinc-900 dark:text-zinc-200 text-sm mb-1">Vocal Clarity</strong>
                <span className="text-zinc-600 dark:text-zinc-400 text-sm">Your speaking pace was optimal (145 WPM) with minimal filler words.</span>
              </div>
            </li>
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-amber-400">Areas to Improve</h3>
          </div>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 shrink-0" />
              <div>
                <strong className="block text-zinc-900 dark:text-zinc-200 text-sm mb-1">Technical Deep Dive</strong>
                <span className="text-zinc-600 dark:text-zinc-400 text-sm">Consider expanding on the specific architecture decisions when discussing the payment gateway.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-2 shrink-0" />
              <div>
                <strong className="block text-zinc-900 dark:text-zinc-200 text-sm mb-1">Follow-up Questions</strong>
                <span className="text-zinc-600 dark:text-zinc-400 text-sm">You didn't ask any questions at the end of the interview. Always have 2-3 prepared.</span>
              </div>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
