import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, MoreVertical, Filter, Download, AlertCircle } from "lucide-react";
import { fetchUsers } from "../../utils/adminApi";

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await fetchUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">User Management</h1>
          <p className="text-zinc-400">View and manage registered candidates on the platform.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(10,15,25,0.72)] border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-lg text-sm font-medium text-zinc-200">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(10,15,25,0.72)] border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-lg text-sm font-medium text-zinc-200">
            <Download className="w-4 h-4" />
            Export CSV
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
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/[0.06] rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>
          <div className="text-sm text-zinc-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.04] text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Status</th>
                <th className="p-4">Interviews</th>
                <th className="p-4">Interview Status</th>
                <th className="p-4">Last Active</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-white/[0.05]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-white/[0.05]">
                          {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-zinc-200">{user.name || "Unknown"}</div>
                        <div className="text-xs text-zinc-500">{user.email || "No email"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.onlineStatus === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.onlineStatus === 'Online' ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                      {user.onlineStatus || "Offline"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-300 font-medium">
                    {user.totalInterviews || 0}
                  </td>
                  <td className="p-4">
                    {user.interviewStatus === "In Interview" ? (
                      <span className="inline-flex items-center px-2 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded border border-amber-500/20">In Interview</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded border border-blue-500/20">Idle</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {new Date(user.lastLogin || user.joinDate).toLocaleString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                    No users found matching your search.
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
