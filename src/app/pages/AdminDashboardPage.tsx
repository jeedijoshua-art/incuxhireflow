import { useEffect } from "react";
import { motion } from "motion/react";
import { Users, Activity, CheckCircle, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardPage() {
  useEffect(() => {
    document.title = "HireFlow | Admin Dashboard";
  }, []);

  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-6xl mx-auto w-full min-h-screen bg-transparent text-zinc-100">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">HireFlow</h1>
          </div>
          <p className="text-zinc-400">System overview and analytics.</p>
        </div>
        <button onClick={() => navigate("/")} className="px-4 py-2 border border-white/[0.06] rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">
          Logout
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Users", value: "2,543", icon: Users, color: "text-teal-400" },
          { label: "Total Interviews", value: "14,021", icon: Activity, color: "text-violet-400" },
          { label: "Average Score", value: "76/100", icon: CheckCircle, color: "text-cyan-400" },
          { label: "Active Sessions", value: "32", icon: Clock, color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-5 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-xl text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-zinc-400">{stat.label}</div>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Recent Users</h2>
          <div className="space-y-4">
            {["Alex Rivera", "Sarah Chen", "Michael Scott"].map((user, idx) => (
              <div key={idx} className="flex justify-between items-center pb-4 border-b border-white/[0.06] last:border-0 last:pb-0">
                <div className="text-sm font-medium text-zinc-200">{user}</div>
                <div className="text-xs text-zinc-500">Joined today</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Recent Interviews</h2>
          <div className="space-y-4">
            {["Frontend Developer - 89/100", "Product Manager - 92/100", "Data Analyst - 74/100"].map((interview, idx) => (
              <div key={idx} className="flex justify-between items-center pb-4 border-b border-white/[0.06] last:border-0 last:pb-0">
                <div className="text-sm font-medium text-zinc-200">{interview}</div>
                <div className="text-xs text-zinc-500">Completed 2h ago</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
