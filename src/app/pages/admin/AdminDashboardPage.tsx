import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Activity, CheckCircle, Clock, Database, TrendingUp, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchDashboard, fetchUsers, fetchReports } from "../../utils/adminApi";

export default function AdminDashboardPage() {
  const [statsData, setStatsData] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "HireFlow | Admin Dashboard";
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        fetchDashboard(),
        fetchUsers(),
        fetchReports(),
      ]);
      setStatsData(statsRes);
      // Sort users by joinDate desc and take top 5
      const sortedUsers = (usersRes || []).sort((a: any, b: any) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()).slice(0, 5);
      setRecentUsers(sortedUsers);
      
      // Sort reports by date desc and take top 5
      const sortedReports = (reportsRes || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
      setRecentReports(sortedReports);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: "Total Users", value: statsData?.activeUsers ?? 0, icon: Users, color: "text-teal-400", bg: "bg-teal-500/10", trend: "Live" },
    { label: "Total Interviews", value: statsData?.completedInterviews ?? 0, icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10", trend: "Total" },
    { label: "Average Score", value: statsData?.averageScore ?? 0, icon: Database, color: "text-cyan-400", bg: "bg-cyan-500/10", trend: "Avg" },
    { label: "Active Sessions", value: statsData?.activeInterviews ?? 0, icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "Live" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Dashboard Overview</h1>
        <p className="text-zinc-400">High-level metrics and recent activity for the HireFlow platform.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }} 
            className="p-6 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 tracking-tight mb-1">
              {isLoading ? "..." : stat.value}
            </div>
            <div className="text-sm font-medium text-zinc-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-100">Recent Registrations</h2>
            <Link to="/admin/users" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">View All</Link>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-zinc-500 text-sm text-center py-4">Loading...</div>
            ) : recentUsers.length === 0 ? (
              <div className="text-zinc-500 text-sm flex flex-col items-center justify-center py-8">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                No Data Available
              </div>
            ) : (
              recentUsers.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{user.name || "Unknown User"}</div>
                      <div className="text-xs text-zinc-500">{user.email || "No email provided"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Interviews */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-100">Recent Interviews</h2>
            <Link to="/admin/reports" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">View All</Link>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-zinc-500 text-sm text-center py-4">Loading...</div>
            ) : recentReports.length === 0 ? (
              <div className="text-zinc-500 text-sm flex flex-col items-center justify-center py-8">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                No Data Available
              </div>
            ) : (
              recentReports.map((report, idx) => (
                <div key={idx} className="flex justify-between items-center pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                      <CheckCircle className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{report.role || "General Interview"}</div>
                      <div className="text-xs text-zinc-500">{report.candidate || "Unknown Candidate"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-100">{report.score}/100</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(report.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
