import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Zap } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
];

export default function AppLayout() {
  return (
    <div className="h-screen w-full bg-transparent text-zinc-900 dark:text-zinc-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-[rgba(45,212,191,0.08)] bg-white/50 dark:bg-[rgba(8,12,20,0.55)] backdrop-blur-md flex flex-col z-20">
        <div className="p-6 flex items-center gap-2.5">
          <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold tracking-tight">
            HireFlow
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.03]"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              U
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Alex Rivera</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500">Free Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative bg-transparent">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-600/[0.03] blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[100px]" />
        </div>
        <div className="relative z-10 min-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
