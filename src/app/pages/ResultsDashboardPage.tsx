import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Download, Home, CheckCircle2, Target, Brain, Activity, Shield, Award, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generatePDFReport, SessionTurn } from "../utils/reportGenerator";

function getStatusLabel(score: number) {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
  if (score >= 80) return { label: "Good", color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20" };
  if (score >= 70) return { label: "Needs Improvement", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" };
  return { label: "Weak", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
}

function getExpectedStructure(category: string, isTechnical: boolean) {
  if (isTechnical || category === "Technical") {
    return ["Definition", "Explanation", "Advantages", "Disadvantages", "Real-world Example"];
  }
  return ["Introduction", "Education", "Technical Skills", "Projects", "Achievements", "Career Goals"];
}

function getSuggestion(evalData: any = {}) {
  const communication = Number(evalData.communication ?? 0);
  const confidence = Number(evalData.confidence ?? 0);
  const keywordMatch = Number(evalData.keyword_match ?? 0);

  if (communication < 70) return "Your explanation had good points but could be structured better. Try using the STAR method to improve clarity.";
  if (confidence < 70) return "You sound a bit hesitant. Practice delivering your answers with more conviction and steady pacing.";
  if (keywordMatch < 70) return "Your explanation covered the basic concepts well. Try adding specific technical terms and a practical example from one of your projects to strengthen your answer.";
  return "Excellent response! You clearly articulated the core concepts and demonstrated strong understanding.";
}

function parseMissingConcepts(explanation: string, expectedKeywords: string[], keywordMatch: number) {
  const stopWords = new Set(["candidate", "should", "clearly", "introduce", "themselves", "to", "the", "a", "is", "in", "and", "of", "for", "mention", "explain", "detail"]);
  const missingLines = (explanation || "").split('\n').filter(l => l.toLowerCase().includes('missing:'));
  const words = missingLines.map(l => l.replace(/missing:/i, '').trim());
  const filtered = words.filter(w => !stopWords.has(w.toLowerCase()) && w.length > 2);
  
  if (filtered.length > 0) {
    return filtered.map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }
  
  if (keywordMatch < 100 && expectedKeywords && expectedKeywords.length > 0) {
     return expectedKeywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }
  
  return ["Detailed Explanation", "Practical Examples", "Clear Structure"];
}

export default function ResultsDashboardPage() {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionTurn[]>([]);
  const [aiReport, setAiReport] = useState<any>(null);
  const [allViolations, setAllViolations] = useState<string[]>([]);
  const [sessionConfig, setSessionConfig] = useState<any>(null);
  const [interviewType, setInterviewType] = useState<string>("recruiter");
  const [resumeInfo, setResumeInfo] = useState<any>({});

  useEffect(() => {
    document.title = "HireFlow | Results";
    
    const configStr = localStorage.getItem("hireflow_session_config");
    if (configStr) setSessionConfig(JSON.parse(configStr));
    
    setInterviewType(localStorage.getItem("hireflow_interview_mode") || "recruiter");

    const requestFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {}
    };
    requestFullscreen();

    const data: SessionTurn[] = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
    const uniqueData = data.filter((turn, index, self) => self.findIndex(t => t.question === turn.question) === index);
    if (uniqueData.length !== data.length) {
      localStorage.setItem("hireflow_session", JSON.stringify(uniqueData));
    }
    setSessionData(uniqueData);

    const savedResumeData = JSON.parse(localStorage.getItem("hireflow_resume_data") || "{}");
    setResumeInfo(savedResumeData);

    if (uniqueData.length > 0) {
      try {
        const reportStr = localStorage.getItem("hireflow_final_report");
        if (reportStr) {
          setAiReport(JSON.parse(reportStr));
        }
      } catch(e) {}

      const v: string[] = [];
      data.forEach((t) => {
        if (t.violations) v.push(...t.violations);
      });
      setAllViolations(v);
      
      const sessionId = localStorage.getItem("hireflow_session_id") || "";
      const uploadedFlag = `uploaded_${sessionId}`;
      if (sessionId && !sessionStorage.getItem(uploadedFlag)) {
        sessionStorage.setItem(uploadedFlag, "true");
        setTimeout(async () => {
          try {
            const blob = generatePDFReport(data, true) as Blob;
            const formData = new FormData();
            formData.append("file", blob, `HireFlow_Report_${sessionId}.pdf`);
            
            const resumeData = JSON.parse(localStorage.getItem("hireflow_resume_data") || "{}");
            const candidateName = resumeData.name || "Unknown";
            const role = localStorage.getItem("hireflow_target_role") || "General";
            const iType = localStorage.getItem("hireflow_interview_mode") || "Recruiter";
            
            let missingSkills = [];
            try {
              if (resumeData) missingSkills = resumeData.missing_skills || [];
              const rep = JSON.parse(localStorage.getItem("hireflow_final_report") || "{}");
              if (rep && rep.areas_to_improve) {
                missingSkills = rep.areas_to_improve;
              }
            } catch (e) {}

            const durationMinutes = Math.max(1, Math.round((Date.now() - (data[0]?.telemetry?.timestamp || Date.now())) / 60000));

            formData.append("candidate", candidateName);
            formData.append("role", role);
            formData.append("interviewType", iType);
            formData.append("score", (JSON.parse(localStorage.getItem("hireflow_final_report") || "{}").overall_score || 0).toString());
            formData.append("status", "Completed");
            formData.append("sessionId", sessionId);
            formData.append("weakSkills", JSON.stringify(missingSkills));
            formData.append("durationMinutes", durationMinutes.toString());

            await fetch("http://localhost:8000/admin/reports/upload", {
              method: "POST",
              body: formData,
            });
          } catch (e) {
            sessionStorage.removeItem(uploadedFlag);
          }
        }, 1000);
      }
    }
  }, []);

  const handleExitToDashboard = () => {
    navigate("/dashboard");
  };

  const overallScore = aiReport?.overall_score || 0;
  const commScore = aiReport?.communication_avg || 0;
  const confScore = aiReport?.confidence_avg || 0;
  const techScore = aiReport?.answer_quality_avg || 0;
  const keyScore = aiReport?.keyword_match_avg || 0;
  const conceptScore = aiReport?.concept_match_avg || 0;
  const telemetryScore = aiReport?.telemetry_score || 0;
  
  const extractedName = localStorage.getItem("hireflow_candidate_name");
  const candidateName = resumeInfo?.name || extractedName || "Not Available";
  const candidateEmail = resumeInfo?.email || "Not Available";
  const candidatePhone = resumeInfo?.phone || "Not Available";
  const appliedRole = resumeInfo?.applied_role || localStorage.getItem("hireflow_target_role") || "Not Available";
  const experienceYears = resumeInfo?.experience_years || 0;
  const resumeSummary = resumeInfo?.summary || "";
  const resumeSkills = Array.isArray(resumeInfo?.skills) ? resumeInfo.skills : [];

  const strengths = aiReport?.strengths || [];
  const improvements = aiReport?.areas_to_improve || [];
  const evaluations = aiReport?.evaluations || [];
  const questionsMeta = aiReport?.questions || [];
  const totalQuestions = Math.max(sessionData.length, questionsMeta.length, 10);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full font-sans text-zinc-100 selection:bg-teal-500/30">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-3xl font-bold tracking-tight">HireFlow</h1>
          </div>
          <p className="text-zinc-400">Professional Interview Assessment Report</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExitToDashboard} className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]">
            <Home className="w-4 h-4" /> Dashboard
          </button>
          {(!sessionConfig || sessionConfig.reports?.generate_pdf !== false) && (
            <button onClick={() => generatePDFReport(sessionData)} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-teal-400 border border-teal-500/20 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.1)] hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-6 shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <div className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-4">Candidate Profile</div>
          <div className="space-y-3 text-sm text-zinc-300">
            <div><span className="font-semibold text-zinc-100">Name:</span> {candidateName}</div>
            <div><span className="font-semibold text-zinc-100">Email:</span> {candidateEmail}</div>
            <div><span className="font-semibold text-zinc-100">Phone:</span> {candidatePhone}</div>
            <div><span className="font-semibold text-zinc-100">Applied Role:</span> {appliedRole}</div>
            <div><span className="font-semibold text-zinc-100">Experience:</span> {experienceYears ? `${experienceYears} years` : "Not available"}</div>
          </div>
        </div>
        <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-6 shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <div className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-4">Resume Snapshot</div>
          {resumeSummary ? (
            <p className="text-sm text-zinc-300 leading-6">{resumeSummary}</p>
          ) : (
            <p className="text-sm text-zinc-500">No summary extracted from resume.</p>
          )}
          {resumeSkills.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">Key Skills</div>
              <div className="flex flex-wrap gap-2">
                {resumeSkills.slice(0, 8).map((skill: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-200 text-xs font-medium">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {allViolations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400 font-bold"><AlertTriangle className="w-5 h-5" /> Integrity Violations Detected</div>
          <ul className="text-sm text-red-300 list-disc list-inside">{allViolations.map((v, i) => <li key={i}>{v}</li>)}</ul>
        </motion.div>
      )}

      {/* Overall Interview Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <div className="relative w-40 h-40 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle cx="50" cy="50" r="45" fill="none" stroke="#0D9488" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 45} initial={{ strokeDashoffset: 2 * Math.PI * 45 }} animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - overallScore / 100) }} transition={{ duration: 1.5, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-zinc-100">{overallScore || "--"}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Overall Score</h2>
          <div className={`mt-2 px-3 py-1 text-sm font-semibold rounded-full border ${getStatusLabel(overallScore).bg} ${getStatusLabel(overallScore).border} ${getStatusLabel(overallScore).color}`}>
            {getStatusLabel(overallScore).label}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-8 shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-teal-400" /> Overall Interview Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {[ 
              { label: "Technical Knowledge", score: techScore, color: "bg-blue-500" },
              { label: "Communication", score: commScore, color: "bg-teal-500" },
              { label: "Confidence", score: confScore, color: "bg-violet-500" },
              { label: "Keyword Coverage", score: keyScore, color: "bg-emerald-500" },
              { label: "Concept Coverage", score: conceptScore, color: "bg-indigo-500" },
              { label: "Telemetry", score: telemetryScore, color: "bg-amber-500" },
              { label: "Problem Solving", score: Math.round((techScore + conceptScore) / 2), color: "bg-cyan-500" },
              { label: "Professionalism", score: Math.round((commScore + confScore + telemetryScore) / 3), color: "bg-rose-500" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-300">{metric.label}</span>
                  <span className="font-mono text-zinc-400">{metric.score || 0}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${metric.score || 0}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.5 }} className={`h-full rounded-full ${metric.color}`} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2"><Award className="w-5 h-5" /> Strengths</h3>
          <ul className="space-y-3">
            {strengths.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
            {strengths.length === 0 && <li className="text-sm text-zinc-500">No specific strengths identified.</li>}
          </ul>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2"><Target className="w-5 h-5" /> Improvement Areas</h3>
          <ul className="space-y-3">
            {improvements.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                <span>{s}</span>
              </li>
            ))}
            {improvements.length === 0 && <li className="text-sm text-zinc-500">No specific improvements identified.</li>}
          </ul>
        </motion.div>
      </div>

      {/* Question Summary Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl p-8 mb-8 overflow-x-auto">
        <h3 className="text-lg font-bold text-zinc-100 mb-6">Question Summary Table</h3>
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-semibold text-zinc-400">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">Question</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalQuestions }, (_, idx) => {
              const turn = sessionData.find(t => t.question === idx + 1);
              const evalData = turn ? evaluations[idx] || {} : undefined;
              const attempted = !!turn;
              const score = attempted ? Math.round(((evalData?.answer_quality || 0) + (evalData?.concept_match || 0) + (evalData?.keyword_match || 0)) / 3) || 0 : 0;
              const status = attempted ? getStatusLabel(score) : getStatusLabel(0);
              return (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 font-medium text-zinc-200">Question {idx + 1}</td>
                  <td className="px-4 py-4 font-mono">{attempted ? score : 0}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${status.bg} ${status.border} ${status.color}`}>
                      {attempted ? status.label : "Not Attempted"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Question Cards */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-zinc-100 mb-6 border-b border-white/10 pb-4">Detailed Question Analysis</h3>
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const turn = sessionData.find(t => t.question === idx + 1);
          const evalData = turn ? evaluations[idx] || {} : undefined;
          const meta = questionsMeta[idx] || {};
          const metadata = (meta as any).metadata || meta || {};
          const attempted = !!turn;
          
          const score = attempted ? Math.round(((evalData?.answer_quality || 0) + (evalData?.concept_match || 0) + (evalData?.keyword_match || 0)) / 3) || 0 : 0;
          const status = attempted ? getStatusLabel(score) : getStatusLabel(0);
          
          const expectedKeywords = (metadata.expected_keywords || metadata.expectedKeywords || []) as string[];
          const expectedConcepts = (metadata.expected_concepts || metadata.expectedConcepts || []) as string[];
          const idealAnswer =
            metadata.ideal_answer ||
            metadata.idealAnswer ||
            ((metadata.metadata || {}) as any).ideal_answer ||
            ((metadata.metadata || {}) as any).idealAnswer ||
            "";
          
          let coveredWell = attempted
            ? (evalData?.strengths && evalData.strengths.length > 0 ? evalData.strengths : (expectedConcepts.length > 0 ? expectedConcepts : ["Communication", "Confidence"]))
            : ["Not attempted"];
          if (attempted && !evalData?.strengths && evalData?.concept_match < 50) coveredWell = ["Attempted Answer"];
          
          const missingAreas = attempted ? parseMissingConcepts(evalData?.explanation, expectedKeywords, evalData?.keyword_match) : ["Question was not attempted."];
          const expectedStructure = getExpectedStructure(metadata.category || "General", metadata.difficulty === "Hard");
          const aiSuggestion = attempted ? getSuggestion(evalData || {}) : "This question was not attempted. No AI feedback is available.";

          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + idx * 0.1 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(45,212,191,0.05)]">
              {/* Card Header */}
              <div className="bg-white/5 border-b border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-teal-400 text-sm font-semibold mb-2 uppercase tracking-wider">Question {idx + 1}</div>
                  <h4 className="text-lg font-medium text-zinc-100">{meta.question || "Unknown Question"}</h4>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="text-3xl font-bold font-mono text-white mb-1">{score}</div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${status.bg} ${status.border} ${status.color}`}>
                    {status.label}
                  </span>
{evalData?.technical_depth && <span className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-teal-400 bg-teal-400/10 px-2 py-1 rounded">Depth: {evalData.technical_depth}</span>}
                </div>
              </div>
              
              {/* Metadata row */}
              <div className="bg-black/20 px-6 py-3 flex flex-wrap gap-4 text-xs font-medium text-zinc-400 border-b border-white/5">
                {interviewType === "resume-ai" ? (
                  <>
                    {metadata.skill && <span><span className="text-zinc-500">Skill Tested:</span> {metadata.skill}</span>}
                    {metadata.technology && <span><span className="text-zinc-500">Technology:</span> {metadata.technology}</span>}
                    {metadata.resume_section && <span><span className="text-zinc-500">Resume Section:</span> {metadata.resume_section}</span>}
                  </>
                ) : (
                  <>
                    {metadata.category && <span><span className="text-zinc-500">Category:</span> {metadata.category}</span>}
                    {metadata.difficulty && <span><span className="text-zinc-500">Difficulty:</span> {metadata.difficulty}</span>}
                    {expectedKeywords.length > 0 && <span><span className="text-zinc-500">Expected Skills:</span> {expectedKeywords.slice(0, 3).join(", ")}</span>}
                  </>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  <div>
                    <h5 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Covered Well</h5>
                    <div className="flex flex-wrap gap-2">
                      {coveredWell.map((c: string, i: number) => (
                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Missing Areas</h5>
                    <ul className="space-y-2">
                      {missingAreas.map((m: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Expected Answer Structure</h5>
                    <div className="flex flex-wrap gap-2">
                      {expectedStructure.map((s: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm text-zinc-400 bg-white/5 border border-white/10 px-3 py-1 rounded-md">{s}</span>
                          {i < expectedStructure.length - 1 && <span className="text-zinc-600">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {idealAnswer && (
                    <div className="bg-zinc-950/70 border border-zinc-800 p-4 rounded-xl">
                      <h5 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-3">Expected Answer</h5>
                      <p className="text-sm text-zinc-300 leading-6">{idealAnswer}</p>
                    </div>
                  )}

                  <div className="bg-teal-500/10 border border-teal-500/20 p-4 rounded-xl flex gap-3">
                    <Lightbulb className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-teal-400 mb-1">AI Suggestion</h5>
                      <p className="text-sm text-teal-100/70">{aiSuggestion}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Scores */}
                <div className="lg:col-span-1 bg-black/20 p-5 rounded-xl border border-white/5">
                  <h5 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-5 border-b border-white/5 pb-2">Visual Scores</h5>
                  <div className="space-y-5">
                    {[
                      { label: "Answer Quality", score: evalData?.answer_quality || 0, color: "bg-blue-500" },
                      { label: "Keyword Coverage", score: evalData?.keyword_match || 0, color: "bg-emerald-500" },
                      { label: "Concept Coverage", score: evalData?.concept_match || 0, color: "bg-indigo-500" },
                      { label: "Communication", score: evalData?.communication || 0, color: "bg-teal-500" },
                      { label: "Confidence", score: evalData?.confidence || 0, color: "bg-violet-500" },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-zinc-400">{metric.label}</span>
                          <span className="font-mono text-zinc-500">{metric.score}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} whileInView={{ width: `${metric.score}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full rounded-full ${metric.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
