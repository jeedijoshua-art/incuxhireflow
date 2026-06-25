import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Download, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generatePDFReport, SessionTurn } from "../utils/reportGenerator";

export default function ResultsDashboardPage() {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionTurn[]>([]);
  const [averages, setAverages] = useState({
    confidence: 0,
    attention: 0,
    eyeContact: 0,
    score: 0,
  });
  const [allViolations, setAllViolations] = useState<string[]>([]);

  useEffect(() => {
    document.title = "HireFlow | Results";

    // Ensure Fullscreen
    const requestFullscreen = async () => {
      try {
        if (
          !document.fullscreenElement &&
          document.documentElement.requestFullscreen
        ) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {}
    };
    requestFullscreen();

    const data: SessionTurn[] = JSON.parse(
      localStorage.getItem("hireflow_session") || "[]",
    );
    setSessionData(data);

    if (data.length > 0) {
      const conf = Math.round(
        data.reduce((acc, curr) => acc + curr.telemetry.confidence, 0) /
          data.length,
      );
      const att = Math.round(
        data.reduce((acc, curr) => acc + curr.telemetry.attention, 0) /
          data.length,
      );
      const eye = Math.round(
        data.reduce((acc, curr) => acc + curr.telemetry.eyeContact, 0) /
          data.length,
      );

      const score = Math.round((conf + att + eye) / 3);

      setAverages({ confidence: conf, attention: att, eyeContact: eye, score });

      const v: string[] = [];
      data.forEach((t) => {
        if (t.violations) v.push(...t.violations);
      });
      setAllViolations(v);
    } else {
      setAverages({ confidence: 0, attention: 0, eyeContact: 0, score: 0 });
    }
  }, []);

  const handleExitToDashboard = () => {
    if (document.fullscreenElement) {
    }
    navigate("/dashboard");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end mb-10"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="/favicon.png"
              alt="HireFlow Logo"
              className="w-8 h-8 rounded-lg"
            />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              HireFlow
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Candidate Session • AI Telemetry Analysis
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => generatePDFReport(sessionData)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-teal-900/20"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={handleExitToDashboard}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20"
          >
            <Home className="w-4 h-4" /> Exit to Dashboard
          </button>
        </div>
      </motion.div>

      {allViolations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-red-400 font-bold">
            <AlertTriangle className="w-5 h-5" /> Integrity Violations Detected
          </div>
          <ul className="text-sm text-red-300 list-disc list-inside">
            {allViolations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]"
        >
          <div className="relative w-40 h-40 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#0D9488"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 45 * (1 - averages.score / 100),
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                {averages.score || "--"}
              </span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                Score
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Overall Performance
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Generated from confidence, attention, eye-contact and emotional
            telemetry signals across {sessionData.length} questions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]"
        >
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Telemetry Breakdown
          </h3>
          <div className="space-y-6">
            {[
              {
                label: "Confidence (Visual)",
                score: averages.confidence,
                color: "bg-cyan-500",
              },
              {
                label: "Eye Contact",
                score: averages.eyeContact,
                color: "bg-violet-500",
              },
              {
                label: "Attention Focus",
                score: averages.attention,
                color: "bg-emerald-500",
              },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {metric.label}
                  </span>
                  <span className="font-mono text-zinc-500 dark:text-zinc-400">
                    {metric.score || 0}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score || 0}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    className={`h-full rounded-full ${metric.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          Session Transcript & Telemetry Timeline
        </h3>
        <div className="space-y-6">
          {sessionData.map((turn, idx) => (
            <div key={idx} className="border-l-2 border-teal-500/50 pl-4 py-1">
              <div className="text-xs font-semibold text-teal-400 mb-2 uppercase tracking-wide">
                Question {turn.question}
              </div>
              <p className="text-zinc-300 text-sm mb-3">
                "{turn.transcript || "(No audible response recorded)"}"
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-zinc-500 bg-black/20 p-2 rounded-lg">
                <span className="text-cyan-400">
                  Conf: {turn.telemetry.confidence}%
                </span>
                <span className="text-emerald-400">
                  Att: {turn.telemetry.attention}%
                </span>
                <span className="text-violet-400">
                  Eye: {turn.telemetry.eyeContact}%
                </span>
                <span className="text-amber-400">
                  Emotion: {turn.telemetry.emotion}
                </span>
              </div>
            </div>
          ))}
          {sessionData.length === 0 && (
            <div className="text-zinc-500">No session data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
