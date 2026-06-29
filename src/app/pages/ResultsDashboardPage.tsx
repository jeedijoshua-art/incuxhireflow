import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Download, Home, CheckCircle2, XCircle, Activity, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generatePDFReport, SessionTurn, FinalFeedbackReport, isQuestionAttempted, buildMismatchEntry } from "../utils/reportGenerator";

interface QuestionTurnResult {
  question: string;
  expected_answer: string;
  candidate_answer: string;
  evaluation: any;
}

interface FinalFeedbackReport {
  overall_score: number;
  communication_avg: number;
  technical_accuracy_avg: number;
  confidence_avg: number;
  strengths: string[];
  areas_to_improve: string[];
  summary: string;
  answer_mismatches: string[];
  question_turns: QuestionTurnResult[];
}

export default function ResultsDashboardPage() {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionTurn[]>([]);
  const [finalReport, setFinalReport] = useState<FinalFeedbackReport | null>(null);
  const [allViolations, setAllViolations] = useState<string[]>([]);

  useEffect(() => {
    document.title = "HireFlow | Results";

    const requestFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {}
    };
    requestFullscreen();

    const sessionDataLocal: SessionTurn[] = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
    setSessionData(sessionDataLocal);

    const reportLocal = localStorage.getItem("hireflow_final_report");
    if (reportLocal) {
      try {
        setFinalReport(JSON.parse(reportLocal));
      } catch (e) {
        console.error("Failed to parse final report", e);
      }
    }

    if (sessionDataLocal.length > 0) {
      const v: string[] = [];
      sessionDataLocal.forEach((t) => {
        if (t.violations) v.push(...t.violations);
      });
      setAllViolations(v);
    }

    // Clear session data from localStorage after loading results
    // This ensures future interviews always start completely fresh
    // (the report itself is kept in hireflow_final_report for PDF export)
  }, []);

  const handleExitToDashboard = () => {
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
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              HireFlow
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Candidate Session • AI Analysis
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => generatePDFReport(sessionData, finalReport || undefined)}
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

      {finalReport ? (
        <>
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
                    stroke={finalReport.overall_score >= 70 ? "#0D9488" : finalReport.overall_score >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 45}
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - finalReport.overall_score / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                    {finalReport.overall_score || "--"}
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
                {finalReport.summary}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
                Score Breakdown
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Communication", score: finalReport.communication_avg, color: "bg-cyan-500" },
                  { label: "Technical Accuracy", score: finalReport.technical_accuracy_avg, color: "bg-violet-500" },
                  { label: "Confidence", score: finalReport.confidence_avg, color: "bg-emerald-500" }
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Strengths
              </h3>
              <ul className="space-y-2">
                {finalReport.strengths.map((strength, i) => (
                  <li key={i} className="text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-orange-500" /> Areas to Improve
              </h3>
              <ul className="space-y-2">
                {finalReport.areas_to_improve.map((area, i) => (
                  <li key={i} className="text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-orange-500 shrink-0 mt-1" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {(finalReport.question_turns?.length > 0 || finalReport.answer_mismatches.length > 0) && (
            <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)] mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Answer Mismatches & Missing Points
              </h3>
              <ul className="space-y-3">
                {(finalReport.question_turns?.length > 0
                  ? finalReport.question_turns.map((turn, idx) => buildMismatchEntry(turn, idx))
                  : finalReport.answer_mismatches
                ).map((mismatch, i) => (
                  <li key={i} className="text-zinc-700 dark:text-zinc-300 p-3 bg-red-50 dark:bg-red-500/5 rounded-lg border border-red-200 dark:border-red-500/20">
                    {mismatch}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {finalReport.question_turns && finalReport.question_turns.length > 0 && (
            <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)] mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" /> Question-by-Question Analysis & Comparison
              </h3>
              <div className="space-y-8">
                {finalReport.question_turns.map((turn, i) => (
                  <div key={i} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 bg-zinc-50 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        QUESTION {i+1}
                      </span>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{turn.question}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> ✅ Expected Answer
                        </h4>
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800/30 text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">
                          {turn.expected_answer}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                          <Mic className="w-4 h-4" /> 🎤 Your Answer
                        </h4>
                        <div className={`p-4 rounded-lg border text-sm leading-relaxed ${
                          !turn.candidate_answer || turn.candidate_answer.trim() === ''
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30'
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30'
                        } text-zinc-800 dark:text-zinc-200`}>
                          {!turn.candidate_answer || turn.candidate_answer.trim() === '' ? (
                            <span className="flex items-center gap-2">
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                SKIPPED
                              </span>
                              <span className="text-red-400 dark:text-red-400">This question was not answered.</span>
                            </span>
                          ) : turn.candidate_answer}
                        </div>
                      </div>
                    </div>
                    
                    {turn.evaluation && (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                          <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> 📋 Missing Points & Feedback
                          </h4>
                          <p className="text-zinc-700 dark:text-zinc-300 text-sm">
                            {isQuestionAttempted(turn)
                              ? turn.evaluation.expected_answer_match || "No specific missing points identified."
                              : "Not attempted"}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-400 mb-3">Evaluation Scores</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border border-cyan-100 dark:border-cyan-800/30 text-center">
                              <span className="text-cyan-700 dark:text-cyan-400 font-bold block text-xs uppercase tracking-wider mb-1">
                                Communication
                              </span>
                              <span className="text-zinc-900 dark:text-zinc-100 text-2xl font-bold">
                                {turn.evaluation.communication || 0}%
                              </span>
                            </div>
                            <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg border border-violet-100 dark:border-violet-800/30 text-center">
                              <span className="text-violet-700 dark:text-violet-400 font-bold block text-xs uppercase tracking-wider mb-1">
                                Technical
                              </span>
                              <span className="text-zinc-900 dark:text-zinc-100 text-2xl font-bold">
                                {turn.evaluation.technical_accuracy || 0}%
                              </span>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30 text-center">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-xs uppercase tracking-wider mb-1">
                                Confidence
                              </span>
                              <span className="text-zinc-900 dark:text-zinc-100 text-2xl font-bold">
                                {turn.evaluation.confidence || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <p className="text-zinc-600 dark:text-zinc-400">No final report available.</p>
        </div>
      )}

      {sessionData.length > 0 && (
        <div className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Session Transcript
          </h3>
          <div className="space-y-6">
            {sessionData.map((turn, i) => (
              <div key={i} className="border-l-2 border-teal-500/50 pl-4 py-1">
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
          </div>
        </div>
      )}
    </div>
  );
}
