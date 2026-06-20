import { useEffect } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  useEffect(() => {
    document.title = "HireFlow | Admin Login";
  }, []);

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/80 border border-white/[0.08] p-8 rounded-2xl backdrop-blur-xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Admin Portal</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); navigate("/admin/dashboard"); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email address</label>
            <input 
              type="email" 
              required
              className="w-full bg-zinc-950 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50" 
              placeholder="admin@hireflow.ai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-zinc-950 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50" 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full mt-4 py-3.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors duration-150"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}
