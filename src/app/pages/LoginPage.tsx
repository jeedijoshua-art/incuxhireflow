import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";

const BackgroundParticles = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#09090B]">
      {/* Neural Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="login-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-grid)" />
      </svg>

      {/* Subtle Glows */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-[#0D9488]/10 blur-[120px]"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute top-[60%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[#8B5CF6]/5 blur-[100px]"
      />

      {/* Floating Particles (Data Nodes) */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#06B6D4] rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: Math.random() * 0.5 + 0.1,
          }}
          animate={{
            y: [null, Math.random() * -200],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function LoginPage() {
  useEffect(() => {
    document.title = "HireFlow | Login";
  }, []);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"candidate" | "admin">(
    "candidate",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleLogin = (path: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate(path);
    }, 1200);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const userInfo = await fetch(
          "https://www.googleapis.com/oauth2/v1/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        ).then((res) => res.json());

        login({
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
        });

        navigate("/dashboard");
      } catch (error) {
        console.error("Failed to fetch user info", error);
        alert("Authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error("Login Failed", errorResponse);
      alert("Login cancelled or failed.");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative text-[#FAFAFA]">
      <BackgroundParticles />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#27272A]/40 border border-white/[0.08] p-6 sm:p-8 rounded-3xl backdrop-blur-2xl relative z-10 shadow-[0_0_40px_rgba(13,148,136,0.1)]"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/favicon.png"
            alt="HireFlow Logo"
            className="w-12 h-12 mb-5 rounded-xl shadow-[0_0_15px_rgba(13,148,136,0.3)] mx-auto"
          />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
            Choose Your Access
          </h1>
          <p className="text-[#A1A1AA] text-sm">
            Continue as a Candidate or Administrator
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-[#09090B]/50 border border-white/[0.05] rounded-xl mb-8 relative">
          {(["candidate", "admin"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${
                activeTab === tab
                  ? "text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              {tab === "candidate" ? "Candidate" : "Admin"}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#27272A] border border-white/[0.08] rounded-lg -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[260px]">
          <AnimatePresence mode="wait">
            {activeTab === "candidate" ? (
              <motion.div
                key="candidate"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-lg font-semibold mb-2">Candidate Access</h2>
                <p className="text-sm text-[#A1A1AA] mb-8 leading-relaxed">
                  Practice interviews with AI and receive detailed performance
                  insights.
                </p>

                <div className="mt-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGoogleLogin()}
                    disabled={isLoading}
                    className="w-full py-4 px-4 bg-gradient-to-r from-[#0D9488] to-[#06B6D4] hover:from-[#0f766e] hover:to-[#0891b2] text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(13,148,136,0.3)] disabled:opacity-70"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 bg-white rounded-full p-0.5"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-lg font-semibold mb-2">
                  Administrator Access
                </h2>
                <p className="text-sm text-[#A1A1AA] mb-6">
                  Manage interviews, analytics and candidate evaluations.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin("/admin/dashboard");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <input
                      type="email"
                      required
                      className="w-full bg-[#09090B]/50 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full bg-[#09090B]/50 border border-white/[0.08] rounded-xl pl-4 pr-11 py-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] transition-all"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-white/[0.1] bg-[#09090B] text-[#0D9488] focus:ring-[#0D9488]/50 focus:ring-offset-0"
                      />
                      <span className="text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">
                        Remember me
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-[#0D9488] hover:text-[#06B6D4] transition-colors font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    type="submit"
                    className="w-full mt-2 py-3.5 px-4 bg-[#27272A] border border-white/[0.1] hover:bg-[#3F3F46] text-[#FAFAFA] font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Login as Admin"
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
