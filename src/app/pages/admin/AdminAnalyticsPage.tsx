import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { TrendingUp, Users, Activity, Target, Filter } from "lucide-react";
import { fetchAnalytics } from "../../utils/adminApi";

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [timeframe, setTimeframe] = useState("all");
  const [role, setRole] = useState("all");
  const [interviewType, setInterviewType] = useState("all");

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = { timeframe, role, interviewType };
      const data = await fetchAnalytics(filters);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, role, interviewType]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartData = analytics?.interviewsPerDay || [
    { label: "Mon", value: 0 },
    { label: "Tue", value: 0 },
    { label: "Wed", value: 0 },
    { label: "Thu", value: 0 },
    { label: "Fri", value: 0 },
    { label: "Sat", value: 0 },
    { label: "Sun", value: 0 },
  ];
  
  const maxVal = Math.max(...chartData.map((d: any) => d.value), 10); // Minimum maxVal of 10 to avoid division by zero

  const roleData = analytics?.rolesDistribution || [
    { role: "Frontend Developer", percentage: 0, color: "bg-teal-500" },
    { role: "Backend Engineer", percentage: 0, color: "bg-violet-500" },
    { role: "Product Manager", percentage: 0, color: "bg-emerald-500" },
    { role: "Data Analyst", percentage: 0, color: "bg-cyan-500" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Analytics</h1>
          <p className="text-zinc-400">Deep dive into platform usage, performance metrics, and trends.</p>
        </div>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-lg">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-sm text-zinc-200 outline-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-lg">
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="bg-transparent text-sm text-zinc-200 outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Resume AI">Resume AI</option>
              <option value="Recruiter">Recruiter</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-lg">
            <input
              type="text"
              placeholder="Filter Role..."
              value={role === "all" ? "" : role}
              onChange={(e) => setRole(e.target.value || "all")}
              className="bg-transparent text-sm text-zinc-200 outline-none w-32 placeholder-zinc-500"
            />
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-20 text-zinc-500">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
              <div className="text-zinc-400 text-sm font-medium mb-1">Average Score</div>
              <div className="text-3xl font-bold text-zinc-100 flex items-end gap-2">
                {analytics?.averageScore || 0} <span className="text-emerald-400 text-sm flex items-center mb-1"><TrendingUp className="w-3 h-3 mr-1"/>Avg</span>
              </div>
            </div>
            <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
              <div className="text-zinc-400 text-sm font-medium mb-1">Completion Rate</div>
              <div className="text-3xl font-bold text-zinc-100 flex items-end gap-2">
                {analytics?.completionRate || 0}% <span className="text-emerald-400 text-sm flex items-center mb-1"><TrendingUp className="w-3 h-3 mr-1"/>Total</span>
              </div>
            </div>
            <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
              <div className="text-zinc-400 text-sm font-medium mb-1">Total Registrations</div>
              <div className="text-3xl font-bold text-zinc-100 flex items-end gap-2">
                {analytics?.totalRegistrations || 0} <span className="text-emerald-400 text-sm flex items-center mb-1"><TrendingUp className="w-3 h-3 mr-1"/>Total</span>
              </div>
            </div>
            <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-2xl p-6">
              <div className="text-zinc-400 text-sm font-medium mb-1">Avg. Interview Time</div>
              <div className="text-3xl font-bold text-zinc-100 flex items-end gap-2">
                {analytics?.avgInterviewTime || 0}m <span className="text-teal-400 text-sm flex items-center mb-1"><TrendingUp className="w-3 h-3 mr-1"/>Avg</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interviews Per Day Chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-6">
                Interviews per Day {timeframe === '7d' ? '(Last 7 Days)' : ''}
              </h2>
              <div className="h-64 flex items-end gap-4 justify-between pt-4 border-b border-white/[0.04] pb-2">
                {chartData.map((d: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</div>
                    <div 
                      className="w-full bg-teal-500/20 hover:bg-teal-500/40 border border-teal-500/30 rounded-t-sm transition-all relative overflow-hidden" 
                      style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 top-1/2 bg-gradient-to-t from-teal-500/20 to-transparent"></div>
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">{d.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Roles Distribution */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 flex flex-col">
              <h2 className="text-lg font-bold text-zinc-100 mb-6">Most Selected Roles</h2>
              
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {roleData.map((role: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-zinc-200">{role.role}</span>
                      <span className="text-zinc-500">{role.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${role.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${role.color || 'bg-teal-500'} shadow-[0_0_10px_currentColor]`}
                      />
                    </div>
                  </div>
                ))}
                {roleData.length === 0 && (
                  <div className="text-center text-zinc-500 text-sm py-4">No role data available.</div>
                )}
              </div>
            </motion.div>

            {/* Most Common Weak Skills */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-zinc-100 mb-6">Most Common Weak Skills Identified</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(analytics?.weakSkills || []).map((skill: any, i: number) => (
                  <div key={i} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex flex-col items-center justify-center text-center">
                    <Activity className="w-6 h-6 text-red-400 mb-3" />
                    <div className="text-sm font-medium text-zinc-200 mb-1">{skill.skill}</div>
                    <div className="text-xl font-bold text-red-400">{skill.freq}</div>
                    <div className="text-xs text-zinc-500 mt-1">of candidates</div>
                  </div>
                ))}
                {(!analytics?.weakSkills || analytics.weakSkills.length === 0) && (
                  <div className="col-span-4 text-center text-zinc-500 text-sm py-4">No data available</div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
