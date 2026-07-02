import React, { useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  UploadCloud,
  FileText,
  Brain,
  Video,
  Mic,
  Activity,
  Eye,
  Smile,
  BarChart2,
  CheckCircle,
} from "lucide-react";

// ─── Section Fade-up Wrapper ─────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[80px] flex items-center bg-transparent backdrop-blur-md bg-[rgba(8,12,20,0.65)] border-b border-[rgba(45,212,191,0.08)] shadow-xl">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3.5 group outline-none"
        >
          <img
            src="/favicon.png"
            alt="HireFlow Logo"
            className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(13,148,136,0.3)] transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-zinc-100 font-bold text-2xl tracking-tight transition-colors group-hover:text-teal-400">
            HireFlow
          </span>
        </button>

        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-all duration-150 flex items-center gap-2 shadow-lg shadow-teal-900/30 hover:-translate-y-0.5"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="pt-32 pb-20 flex flex-col items-center justify-center text-center relative z-10 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl"
      >
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 text-sm font-semibold mb-6">
          <Activity className="w-4 h-4" /> The HireFlow Process
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-zinc-100 tracking-tight mb-6 leading-tight">
          See <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">HireFlow</span> in Action
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Discover how our AI analyzes your resume, conducts realistic interviews, and provides actionable telemetry to help you land your dream job.
        </p>
      </motion.div>
    </section>
  );
}

// ─── Section 1: Resume Upload ─────────────────────────────────────────────────

function SectionResumeUpload() {
  return (
    <section className="py-24 relative z-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <FadeUp>
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
              <UploadCloud className="w-7 h-7 text-teal-400" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
              1. Upload Your Resume
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Start by uploading your current resume. Our system accepts PDF and DOCX formats. This sets the foundation for your personalized interview experience.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.2} className="relative">
          <div className="bg-[rgba(10,15,25,0.7)] border border-teal-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center h-80 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-cyan-500/5" />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/30 mb-6"
            >
              <FileText className="w-10 h-10 text-teal-400" />
            </motion.div>
            <div className="text-xl font-semibold text-zinc-100">Drag & Drop Resume</div>
            <div className="text-sm text-zinc-500 mt-2">Supports PDF, DOCX (Max 5MB)</div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Section 2: AI Resume Analysis ────────────────────────────────────────────

function SectionAiAnalysis() {
  return (
    <section className="py-24 relative z-10 bg-zinc-900/30 border-y border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <FadeUp className="order-2 md:order-1 relative">
          <div className="bg-[rgba(10,15,25,0.7)] border border-cyan-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-blue-500/5" />
            {[
              { skill: "React", score: 95 },
              { skill: "TypeScript", score: 90 },
              { skill: "Node.js", score: 85 },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 1, delay: i * 0.2 }}
                className="space-y-2 relative z-10"
              >
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-cyan-300">{item.skill}</span>
                  <span className="text-zinc-500">{item.score}% Match</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.score}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                    className="h-full bg-cyan-500"
                  />
                </div>
              </motion.div>
            ))}
            <div className="pt-6 mt-6 border-t border-white/[0.05] relative z-10">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Generated Topics</div>
              <div className="flex flex-wrap gap-2">
                {["State Management", "Async/Await", "API Design", "System Architecture"].map((topic, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-zinc-800 border border-white/[0.05] text-xs text-zinc-300">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.2} className="order-1 md:order-2 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Brain className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
            2. AI Resume Intelligence
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Our neural network parses your resume to extract key skills, projects, and experiences. It then formulates a highly personalized interview tailored to the specific role you are targeting.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Section 3: AI Interview Experience ───────────────────────────────────────

function SectionInterview() {
  return (
    <section className="py-24 relative z-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <FadeUp className="space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Video className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
            3. Live AI Interview
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Engage in a realistic mock interview. The AI assistant asks dynamic questions, listens to your responses via speech recognition, and adapts the conversation on the fly just like a real recruiter.
          </p>
        </FadeUp>
        <FadeUp delay={0.2} className="relative">
          <div className="bg-[#09090b] border border-white/[0.08] rounded-3xl p-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Main Video Area Mock */}
            <div className="aspect-video bg-zinc-900 rounded-2xl relative overflow-hidden border border-white/[0.04]">
              {/* AI Avatar */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                >
                  <Brain className="w-10 h-10 text-white" />
                </motion.div>
                <div className="mt-4 text-blue-400 font-medium bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 text-sm">
                  AI Interviewer Speaking...
                </div>
              </div>
              {/* Candidate PIP Mock */}
              <div className="absolute bottom-4 right-4 w-32 aspect-[3/4] bg-zinc-800 rounded-xl border-2 border-white/[0.1] flex items-center justify-center overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                  <Smile className="w-5 h-5 text-zinc-500" />
                </div>
              </div>
            </div>
            {/* Subtitles/Input Mock */}
            <div className="mt-4 bg-zinc-900/50 p-4 rounded-xl border border-white/[0.04] flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                <Mic className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-zinc-400 text-sm">
                Listening to your response...
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["4px", "16px", "4px"] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                      className="w-1 bg-red-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Section 4: Live Telemetry ────────────────────────────────────────────────

function SectionTelemetry() {
  const metrics = [
    { icon: <Activity />, label: "Confidence", value: "92%", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: <Eye />, label: "Eye Contact", value: "88%", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: <Smile />, label: "Emotion", value: "Positive", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <section className="py-24 relative z-10 bg-zinc-900/30 border-y border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <FadeUp className="order-2 md:order-1 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.map((metric, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-[rgba(10,15,25,0.7)] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col"
              >
                <div className={`w-10 h-10 rounded-xl ${metric.bg} flex items-center justify-center border border-white/[0.04] mb-4`}>
                  {React.cloneElement(metric.icon as React.ReactElement<{ className?: string }>, { className: `w-5 h-5 ${metric.color}` })}
                </div>
                <div className="text-sm font-medium text-zinc-500 mb-1">{metric.label}</div>
                <div className="text-2xl font-bold text-zinc-100">{metric.value}</div>
              </motion.div>
            ))}
          </div>
        </FadeUp>
        <FadeUp delay={0.2} className="order-1 md:order-2 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Activity className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
            4. Live Telemetry
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            As you speak, our advanced computer vision and audio analysis models monitor your performance in real-time, tracking metrics like confidence, eye contact, and emotional sentiment.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Section 5: Executive Report ──────────────────────────────────────────────

function SectionReport() {
  return (
    <section className="py-24 relative z-10">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <FadeUp className="space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <BarChart2 className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
            5. Executive Report
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Immediately after your session, you receive a comprehensive report. Review your technical accuracy, communication scores, behavioral analysis, and tailored recommendations to crush your actual interview.
          </p>
        </FadeUp>
        <FadeUp delay={0.2} className="relative">
          <div className="bg-[rgba(10,15,25,0.7)] border border-violet-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-purple-500/5" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="text-xl font-bold text-zinc-100">Performance Overview</div>
              <div className="px-3 py-1 bg-violet-500/10 text-violet-400 text-sm font-semibold rounded-full border border-violet-500/20">
                Score: 88/100
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              {[
                { label: "Technical Competence", score: "90", color: "bg-teal-500" },
                { label: "Communication", score: "85", color: "bg-blue-500" },
                { label: "Behavioral", score: "92", color: "bg-violet-500" },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-zinc-300">{item.label}</span>
                    <span className="text-zinc-500">{item.score}/100</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.score}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.05] relative z-10">
              <div className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" /> Key Strengths
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Excellent articulation of technical concepts. Maintained strong eye contact throughout the system architecture discussion.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CtaSection() {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative z-10 border-t border-white/[0.04] bg-zinc-900/30">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <FadeUp>
          <h2 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight mb-6">
            Ready to Practice?
          </h2>
          <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
            Join thousands of candidates who have aced their interviews using HireFlow. Your AI coach is waiting.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto shadow-xl shadow-teal-900/40 hover:-translate-y-1"
          >
            Start Practice Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-transparent py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
          <img
            src="/favicon.png"
            alt="HireFlow Logo"
            className="w-8 h-8 rounded-lg grayscale hover:grayscale-0 transition-all duration-300"
          />
          <div>
            <div className="text-zinc-100 font-bold tracking-tight text-lg">
              HireFlow
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              AI-Powered Interview Platform
            </div>
          </div>
        </div>
        <div className="text-sm text-zinc-600">
          © 2026 HireFlow. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  useEffect(() => {
    document.title = "How It Works | HireFlow";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      <Navigation />
      <main>
        <HeroSection />
        <SectionResumeUpload />
        <SectionAiAnalysis />
        <SectionInterview />
        <SectionTelemetry />
        <SectionReport />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
