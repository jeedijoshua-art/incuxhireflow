import { useEffect } from "react";
import { useState, DragEvent } from "react";
import { motion } from "motion/react";
import { UploadCloud, File as FileIcon, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserDashboardPage() {
  useEffect(() => {
    document.title = "HireFlow | Dashboard";
  }, []);

  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-2.5 mb-2">
          <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">HireFlow</h1>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">Configure your AI mock interview session.</p>
      </motion.div>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-xl p-6 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">1. Resume Upload</h2>
          {!file ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                isDragging ? "border-teal-500 bg-teal-500/5" : "border-zinc-300 bg-zinc-50 dark:border-white/[0.06] dark:bg-zinc-900/50"
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Drag and drop your resume</h3>
              <p className="text-zinc-500 text-sm mb-4">PDF or DOCX up to 10MB</p>
              
              <input 
                type="file" 
                accept=".pdf,.docx" 
                id="resume-upload" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <label 
                htmlFor="resume-upload"
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 rounded-lg text-sm transition-colors cursor-pointer inline-block"
              >
                Browse Files
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <FileIcon className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{file.name}</div>
                <div className="text-xs text-teal-600 dark:text-teal-400">Ready for analysis</div>
              </div>
              <button onClick={() => setFile(null)} className="text-sm text-zinc-400 hover:text-white">Remove</button>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-zinc-200 dark:border-[rgba(45,212,191,0.08)] rounded-xl p-6 shadow-sm dark:shadow-[0_0_15px_rgba(45,212,191,0.05)]">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">2. Role Selection</h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Target Job Role</label>
              <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Frontend Developer" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.06] rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-end pt-4">
          <button 
            disabled={!file || !targetRole.trim()}
            onClick={() => {
              if (!file) return;
              navigate("/resume-analysis", { state: { file, targetRole } });
            }}
            className="px-8 py-4 bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed hover:bg-teal-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-teal-900/20"
          >
            Analyze Resume
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
