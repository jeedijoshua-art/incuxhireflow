import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Filter, Download, Eye, FileText, CheckCircle, XCircle } from "lucide-react";
import { fetchReports } from "../../utils/adminApi";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await fetchReports();
      setReports(data || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = reports.filter(r => 
    (r.candidate || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.role || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Interview Reports</h1>
          <p className="text-zinc-400">View and download completed candidate interview reports.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(10,15,25,0.72)] border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-lg text-sm font-medium text-zinc-200">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search reports by user or role..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/[0.06] rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
          <div className="text-sm text-zinc-500">
            {filteredReports.length} Reports
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.04] text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="p-4 pl-6">Report ID</th>
                <th className="p-4">Candidate</th>
                <th className="p-4">Role</th>
                <th className="p-4">Interview Type</th>
                <th className="p-4">Date</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-sm">
                    Loading reports...
                  </td>
                </tr>
              ) : filteredReports.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 pl-6 text-sm text-zinc-400 font-mono">
                    #{r.id.substring(0, 8)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-bold">
                        {r.candidate ? r.candidate.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{r.candidate}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-300">
                    {r.role}
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {r.interviewType || 'Unknown'}
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-bold ${r.score >= 80 ? 'text-emerald-400' : r.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.score}/100
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {r.status === 'Completed' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className={`text-sm ${r.status === 'Completed' ? 'text-emerald-400' : 'text-red-400'}`}>{r.status}</span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={() => window.open(`http://localhost:8000/admin/reports/${r.id}/download`, "_blank")}
                      className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-sm font-medium rounded flex items-center gap-2 justify-end ml-auto transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download Report
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredReports.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-sm">
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
