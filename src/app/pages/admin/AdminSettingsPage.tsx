import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, ShieldAlert, Mic, Monitor, BrainCircuit, Activity } from "lucide-react";
import { fetchHealth, fetchSettings, updateSettings } from "../../utils/adminApi";

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadHealthStatus();
    loadSettings();
  }, []);

  const loadHealthStatus = async () => {
    try {
      const status = await fetchHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error("Failed to load health status:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await updateSettings(config);
      alert("Configuration saved successfully.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save configuration.");
    }
    setIsSaving(false);
  };

  if (!config) return <div className="p-8 text-zinc-400">Loading Configuration...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">Platform Settings & Status</h1>
          <p className="text-zinc-400">Configure global interview rules, AI behavior, and view system health.</p>
        </div>
      </motion.div>

      <div className="space-y-8">
        {/* System Health Status */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-100">System Health</h2>
          </div>
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {healthStatus ? Object.entries(healthStatus).map(([service, status]: [string, any]) => (
                <div key={service} className="p-3 bg-black/20 rounded-lg border border-white/[0.04]">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">{service}</div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'Online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className={`text-sm font-medium ${status === 'Online' ? 'text-zinc-200' : 'text-red-400'}`}>{status}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-4 text-center text-sm text-zinc-500 py-4">Checking system health...</div>
              )}
            </div>
          </div>
        </motion.section>

        {/* General Interview Settings */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-zinc-100">Interview Configuration</h2>
          </div>
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Default Interview Duration (mins)</label>
              <input type="number" value={config.interview.default_duration_minutes} onChange={(e) => setConfig({...config, interview: {...config.interview, default_duration_minutes: parseInt(e.target.value) || 0}})} className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-teal-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Prep Time per Question (secs)</label>
              <input type="number" value={config.interview.prep_time_seconds} onChange={(e) => setConfig({...config, interview: {...config.interview, prep_time_seconds: parseInt(e.target.value) || 0}})} className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-teal-500/50" />
            </div>
          </div>
        </motion.section>

        {/* AI & Speech Settings */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-zinc-100">AI Assistant</h2>
          </div>
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">AI Voice Profile</label>
              <select value={config.ai_assistant.voice_profile} onChange={(e) => setConfig({...config, ai_assistant: {...config.ai_assistant, voice_profile: e.target.value}})} className="w-full bg-[#111] border border-white/[0.06] rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-teal-500/50">
                <option>Professional (Default)</option>
                <option>Friendly</option>
                <option>Strict</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Speech Silence Timeout (secs)</label>
              <input type="number" value={config.ai_assistant.silence_timeout_seconds} onChange={(e) => setConfig({...config, ai_assistant: {...config.ai_assistant, silence_timeout_seconds: parseInt(e.target.value) || 0}})} className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-teal-500/50" />
              <p className="text-xs text-zinc-500 mt-2">Time before the AI assumes the candidate has finished speaking.</p>
            </div>
          </div>
        </motion.section>

        {/* Security & Proctoring */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-zinc-100">Security & Proctoring</h2>
          </div>
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-200 font-medium">Require Fullscreen</div>
                <div className="text-zinc-500 text-sm">Force candidates to remain in fullscreen during the interview.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.security.require_fullscreen} onChange={(e) => setConfig({...config, security: {...config.security, require_fullscreen: e.target.checked}})} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
            <div className="pt-4 border-t border-white/[0.04] grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Maximum Tab Switches (Violations)</label>
                <input type="number" value={config.security.max_tab_switches} onChange={(e) => setConfig({...config, security: {...config.security, max_tab_switches: parseInt(e.target.value) || 0}})} className="w-full bg-black/20 border border-white/[0.06] rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-teal-500/50" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Telemetry */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-100">Telemetry & Tracking</h2>
          </div>
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 space-y-6">
             <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-200 font-medium">Record Audio & Video</div>
                <div className="text-zinc-500 text-sm">Store interview recordings for later review.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.telemetry.enable_audio_recording} onChange={(e) => setConfig({...config, telemetry: {...config.telemetry, enable_audio_recording: e.target.checked}})} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
              <div>
                <div className="text-zinc-200 font-medium">Emotion Tracking</div>
                <div className="text-zinc-500 text-sm">Enable computer vision models to track confidence and emotions.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.telemetry.enable_emotion_detection} onChange={(e) => setConfig({...config, telemetry: {...config.telemetry, enable_emotion_detection: e.target.checked}})} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
              <div>
                <div className="text-zinc-200 font-medium">Generate Transcript</div>
                <div className="text-zinc-500 text-sm">Convert candidate speech to text and include in reports.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.telemetry.enable_transcript} onChange={(e) => setConfig({...config, telemetry: {...config.telemetry, enable_transcript: e.target.checked}})} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
          </div>
        </motion.section>

        {/* Save Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving Configuration..." : "Save Configuration"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// Needed for the first section icon
function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
