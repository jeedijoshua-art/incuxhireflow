import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  ArrowRight,
  ChevronDown,
  Mail,
  MapPin,
  LifeBuoy,
  FileText,
  BarChart2
} from "lucide-react";

const DEVELOPER_PORTFOLIO_URL = "#"; // Placeholder for developer portfolio URL

// Removed local NeuralBackground in favor of global BackgroundProvider

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
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function Navigation({ activeSection }: { activeSection: string }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[80px] flex items-center transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-md bg-[rgba(8,12,20,0.65)] border-b border-[rgba(45,212,191,0.08)] shadow-xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        {/* Logo - Click to return to / */}
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

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-10">
          {[
            { label: "About", id: "#about" },
            { label: "Developers", id: "#developers" },
            { label: "FAQ", id: "#faq" },
            { label: "Contact", id: "#contact" }
          ].map((link) => (
            <a
              key={link.id}
              href={link.id}
              className={`text-sm font-medium transition-colors duration-200 hover:text-teal-400 ${
                activeSection === link.id.substring(1) ? "text-teal-400" : "text-zinc-400"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
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

// ─── Hero: Dashboard Mockup ───────────────────────────────────────────────────

function InteractiveInterviewDemo() {
  const [metricIndex, setMetricIndex] = useState(0);
  const metrics = [
    { label: "Communication", value: 94, color: "bg-teal-500", text: "text-teal-400" },
    { label: "Confidence", value: 88, color: "bg-cyan-500", text: "text-cyan-400" },
    { label: "Eye Contact", value: 96, color: "bg-violet-500", text: "text-violet-400" },
    { label: "Technical Clarity", value: 91, color: "bg-emerald-500", text: "text-emerald-400" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMetricIndex((prev) => (prev + 1) % metrics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [metrics.length]);

  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-6 bg-teal-500/10 rounded-3xl blur-3xl" />
      <div className="absolute -inset-3 bg-violet-500/5 rounded-2xl blur-2xl" />

      <div className="relative bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-2xl p-5 shadow-[0_0_15px_rgba(45,212,191,0.05)] backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              Live Mock Interview
            </span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
            Interview Ready
          </span>
        </div>

        {/* AI Interviewer Avatar & Question */}
        <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/[0.04] mb-5">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] text-teal-400 font-medium mb-1">AI Coach</div>
              <div className="text-sm text-zinc-200 leading-snug">
                "Tell me about a time you had to learn a new technology quickly. What was your approach?"
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-mono text-zinc-400">Live Telemetry</span>
          </div>
          
          <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/[0.04] flex items-center justify-between h-[80px]">
             <motion.div 
               key={metricIndex}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="w-full flex flex-col justify-center gap-2"
             >
               <div className="flex justify-between">
                 <span className="text-xs font-medium text-zinc-300">{metrics[metricIndex].label}</span>
                 <span className={`text-xs font-bold font-mono ${metrics[metricIndex].text}`}>{metrics[metricIndex].value}%</span>
               </div>
               <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden w-full">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${metrics[metricIndex].value}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                   className={`h-full ${metrics[metricIndex].color}`}
                 />
               </div>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();
  return (
    <section
      id="hero"
      className="min-h-screen flex items-center pt-24 pb-20 relative"
    >
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/25 bg-teal-500/8 text-teal-300 text-xs font-mono mb-8"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-400" />
              </span>
              Your Personal AI Mock Interview Coach
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="text-5xl sm:text-6xl xl:text-7xl font-black text-zinc-100 leading-[1.06] tracking-tight mb-6"
            >
              Master Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                Next Interview
              </span>
              <br />
              With AI.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-md"
            >
              Practice with an AI interviewer tailored to your resume. Receive detailed insights on your communication, confidence, and technical skills.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38 }}
              className="flex flex-col sm:flex-row gap-3 mb-12"
            >
              <button 
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 group shadow-lg shadow-teal-900/30"
              >
                Start Practice Session
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
              </button>
              <a 
                href="#about"
                className="px-6 py-3 bg-zinc-900 border border-white/[0.1] hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
              >
                Learn How It Works
              </a>
            </motion.div>
          </div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              duration: 0.85,
              delay: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex justify-center lg:justify-end"
          >
            <InteractiveInterviewDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  const features = [
    {
      icon: <Brain className="w-6 h-6 text-teal-400" />,
      title: "AI Mock Interviews",
      desc: "Experience realistic interview scenarios with an AI that adapts to your responses dynamically.",
    },
    {
      icon: <FileText className="w-6 h-6 text-cyan-400" />,
      title: "Resume Intelligence",
      desc: "Our platform analyzes your resume to generate targeted, role-specific technical and behavioral questions.",
    },
    {
      icon: <BarChart2 className="w-6 h-6 text-violet-400" />,
      title: "Performance Analytics",
      desc: "Receive actionable insights on communication, confidence, eye contact, and technical accuracy.",
    },
  ];

  return (
    <section id="about" className="py-24 relative border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-6">About HireFlow</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              HireFlow is an AI-powered Mock Interview and Resume Intelligence platform designed to help candidates prepare for real-world interviews. Through intelligent AI interview simulations and performance analytics, candidates receive actionable insights to improve interview readiness.
            </p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FadeUp key={idx} delay={0.1 * idx}>
              <motion.div 
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-8 h-full backdrop-blur-md transition-colors hover:bg-zinc-900/80 hover:border-teal-500/30 group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-white/[0.04] mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Developers Section ───────────────────────────────────────────────────────

function DevelopersSection() {
  const team = [
    { name: "Sashi", role: "Project Lead & System Designer" },
    { name: "Sruthi", role: "Database and Data analytics manager" },
    { name: "Joshua", role: "Frontend Developer & Product Designer" },
    { name: "Vishnu", role: "Ai model trainer (face expression and per...)" },
    { name: "Charan", role: "Ai model trainer(resume analyzer)" },
  ];

  return (
    <section id="developers" className="py-24 relative border-t border-white/[0.04] bg-transparent">
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <FadeUp>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">Meet The Developers</h2>
            <p className="text-zinc-400">The team powering the intelligence behind HireFlow.</p>
          </div>
        </FadeUp>

        <div className="flex flex-wrap justify-center gap-6">
          {team.map((member, idx) => (
            <FadeUp key={idx} delay={0.1 * idx} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm">
              <motion.div 
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 backdrop-blur-md flex flex-col items-center text-center h-full hover:border-cyan-500/30 transition-all duration-300 hover:shadow-cyan-500/10"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-white/[0.1] mb-5 overflow-hidden flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-cyan-500/20" />
                  <span className="text-2xl font-bold text-zinc-500">{member.name.charAt(0)}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1">{member.name}</h3>
                <p className="text-sm text-teal-400 font-medium">{member.role}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>

        {/* Developer CTA */}
        <FadeUp delay={0.4}>
          <div className="mt-20 text-center max-w-2xl mx-auto bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-3xl p-8 backdrop-blur-md shadow-[0_0_15px_rgba(45,212,191,0.05)]">
            <h3 className="text-2xl font-bold text-zinc-100 mb-3">Want To Know More About The Developers?</h3>
            <p className="text-zinc-400 mb-8">
              Explore our developer portfolio and learn more about the team behind HireFlow.
            </p>
            <a 
              href={DEVELOPER_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-950 font-bold rounded-xl transition-transform hover:scale-105 duration-200"
            >
              View Developer Portfolio
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is HireFlow?",
      a: "HireFlow is an AI-powered mock interview platform that simulates real-world interview conditions to help you practice, refine your communication, and gain confidence.",
    },
    {
      q: "How does the AI Interview work?",
      a: "Our AI engine analyzes your resume to generate dynamic questions. During the session, it listens to your answers and monitors facial expressions, confidence, and eye contact to provide holistic feedback.",
    },
    {
      q: "Do I need a resume?",
      a: "Yes! Uploading your resume allows the AI to tailor the mock interview exactly to your experience and the specific roles you are targeting.",
    },
    {
      q: "Can I practice multiple interviews?",
      a: "Absolutely. You can run as many mock interviews as you need to perfect your pitch and prepare for different roles.",
    },
    {
      q: "Will I receive performance analytics?",
      a: "Yes, after every interview you will receive a comprehensive dashboard detailing your technical accuracy, communication skills, and behavioral feedback.",
    },
  ];

  return (
    <section id="faq" className="py-24 relative border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto px-6 w-full relative z-10">
        <FadeUp>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">Frequently Asked Questions</h2>
            <p className="text-zinc-400">Everything you need to know about the product.</p>
          </div>
        </FadeUp>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <FadeUp key={idx} delay={0.1 * idx}>
              <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl overflow-hidden backdrop-blur-md transition-colors hover:bg-zinc-900/60">
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                  aria-expanded={openIndex === idx}
                >
                  <span className="text-zinc-100 font-medium pr-4">{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${openIndex === idx ? "rotate-180 text-teal-400" : ""}`} 
                  />
                </button>
                <AnimatePresence>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-zinc-400 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section id="contact" className="py-24 relative border-t border-white/[0.04] bg-transparent">
      <div className="max-w-4xl mx-auto px-6 w-full relative z-10">
        <FadeUp>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">Contact Us</h2>
            <p className="text-zinc-400">Have questions? We'd love to hear from you.</p>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="bg-[rgba(10,15,25,0.72)] border border-[rgba(45,212,191,0.08)] rounded-3xl p-8 md:p-12 backdrop-blur-md shadow-[0_0_15px_rgba(45,212,191,0.05)] flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 w-full md:w-auto">
              <div className="flex items-center gap-4 text-zinc-300">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Email</div>
                  <div className="font-medium">contact@hireflow.ai</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-300">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <LifeBuoy className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Support</div>
                  <div className="font-medium">support@hireflow.ai</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-300">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Location</div>
                  <div className="font-medium">India</div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <button className="w-full md:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl transition-transform hover:scale-105 duration-200 shadow-lg shadow-teal-900/40">
                Get In Touch
              </button>
            </div>
          </div>
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
          <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg grayscale hover:grayscale-0 transition-all duration-300" />
          <div>
            <div className="text-zinc-100 font-bold tracking-tight text-lg">HireFlow</div>
            <div className="text-xs text-zinc-500 mt-0.5">AI-Powered Mock Interview Platform</div>
          </div>
        </div>

        <div className="flex gap-6 text-sm font-medium text-zinc-500">
          {["About", "Developers", "FAQ", "Contact"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-teal-400 transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="text-sm text-zinc-600">
          © 2026 HireFlow. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    document.title = "HireFlow | AI Mock Interview Platform";
  }, []);

  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["hero", "about", "developers", "faq", "contact"];
      const current = sections.find((section) => {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Adjust threshold based on header height to properly detect active section
          return rect.top <= 120 && rect.bottom >= 120;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Call once on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      
      <div className="relative z-10">
        <Navigation activeSection={activeSection} />
        
        <main>
          <HeroSection />
          <AboutSection />
          <DevelopersSection />
          <FaqSection />
          <ContactSection />
        </main>

        <Footer />
      </div>
    </div>
  );
}
