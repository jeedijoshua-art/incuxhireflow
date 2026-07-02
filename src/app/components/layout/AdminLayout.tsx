import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Database,
  FileText,
  BarChart2,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Question Bank", path: "/admin/questions", icon: Database },
  { label: "Interview Templates", path: "/admin/templates", icon: FileText },
  { label: "Reports", path: "/admin/reports", icon: FileText },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart2 },
  { label: "Live Interviews", path: "/admin/live", icon: Activity },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Basic mock logout
    navigate("/admin");
  };

  return (
    <div className="h-screen w-full bg-transparent text-zinc-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[rgba(8,12,20,0.7)] backdrop-blur-xl border-r border-white/[0.06] flex flex-col shrink-0 relative z-20 shadow-2xl">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/favicon.png"
              alt="HireFlow Logo"
              className="w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(13,148,136,0.3)]"
            />
            <div>
              <div className="text-xl font-bold tracking-tight text-zinc-100">
                HireFlow
              </div>
              <div className="text-[10px] font-semibold text-teal-500 uppercase tracking-widest mt-0.5">
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shrink-0">
                A
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  Admin User
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                  System Admin
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors ml-2 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full relative z-10 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
