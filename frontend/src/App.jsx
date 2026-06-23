import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Map between URL paths and stage names
const PATH_TO_STAGE = {
  "/": "landing",
  "/setup": "setup",
  "/interview": "interview",
  "/feedback": "done",
};
const STAGE_TO_PATH = {
  landing: "/",
  setup: "/setup",
  interview: "/interview",
  done: "/feedback",
};

const API = "/api";

async function safeJson(r) {
  const text = await r.text();
  if (!text) {
    throw new Error(
      `Empty response from server (HTTP ${r.status}). Is the backend running on port 5174?`
    );
  }
  try { return JSON.parse(text); }
  catch { throw new Error(`Bad response (HTTP ${r.status}): ${text.slice(0, 200)}`); }
}

// Fetch with a timeout — prevents UI from hanging forever on Gemini slowness
async function fetchT(url, opts = {}, timeoutMs = 45000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}
const errMsg = (d, fb) => {
  const combined = [d?.error, d?.detail].filter(Boolean).join(" — ");
  if (/429|quota|rate limit|exceeded.*quota|RESOURCE_EXHAUSTED/i.test(combined)) {
    return "Gemini API rate limit hit. Your free-tier quota is exhausted. Wait ~1 hour, replace the key with a new one from https://aistudio.google.com/app/apikey, or upgrade to paid tier.";
  }
  return combined || fb;
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, _setStage] = useState(() => PATH_TO_STAGE[location.pathname] || "landing");

  // Wrapped setStage that ALSO updates the URL
  const setStage = (newStage) => {
    _setStage(newStage);
    const path = STAGE_TO_PATH[newStage] || "/";
    if (location.pathname !== path) navigate(path);
  };

  // When user hits browser Back/Forward, sync stage to the new URL
  useEffect(() => {
    const newStage = PATH_TO_STAGE[location.pathname];
    if (newStage && newStage !== stage) _setStage(newStage);
    // Unknown URL → bounce to landing (acts as 404 fallback)
    if (!newStage) { navigate("/", { replace: true }); _setStage("landing"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Guard rails: prevent jumping to a stage that doesn't have its prerequisites
  useEffect(() => {
    if (stage === "interview" && !sessionIdRef.current) {
      // Tried to visit /interview directly without an active session → redirect
      _setStage("setup");
      navigate("/setup", { replace: true });
    }
    if (stage === "done" && !messages.length) {
      // Tried to visit /feedback without any interview having happened → redirect
      _setStage("landing");
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  const [inputMode, setInputMode] = useState("upload");
  const [resumeText, setResumeText] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | speaking | listening | submitting
  const [transcript, setTranscript] = useState("");
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef(null);
  const SILENCE_MS = 5000;
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [pendingRecovery, setPendingRecovery] = useState(null);
  const autoRecoveredRef = useRef(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  // v2 fields
  const [experienceLevel, setExperienceLevel] = useState("Fresher");
  const [difficulty, setDifficulty] = useState("Easy");
  const [interviewType, setInterviewType] = useState("Mixed");
  // Live telemetry — Communication & Confidence based on real voice signals; Eye Contact stays 0 (no webcam)
  const [telemetry, setTelemetry] = useState({ communication: 0, confidence: 0, eyeContact: 0 });
  const [elapsed, setElapsed] = useState(0); // seconds
  // Timer
  useEffect(() => {
    if (stage !== "interview") { setElapsed(0); return; }
    const startTs = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - startTs) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [stage]);
  const fmtTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Clear any leftover interview state on mount — refresh during interview = back to setup page
  useEffect(() => {
    localStorage.removeItem("hf_state");
    localStorage.removeItem("hf_session");
  }, []);
  // Whisper recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    () => localStorage.getItem("ai_persona_id") || ""
  );
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);
  const personasRef = useRef([]);
  const selectedPersonaIdRef = useRef(selectedPersonaId);
  const voiceEnabledRef = useRef(voiceEnabled);
  const phaseRef = useRef("idle");
  const sessionIdRef = useRef(null); // synchronous mirror of sessionId for API calls inside closures
  const interviewEndedRef = useRef(false); // when true, all voice/mic/whisper callbacks bail out

  useEffect(() => { personasRef.current = personas; }, [personas]);
  useEffect(() => { selectedPersonaIdRef.current = selectedPersonaId; }, [selectedPersonaId]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Auto-scroll chat to bottom whenever messages change, transcript updates, phase shifts, or loading toggles
  useEffect(() => {
    if (!chatRef.current) return;
    // Use rAF so the DOM has painted the new content before we compute scroll height
    requestAnimationFrame(() => {
      if (chatRef.current) {
        chatRef.current.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, [messages, loading, transcript, phase]);

  // Curated voice personas — each maps to system voices via name patterns (tried in order).
  // First persona whose match exists on this system is included in the dropdown.
  const VOICE_PERSONAS = [
    // 3 female
    { id: "f-aria",   gender: "F", label: "Aria · Warm female",       pitch: 1.05, match: [/aria.*natural/i, /aria/i, /jenny.*natural/i, /jenny/i, /samantha/i] },
    { id: "f-sophia", gender: "F", label: "Sophia · Fluent female",   pitch: 1.15, match: [/sonia.*natural/i, /sonia/i, /libby/i, /google.*us.*english/i] },
    { id: "f-zira",   gender: "F", label: "Zira · Classic female",    pitch: 1.0,  match: [/zira/i, /hazel/i, /susan/i, /karen/i, /moira/i] },
    // 3 male
    { id: "m-guy",    gender: "M", label: "Guy · Warm male",          pitch: 1.0,  match: [/guy.*natural/i, /guy/i, /ryan.*natural/i, /ryan/i, /andrew.*natural/i, /andrew/i] },
    { id: "m-david",  gender: "M", label: "David · Classic male",     pitch: 0.9,  match: [/david/i, /mark/i, /james/i, /george/i, /brian/i, /eric/i] },
    { id: "m-deep",   gender: "M", label: "Marcus · Deep male",       pitch: 0.6,  match: [/davis/i, /tony/i, /alex/i, /daniel/i, /fred/i, /thomas/i] },
  ];

  function resolvePersonas(list) {
    const en = list.filter((x) => x.lang.startsWith("en"));
    const used = new Set();
    const femaleNames = /female|samantha|zira|aria|jenny|libby|sonia|hazel|karen|moira|catherine|veena|fiona|tessa|susan|amy|clara|emma|google.*us.*english|microsoft.*ava|microsoft.*emma|microsoft.*nancy/i;
    const maleNames = /\bmale\b|david|mark|james|george|alex|daniel|fred|tom|thomas|bruce|paul|guy|ryan|andrew|brian|eric|davis|tony|peter|christopher|microsoft.*tony|microsoft.*davis/i;
    const voiceGender = (v) => femaleNames.test(v.name) ? "F" : maleNames.test(v.name) ? "M" : null;

    const resolved = VOICE_PERSONAS.map((p) => {
      let v = null;
      for (const re of p.match) {
        v = en.find((x) => !used.has(x.voiceURI) && re.test(x.name) && voiceGender(x) === p.gender);
        if (v) break;
      }
      if (!v) {
        v = en.find((x) => !used.has(x.voiceURI) && voiceGender(x) === p.gender);
      }
      if (v) used.add(v.voiceURI);
      return v ? { ...p, voice: v } : null;
    }).filter(Boolean);

    // Marcus must have a voice that's genuinely distinct from David (Windows often ignores pitch on built-in voices,
    // so two personas on the same system voice = identical sound). If Marcus matched the SAME voice as David, drop it.
    const david = resolved.find((p) => p.id === "m-david");
    const marcus = resolved.find((p) => p.id === "m-deep");
    if (david && marcus && david.voice.voiceURI === marcus.voice.voiceURI) {
      return resolved.filter((p) => p.id !== "m-deep");
    }

    // Debug: show what each persona got
    console.log("[voices] resolved personas:", resolved.map((p) => `${p.label} → ${p.voice.name}`));
    return resolved;
  }

  function pickDefaultPersona(personas) {
    return personas.find((p) => p.gender === "F") || personas[0];
  }

  // Load TTS voices — getVoices() is async in Chrome and voiceschanged isn't always reliable, so poll as backup
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (!list.length) return false;
      setVoices(list);
      const resolved = resolvePersonas(list);
      setPersonas(resolved);
      personasRef.current = resolved;
      // If saved persona isn't available on this system, fall back to default
      const exists = resolved.some((p) => p.id === selectedPersonaIdRef.current);
      if (!exists) {
        const def = pickDefaultPersona(resolved);
        if (def) {
          selectedPersonaIdRef.current = def.id;
          setSelectedPersonaId(def.id);
        }
      }
      return true;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const iv = setInterval(() => { if (load()) clearInterval(iv); }, 250);
    const stop = setTimeout(() => clearInterval(iv), 6000);
    return () => { clearInterval(iv); clearTimeout(stop); window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (selectedPersonaId) localStorage.setItem("ai_persona_id", selectedPersonaId);
  }, [selectedPersonaId]);

  function speakWithVoice(text, persona, voiceObj, onEnd) {
    // Chrome/Edge SpeechSynthesis bug: first 300-500ms of audio gets clipped after a cancel().
    // Fix: queue an AUDIBLE (very quiet) warm-up utterance first — engine activates during this,
    // then the real text plays with engine already running. Plus extra padding as belt-and-suspenders.
    try {
      const warm = new SpeechSynthesisUtterance("a");
      warm.volume = 0.01; // nearly inaudible but enough to wake the engine
      warm.rate = 5;       // play super fast (~50ms)
      if (voiceObj) { warm.voice = voiceObj; warm.lang = voiceObj.lang; }
      window.speechSynthesis.speak(warm);
    } catch {}
    // Tiny pause prefix to absorb only the first few ms of Chrome clipping (not a full pause)
    const paddedText = ", " + text;
    const u = new SpeechSynthesisUtterance(paddedText);
    u.rate = persona?.gender === "M" && persona?.pitch < 0.8 ? 0.92 : 1.0; // deep voices read a touch slower
    u.pitch = persona?.pitch ?? (persona?.gender === "F" ? 1.1 : 0.95);
    u.volume = 1;
    if (voiceObj) { u.voice = voiceObj; u.lang = voiceObj.lang; }
    let ended = false;
    let poll = null;
    let hardTimer = null;
    let keepAliveRef = null;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (poll) clearInterval(poll);
      if (hardTimer) clearTimeout(hardTimer);
      if (keepAliveRef) clearInterval(keepAliveRef);
      // 200ms buffer to let last word fully play through speakers → total ~600-800ms after AI's last word.
      setTimeout(() => onEnd?.(), 200);
    };
    // Re-enable onend as a fast-path signal. It still goes through finish() which has its own buffer,
    // so even if onend fires a touch early, the 200ms grace covers the audio buffer.
    u.onend = () => {
      // Only honor onend after we've confirmed speech actually started (skip the warm utterance)
      if (started) finish();
    };
    u.onerror = (e) => {
      const err = e.error || "";
      if (err === "interrupted" || err === "canceled") return;
      if (err === "synthesis-failed" && voiceObj) {
        ended = true;
        if (poll) clearInterval(poll);
        if (hardTimer) clearTimeout(hardTimer);
        speakWithVoice(text, persona, null, onEnd);
        return;
      }
      console.warn("[speak] error", err);
      finish();
    };
    window.speechSynthesis.speak(u);
    setTimeout(() => { try { window.speechSynthesis.resume(); } catch {} }, 100);

    // (removed pause/resume keep-alive — it was causing audible glitches mid-sentence)

    // Poll synthesis state. Require multiple consecutive "not speaking" reads + grace delay
    // so the mic never opens while AI is mid-sentence.
    let started = false;
    let speakingStreak = 0;
    let notSpeakingStreak = 0;
    const REQUIRED_START_POLLS = 3;   // 600ms of confirmed speech before "started" (skips the warm-up utterance)
    const REQUIRED_QUIET_POLLS = 2;   // 400ms of confirmed silence — quickest reliable end-detection
    poll = setInterval(() => {
      const active = window.speechSynthesis.speaking || window.speechSynthesis.pending;
      if (active) {
        speakingStreak++;
        if (speakingStreak >= REQUIRED_START_POLLS) started = true;
        notSpeakingStreak = 0;
      } else if (started) {
        notSpeakingStreak++;
        if (notSpeakingStreak >= REQUIRED_QUIET_POLLS) {
          finish();
          clearInterval(poll);
          poll = null;
        }
      }
    }, 200);

    // Absolute hard cap — fires only if synthesis is completely stuck.
    hardTimer = setTimeout(finish, Math.max(10000, text.length * 130 + 8000));
  }

  function speak(text, onEnd) {
    if (interviewEndedRef.current) return; // interview ended — no more speech
    if (!voiceEnabledRef.current || !text || !("speechSynthesis" in window)) { onEnd?.(); return; }
    try { window.speechSynthesis.cancel(); } catch {}
    const list = personasRef.current.length ? personasRef.current : resolvePersonas(window.speechSynthesis.getVoices());
    const persona = list.find((p) => p.id === selectedPersonaIdRef.current) || list[0];
    // Speak IMMEDIATELY — no delay. Voice starts at the same time the chat updates.
    speakWithVoice(text, persona, persona?.voice, onEnd);
  }

  function toggleListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Voice input not supported in this browser. Try Chrome."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setAnswer((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => { setError("Mic error: " + e.error); setListening(false); };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function uploadResume() {
    setError("");
    if (!file) return;
    const fd = new FormData();
    fd.append("resume", file);
    setLoading(true);
    try {
      const r = await fetch(`${API}/resume/parse`, { method: "POST", body: fd });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(errMsg(data, "Upload failed"));
      setResumeText(data.text);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function clearSilenceTimers() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }

  async function ensureMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We only needed the permission, not the stream itself
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      console.error("[mic] getUserMedia failed:", err);
      setError(
        "Microphone access denied or unavailable. " +
        "Click the 🔒/camera icon in Chrome's address bar → set Microphone to Allow → refresh the page."
      );
      return false;
    }
  }

  async function startWhisperRecording(callbacks) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      console.log("[whisper] recording started");

      // Proper VAD with state machine: silent → speaking → silent (fires onSpeechStart / onSpeechEnd)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);

      const SPEECH_THRESHOLD = 12;   // RMS above this = considered speech (tuned higher than ambient)
      const SILENCE_THRESHOLD = 6;    // RMS below this = considered silence
      const SPEECH_FRAMES_TO_START = 3;  // consecutive loud frames before "speaking"
      const SILENCE_FRAMES_TO_END = 30;  // ~500ms of silence (at ~60fps) before "stopped speaking"
      let state = "silent";
      let loudStreak = 0;
      let quietStreak = 0;

      const tick = () => {
        if (!audioStreamRef.current) { audioCtx.close().catch(() => {}); return; }
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = buf[i] - 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);

        callbacks?.onVolume?.(rms);

        if (state === "silent") {
          if (rms > SPEECH_THRESHOLD) {
            loudStreak++;
            if (loudStreak >= SPEECH_FRAMES_TO_START) {
              state = "speaking";
              quietStreak = 0;
              console.log("[vad] speech started, rms:", rms.toFixed(1));
              callbacks?.onSpeechStart?.();
            }
          } else {
            loudStreak = 0;
          }
        } else { // speaking
          if (rms < SILENCE_THRESHOLD) {
            quietStreak++;
            if (quietStreak >= SILENCE_FRAMES_TO_END) {
              state = "silent";
              loudStreak = 0;
              console.log("[vad] speech ended");
              callbacks?.onSpeechEnd?.();
            }
          } else {
            quietStreak = 0;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[whisper] could not start recording:", err);
    }
  }

  function stopWhisperRecording() {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") { resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        resolve(blob);
      };
      mr.stop();
    });
  }

  async function transcribeWithWhisper(blob) {
    if (!blob || blob.size < 1000) return null;
    const fd = new FormData();
    fd.append("audio", blob, "answer.webm");
    const sidForBias = sessionIdRef.current || sessionId;
    if (sidForBias) fd.append("sessionId", sidForBias); // backend uses resume to bias Whisper vocabulary
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s max
    try {
      console.log("[whisper] sending", blob.size, "bytes");
      const r = await fetch(`${API}/transcribe`, { method: "POST", body: fd, signal: controller.signal });
      clearTimeout(timeout);
      const data = await safeJson(r);
      if (!r.ok) {
        console.warn("[whisper] failed:", data);
        return null;
      }
      console.log("[whisper] got:", data.text);
      return data.text;
    } catch (e) {
      clearTimeout(timeout);
      console.warn("[whisper] request error:", e.name === "AbortError" ? "timed out" : e.message);
      return null;
    }
  }

  async function startAutoListening() {
    if (interviewEndedRef.current) return; // interview ended — don't open mic
    console.log("[mic] startAutoListening called");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error("[mic] SpeechRecognition NOT supported in this browser");
      setError("Voice input not supported in this browser. Use Chrome or Edge.");
      setPhase("idle");
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) { setPhase("idle"); return; }
    let hasSpoken = false;
    await startWhisperRecording({
      onVolume: (rms) => setVolumeLevel(Math.min(100, Math.round(rms * 4))),
      onSpeechStart: () => {
        hasSpoken = true;
        clearSilenceTimers(); // user is speaking — cancel any pending submit
        console.log("[vad] cancelling silence timer (user speaking)");
      },
      onSpeechEnd: () => {
        if (alreadySubmitted || !hasSpoken) return;
        console.log("[vad] silence detected — arming 5s submit timer");
        clearSilenceTimers();
        silenceTimerRef.current = setTimeout(submitNow, SILENCE_MS);
      },
    });
    try { recognitionRef.current?.stop(); } catch {}
    finalTranscriptRef.current = "";
    setTranscript("");
    let lastLen = 0;
    let alreadySubmitted = false; // hard-block auto-restart once we've submitted
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US"; // Most reliable model — en-IN often unavailable, causes network errors
    rec.maxAlternatives = 3;
    let networkErrors = 0;

    const submitNow = async () => {
      if (alreadySubmitted) return;
      console.log("[mic] submit triggered");
      clearSilenceTimers();
      const fallbackText = (finalTranscriptRef.current || "").trim();
      if (fallbackText.length < 2 && !mediaRecorderRef.current) {
        console.log("[mic] nothing captured, ignoring submit");
        return;
      }
      alreadySubmitted = true;
      phaseRef.current = "submitting";
      setPhase("submitting");
      finalTranscriptRef.current = "";
      lastLen = 0;
      try { rec.stop(); } catch {}

      // Stop Whisper recording and transcribe (server-side, much more accurate)
      const blob = await stopWhisperRecording();
      let finalText = await transcribeWithWhisper(blob);
      if (!finalText || finalText.length < 2) {
        console.log("[mic] whisper failed/empty, using web speech transcript");
        finalText = fallbackText;
      }
      if (finalText && finalText.length > 1) {
        doSendAnswer(finalText);
      } else {
        setPhase("idle");
      }
    };

    rec.onstart = () => {
      console.log("[mic] recognition STARTED — speak now");
    };
    rec.onaudiostart = () => console.log("[mic] audio capture started");
    rec.onspeechstart = () => console.log("[mic] speech detected");
    rec.onspeechend = () => console.log("[mic] speech ended");

    // Pick the longest alternative — usually more accurate for accented speech
    const pickBest = (result) => {
      let best = result[0].transcript;
      for (let k = 1; k < result.length; k++) {
        if (result[k] && result[k].transcript.length > best.length) best = result[k].transcript;
      }
      return best;
    };

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTranscriptRef.current += " " + pickBest(r);
        else interim += pickBest(r);
      }
      const combined = (finalTranscriptRef.current + " " + interim).trim();
      console.log("[mic] onresult:", JSON.stringify(combined));
      setTranscript(combined);
      if (combined.length > lastLen) {
        lastLen = combined.length;
        clearSilenceTimers();
        silenceTimerRef.current = setTimeout(submitNow, SILENCE_MS);
        console.log(`[mic] silence timer armed for ${SILENCE_MS}ms`);
      }
    };
    rec.onerror = (e) => {
      console.error("[mic] error event:", e.error, e);
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied. Click the 🔒 icon in your browser's address bar and allow microphone access, then refresh.");
        setPhase("idle");
        return;
      }
      if (e.error === "network") {
        networkErrors++;
        // Web Speech can't reach Google — but Whisper recording on MediaRecorder still works!
        // Just disable the live preview and let the user know.
        if (networkErrors >= 3) {
          console.log("[mic] web speech network failing — switching to Whisper-only mode");
          setTranscript("(live preview unavailable — Whisper will transcribe accurately when you click Submit)");
        }
      }
    };
    rec.onend = () => {
      console.log("[mic] recognition ENDED. phase:", phaseRef.current, "silenceTimer:", !!silenceTimerRef.current, "submitted:", alreadySubmitted);
      if (alreadySubmitted) return;
      // Even if Web Speech keeps failing, KEEP listening phase — MediaRecorder is still capturing audio
      if (networkErrors >= 3) {
        console.log("[mic] web speech disabled, but MediaRecorder still recording for Whisper");
        return;
      }
      if (phaseRef.current === "listening" && !silenceTimerRef.current) {
        try { rec.start(); console.log("[mic] auto-restarted"); } catch (err) { console.warn("[mic] restart failed", err); }
      }
    };
    recognitionRef.current = rec;
    setListening(true);
    setPhase("listening");
    try {
      rec.start();
    } catch (err) {
      console.error("[mic] rec.start() threw:", err);
      setError("Could not start microphone: " + err.message);
    }
  }

  function stopListeningManually() {
    clearSilenceTimers();
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }

  function handleAiMessage(text, doneFlag) {
    if (interviewEndedRef.current) return; // interview ended — no more processing
    console.log("[flow] handleAiMessage. doneFlag:", doneFlag, "voiceEnabled:", voiceEnabled);
    if (doneFlag) {
      setStage("done");
      setPhase("idle");
      localStorage.removeItem("hf_state");
      return;
    }
    if (voiceEnabled) {
      setPhase("speaking");
      console.log("[flow] calling speak()");
      let resumed = false;
      const resumeListening = () => {
        if (resumed) return;
        resumed = true;
        console.log("[flow] speak() finished → starting mic");
        startAutoListening();
      };
      speak(text, resumeListening);
      // Safety net: only fires after 2 minutes AND if synthesis is genuinely not speaking
      setTimeout(() => {
        if (resumed || phaseRef.current !== "speaking") return;
        if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
          console.log("[flow] 2min safety check — speech still active, NOT forcing");
          return;
        }
        console.warn("[flow] speak callback didn't fire after 2min and synthesis is idle — forcing mic open");
        resumeListening();
      }, 120000);
    } else {
      console.log("[flow] voice NOT enabled — staying in idle (text mode)");
    }
  }

  async function startInterview() {
    setError("");
    if (!resumeText || resumeText.trim().length < 30) {
      setError("Please provide a resume (upload or paste).");
      return;
    }
    setLoading(true);
    try {
      const r = await fetchT(`${API}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, role, experienceLevel, difficulty, interviewType }),
      });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(errMsg(data, "Failed to start"));
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      setTelemetry({ communication: 0, confidence: 0, eyeContact: 0 });
      interviewEndedRef.current = false;
      localStorage.setItem("hf_session", data.sessionId);
      autoRecoveredRef.current = false;
      setTotalQuestions(data.totalQuestions || 0);
      setMessages([{ role: "ai", text: data.message }]);
      setStage("interview");
      handleAiMessage(data.message, false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function doSendAnswer(text) {
    if (interviewEndedRef.current) return; // interview ended — don't send any more answers
    text = (text || "").trim();
    if (!text) return;
    // HONEST telemetry — only what we can actually measure from voice
    const words = text.split(/\s+/).filter(Boolean).length;
    setTelemetry((t) => {
      // Communication: based on answer substance (word count). 0-20 words = weak, 50+ words = strong.
      // Maps: 5 words → ~30%, 15 words → ~55%, 30 words → ~75%, 50+ words → ~92%
      const commTarget = Math.min(95, Math.max(15, words * 1.7 + 10));
      // Confidence: based on speaking volume (loud + steady = confident). volumeLevel is 0-100 range.
      // Map: vol 5 → ~25%, vol 20 → ~55%, vol 40+ → ~85%
      const confTarget = Math.min(95, Math.max(15, volumeLevel * 1.5 + 20));
      // Eye Contact: ALWAYS 0 — no webcam/face-detection module in this project. Honest answer.
      const eyeTarget = 0;
      return {
        communication: Math.round(t.communication * 0.3 + commTarget * 0.7),
        confidence: Math.round(t.confidence * 0.3 + confTarget * 0.7),
        eyeContact: eyeTarget,
      };
    });
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setAnswer("");
    setTranscript("");
    setListening(false);
    setLoading(true);
    setPhase("submitting");
    try {
      const sid = sessionIdRef.current || sessionId;
      console.log("[send] using sessionId:", sid);
      const r = await fetchT(`${API}/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, answer: text }),
      });
      const data = await safeJson(r);
      if (!r.ok) {
        if (r.status === 404 || /session not found/i.test(data?.error || "")) {
          // Session lost — silently auto-recover. Always try, no manual UI.
          console.log("[session] stale, auto-recovering with text:", text.slice(0, 50));
          setMessages((m) => m.slice(0, -1)); // remove optimistic user message
          await continueWithNewSession(text);
          return;
        }
        setMessages((m) => m.slice(0, -1));
        setAnswer(text);
        throw new Error(errMsg(data, "Failed"));
      }
      setMessages((m) => [...m, { role: "ai", text: data.message }]);
      handleAiMessage(data.message, data.done);
    } catch (e) { setError(e.message); setPhase("idle"); }
    finally { setLoading(false); }
  }

  function resetToSetup(message) {
    clearSilenceTimers();
    try { recognitionRef.current?.stop(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    try { audioStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
    setPendingRecovery(null);
    localStorage.removeItem("hf_session");
    localStorage.removeItem("hf_state");
    setStage("setup");
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setAnswer("");
    setTranscript("");
    setListening(false);
    setPhase("idle");
    setLoading(false);
    setError(message || "");
  }

  // Wrapper for text-mode Send button
  function sendAnswer() {
    if (!answer.trim() || loading) return;
    doSendAnswer(answer);
  }

  // Early end: stop interview, get feedback ONLY for what was answered so far
  async function endInterviewEarly() {
    if (!window.confirm("End the interview now? You'll get feedback only for the questions you've answered.")) return;
    // FIRST: set the kill switch so any in-flight callbacks bail out
    interviewEndedRef.current = true;
    // Stop everything voice-related, hard
    clearSilenceTimers();
    try { recognitionRef.current?.stop(); } catch {}
    try { recognitionRef.current?.abort(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    try { audioStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
    try { window.speechSynthesis.pause(); } catch {}
    recognitionRef.current = null;
    mediaRecorderRef.current = null;
    audioStreamRef.current = null;
    setListening(false);
    setLoading(true);
    setPhase("submitting");
    setError("");
    try {
      const sid = sessionIdRef.current || sessionId;
      const r = await fetchT(`${API}/interview/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(errMsg(data, "Failed to end interview"));
      setMessages((m) => [...m, { role: "ai", text: data.message }]);
      setStage("done");
      setPhase("idle");
      localStorage.removeItem("hf_state");
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }

  // Recover from a stale session: start new session + replay the preserved answer in one go
  async function continueWithNewSession(textOverride) {
    // Guard: if called from an onClick handler, the first arg is an event — ignore it
    const safeOverride = (typeof textOverride === "string") ? textOverride : null;
    const text = (safeOverride || pendingRecovery || answer || "").trim();
    if (!text || !resumeText) {
      console.warn("[recover] no text or resume to recover with", { text: !!text, resumeText: !!resumeText });
      return;
    }
    console.log("[recover] creating new session + replaying:", text.slice(0, 60));
    setLoading(true);
    setError("");
    setPhase("submitting");
    try {
      const r = await fetchT(`${API}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, role }),
      });
      const data = await safeJson(r);
      if (!r.ok) {
        if (/429|quota|rate|exceeded/i.test(JSON.stringify(data))) {
          throw new Error("Gemini API rate limit hit. Your free-tier quota is exhausted. Wait ~1 hour, get a new API key from aistudio.google.com, or upgrade to paid tier.");
        }
        throw new Error(errMsg(data, "Failed to start"));
      }
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      localStorage.setItem("hf_session", data.sessionId);
      const r2 = await fetchT(`${API}/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, answer: text }),
      });
      const d2 = await safeJson(r2);
      if (!r2.ok) {
        if (/429|quota|rate|exceeded/i.test(JSON.stringify(d2))) {
          throw new Error("Gemini API rate limit hit. Wait or use a different key.");
        }
        throw new Error(errMsg(d2, "Replay failed"));
      }
      // Append to existing chat — user just sees their answer + next question, no visible reset
      setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: d2.message }]);
      setAnswer("");
      setPendingRecovery(null);
      setError("");
      handleAiMessage(d2.message, d2.done);
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStage("setup"); setMessages([]); setSessionId(null);
    setAnswer(""); setResumeText(""); setFile(null); setError("");
  }

  return (
    <div className="app">
      {stage !== "landing" && (
        <header className="header">
          <div className="brand">
            <div className="brand-mark">H</div>
            <div className="brand-text">
              <h1>HireFlow</h1>
              <p>AI-Powered Candidate Evaluation</p>
            </div>
          </div>
          <div className="badge"><span className="dot" /> AI-Powered Evaluation Platform</div>
        </header>
      )}

      {stage === "landing" && (
        <div className="landing">
          {/* Top nav */}
          <nav className="land-nav">
            <div className="land-brand">
              <div className="land-logo">🧠</div>
              <div className="land-brand-name">HireFlow</div>
            </div>
            <div className="land-links">
              <a href="#about">About</a>
              <a href="#developers">Developers</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">Contact</a>
            </div>
            <button className="land-signin">Sign In →</button>
          </nav>

          {/* Hero */}
          <div className="land-hero">
            <div className="land-hero-left">
              <div className="land-badge">● Your Personal AI Mock Interview Coach</div>
              <h1 className="land-title">
                Master Your <br />
                <span className="land-title-accent">Next Interview</span><br />
                With AI.
              </h1>
              <p className="land-subtitle">
                Practice with an AI interviewer tailored to your resume.<br />
                Receive detailed insights on your communication,<br />
                confidence, and technical skills.
              </p>
              <div className="land-cta-row">
                <button className="land-cta-primary" onClick={() => setStage("setup")}>
                  Start Practice Session →
                </button>
                <button className="land-cta-secondary" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
                  Learn How It Works
                </button>
              </div>
            </div>

            <div className="land-hero-right">
              <div className="land-demo-card">
                <div className="land-demo-head">
                  <span className="land-live-label">● LIVE MOCK INTERVIEW</span>
                  <span className="land-ready">Interview Ready</span>
                </div>
                <div className="land-msg">
                  <div className="land-avatar">🧠</div>
                  <div className="land-msg-body">
                    <div className="land-msg-name">AI Coach</div>
                    <div className="land-msg-text">"Tell me about a time you had to learn a new technology quickly. What was your approach?"</div>
                  </div>
                </div>
                <div className="land-tele">
                  <div className="land-tele-title">Live Telemetry</div>
                  <div className="land-tele-row">
                    <span>Communication</span><span style={{ color: "#22d3ee" }}>94%</span>
                  </div>
                  <div className="land-tele-bar"><div className="land-tele-fill" style={{ width: "94%" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "setup" && (
        <div className="setup-page">
          <h2>HireFlow</h2>
          <p className="sub">Configure your AI mock interview session.</p>

          {/* CARD 1: Resume Upload */}
          <div className="setup-card">
            <div className="setup-card-title">1. Resume Upload</div>
            <div className={`dropzone-v2 ${file ? "has-file" : ""}`} onClick={() => document.getElementById("hf-file-input")?.click()}>
              <input id="hf-file-input" type="file" accept=".pdf,.docx,.txt,.md" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="icon">☁</div>
              <h3>{file ? file.name : "Drag and drop your resume"}</h3>
              <p>PDF or DOCX up to 10MB</p>
              <button type="button" className="browse-btn" onClick={(e) => { e.stopPropagation(); document.getElementById("hf-file-input")?.click(); }}>Browse Files</button>
            </div>
            {file && (
              <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <button className="btn" onClick={uploadResume} disabled={loading}>
                  {loading ? "Extracting…" : "Extract resume text"}
                </button>
                {resumeText && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ {resumeText.length.toLocaleString()} characters extracted</span>}
              </div>
            )}
          </div>

          {/* CARD 2: Interview Configuration */}
          <div className="setup-card">
            <div className="setup-card-title">2. Interview Configuration</div>
            <div className="config-grid">
              <div className="config-field">
                <label>Target Job Role</label>
                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" />
              </div>
              <div className="config-field">
                <label>Experience Level</label>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                  <option>Fresher</option>
                  <option>0-2 years</option>
                  <option>2-5 years</option>
                  <option>5-10 years</option>
                  <option>10+ years</option>
                </select>
              </div>
              <div className="config-field">
                <label>Interview Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div className="config-field">
                <label>Interview Type</label>
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                  <option>Mixed</option>
                  <option>Technical only</option>
                  <option>Behavioral only</option>
                  <option>System Design focused</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <label className="check" style={{ display: "inline-flex", marginRight: 12 }}>
                <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
                <span style={{ fontSize: 14 }}>Voice mode (AI speaks · you answer by speaking)</span>
              </label>
            </div>

            {voiceEnabled && personas.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="label" style={{ display: "block", marginBottom: 6 }}>AI Voice ({personas.length} available)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="input" value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} style={{ flex: 1 }}>
                    <optgroup label="Female voices">
                      {personas.filter((p) => p.gender === "F").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </optgroup>
                    <optgroup label="Male voices">
                      {personas.filter((p) => p.gender === "M").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </optgroup>
                  </select>
                  <button type="button" className="btn btn-ghost" onClick={() => speak("Hi, I'm your interviewer. This is how I sound.")}>Preview</button>
                </div>
              </div>
            )}
          </div>

          <div className="start-row">
            <button className="start-mock-btn" onClick={startInterview} disabled={loading || !resumeText}>
              {loading ? "Preparing…" : "Start Mock Interview →"}
            </button>
          </div>
          {error && <div className="error" style={{ marginTop: 16 }}>⚠ {error}</div>}
        </div>
      )}
      {false && (
        <div className="card">
          <h2 className="card-title">Let's set up your interview</h2>
          <p className="card-sub">Upload your resume or paste it as text. The AI will tailor every question to you.</p>

          <div className="segmented">
            <button className={inputMode === "upload" ? "active" : ""} onClick={() => setInputMode("upload")}>Upload file</button>
            <button className={inputMode === "paste" ? "active" : ""} onClick={() => setInputMode("paste")}>Paste text</button>
          </div>

          {inputMode === "upload" ? (
            <>
              <label className="label">Resume file</label>
              <div className={`dropzone ${file ? "has-file" : ""}`}>
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="dropzone-icon">↑</div>
                <div className="dropzone-title">{file ? file.name : "Drop your resume here or click to browse"}</div>
                <div className="dropzone-sub">PDF, DOCX, TXT · max 10 MB</div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={uploadResume} disabled={!file || loading}>
                  {loading ? "Extracting…" : "Extract resume text"}
                </button>
                {resumeText && (
                  <span className="ok">✓ Extracted {resumeText.length.toLocaleString()} characters</span>
                )}
              </div>

              {resumeText && (
                <details className="preview">
                  <summary>Preview extracted text</summary>
                  <pre>{resumeText}</pre>
                </details>
              )}
            </>
          ) : (
            <>
              <label className="label">Resume text</label>
              <textarea
                className="textarea"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your full resume here — work experience, projects, skills, education…"
              />
            </>
          )}

          <div className="divider" />

          <label className="label">Target role (optional)</label>
          <input
            type="text"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Developer, Data Scientist, ML Engineer"
          />

          <div style={{ marginTop: 18 }}>
            <label className="check">
              <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
              <div className="check-text">
                Enable voice mode
                <small>AI speaks questions aloud · you can answer by speaking</small>
              </div>
            </label>
          </div>

          {voiceEnabled && (
            <div style={{ marginTop: 14 }}>
              <label className="label">AI voice ({personas.length} available)</label>
              {personas.length === 0 ? (
                <div className="error" style={{ marginTop: 0 }}>
                  No compatible voices installed. Install a voice in Windows Settings → Time & Language → Speech, then refresh.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="input"
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <optgroup label="Female voices">
                        {personas.filter((p) => p.gender === "F").map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Male voices">
                        {personas.filter((p) => p.gender === "M").map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => speak("Hi, I'm your interviewer. This is how I sound. Let's get started.")}
                    >▶ Preview</button>
                  </div>
                  <small style={{ color: "var(--text-dim)", display: "block", marginTop: 8 }}>
                    7 curated voices — 3 female, 4 male. Premium "Natural" voices sound most realistic; install them via Windows Settings → Speech.
                  </small>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <button className="btn" onClick={startInterview} disabled={loading || !resumeText}>
              {loading ? "Preparing your interviewer…" : "Start interview →"}
            </button>
          </div>
          {error && <div className="error">⚠ {error}</div>}
        </div>
      )}

      {stage === "interview" && (
        <>
          <div className="iv-top">
            <div className="iv-brand">
              <div className="land-logo" style={{ width: 40, height: 40, fontSize: 18 }}>🧠</div>
              <div>
                <h1>HireFlow</h1>
                <div className="recording"><span className="recording-dot" /> Session Recording Active · Q {messages.filter(m => m.role === "ai").length}/{totalQuestions || 15}</div>
              </div>
            </div>
            <div className="iv-timer">{fmtTime(elapsed)}</div>
          </div>

          <div className="interview-v2">
            {/* TOP-LEFT: Scrolling chat */}
            <div className="iv-panel iv-panel-chat" style={{ padding: 0 }}>
              <div className="chat" ref={chatRef} style={{ flex: 1, padding: 30, fontSize: 18, overflowY: "auto" }}>
                {messages.map((m, i) => (
                  <div key={i} className={`msg-row ${m.role}`}>
                    {m.role === "ai" && <div className="msg-avatar ai">AI</div>}
                    <div className={`msg ${m.role}`}>{m.text}</div>
                    {m.role === "user" && <div className="msg-avatar user">You</div>}
                  </div>
                ))}
                {phase === "listening" && transcript && (
                  <div className="msg-row user">
                    <div className="msg user msg-pending">{transcript}<span className="cursor-blink" /></div>
                    <div className="msg-avatar user">You</div>
                  </div>
                )}
                {loading && (
                  <div className="msg-row ai">
                    <div className="msg-avatar ai">AI</div>
                    <div className="typing"><span /><span /><span /></div>
                  </div>
                )}
              </div>

              {!voiceEnabled && (
                <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10 }}>
                  <textarea className="textarea" value={answer} onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..." style={{ flex: 1, minHeight: 50 }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }} />
                  <button className="iv-btn primary" onClick={sendAnswer} disabled={loading || !answer.trim()}>Send</button>
                </div>
              )}

              {voiceEnabled && (
                <div className="iv-actions" style={{ padding: 16, margin: 0, borderTop: "1px solid rgba(255,255,255,0.06)", justifyContent: "flex-end" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="iv-btn danger" onClick={() => endInterviewEarly()}>⊘ End Interview</button>
                    <button className="iv-btn primary" disabled={phase !== "listening" || !transcript.trim()} onClick={async () => {
                      clearSilenceTimers();
                      try { recognitionRef.current?.stop(); } catch {}
                      setPhase("submitting");
                      const fallback = (finalTranscriptRef.current || transcript || "").trim();
                      const blob = await stopWhisperRecording();
                      let t = await transcribeWithWhisper(blob);
                      if (!t || t.length < 2) t = fallback;
                      if (t) doSendAnswer(t); else setPhase("idle");
                    }}>Submit ▶</button>
                  </div>
                </div>
              )}

              {error && <div className="error" style={{ margin: 12 }}>⚠ {error}</div>}
            </div>

            {/* BOTTOM-LEFT: Pulsing orb under the chat */}
            <div className="iv-panel iv-panel-pulse">
              <div className={`iv-orb ${phase === "speaking" ? "speaking" : ""} ${phase === "listening" ? "listening" : ""} ${phase === "submitting" ? "thinking" : ""}`} />
              <div className="iv-orb-label" style={{ marginTop: 20 }}>
                {phase === "speaking" && "AI is speaking..."}
                {phase === "listening" && "🎤 Listening — speak now"}
                {phase === "submitting" && "Thinking..."}
                {phase === "idle" && "Ready"}
              </div>
            </div>

            {/* RIGHT: Live telemetry (full-height) */}
            <div className="iv-panel iv-panel-tele">
              <div className="iv-telemetry-title">▸ LIVE TELEMETRY</div>
              <div className="tele-item">
                <div className="tele-head"><span className="tele-label">🎤 Communication</span><span className="tele-pct comm">{telemetry.communication}%</span></div>
                <div className="tele-bar"><div className="tele-fill comm" style={{ width: telemetry.communication + "%" }} /></div>
              </div>
              <div className="tele-item">
                <div className="tele-head"><span className="tele-label">📈 Confidence</span><span className="tele-pct conf">{telemetry.confidence}%</span></div>
                <div className="tele-bar"><div className="tele-fill conf" style={{ width: telemetry.confidence + "%" }} /></div>
              </div>
              <div className="tele-item">
                <div className="tele-head"><span className="tele-label">👁 Eye Contact</span><span className="tele-pct eye" style={{ opacity: 0.5 }}>N/A</span></div>
                <div className="tele-bar"><div className="tele-fill eye" style={{ width: "0%" }} /></div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Camera not enabled in this build</div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "var(--text-dim)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Question</span><strong style={{ color: "#fff" }}>{messages.filter(m => m.role === "ai").length}/{totalQuestions || 15}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Difficulty</span><strong style={{ color: "#fff" }}>{difficulty}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Type</span><strong style={{ color: "#fff" }}>{interviewType}</strong></div>
              </div>
            </div>
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="chat-wrap">
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="avatar-ai">AI</div>
              <div>
                <h3>Interviewer</h3>
                <small>
                  {role ? `${role}` : "Resume-tailored interview"}
                  {(() => {
                    if (!totalQuestions) return null;
                    // Count AI messages as questions asked. Subtract any follow-up messages — keep simple: AI msgs = questions asked
                    const askedCount = messages.filter((m) => m.role === "ai").length;
                    const remaining = Math.max(0, totalQuestions - askedCount);
                    return ` · Q ${askedCount}/${totalQuestions} · ${remaining} left`;
                  })()}
                </small>
              </div>
            </div>
            <div className="badge"><span className="dot" /> {stage === "done" ? "Completed" : "Live"}</div>
          </div>

          <div className="chat" ref={chatRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                {m.role === "ai" && <div className="msg-avatar ai">AI</div>}
                <div className={`msg ${m.role}`}>{m.text}</div>
                {m.role === "user" && <div className="msg-avatar user">You</div>}
              </div>
            ))}
            {/* Live transcript bubble — shown the moment mic opens */}
            {phase === "listening" && (
              <div className="msg-row user">
                <div className={`msg user msg-pending`}>
                  {transcript || <span style={{ opacity: 0.55 }}>🎤 Mic is on — start speaking…</span>}
                  <span className="cursor-blink" />
                </div>
                <div className="msg-avatar user">You</div>
              </div>
            )}
            {loading && (
              <div className="msg-row ai">
                <div className="msg-avatar ai">AI</div>
                <div className="typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {stage === "interview" && voiceEnabled && (
            <div className="voice-console">
              <div className={`voice-orb ${phase}`}>
                <div className="voice-orb-inner" />
                <div className="voice-orb-ring r1" />
                <div className="voice-orb-ring r2" />
                <div className="voice-orb-ring r3" />
              </div>

              <div className="voice-status">
                {phase === "speaking" && <>Interviewer is speaking…</>}
                {phase === "listening" && (transcript ? <>Listening · auto-submits 5s after you stop</> : <>Mic is on — start speaking</>)}
                {phase === "submitting" && <>Thinking…</>}
                {phase === "idle" && (messages.length > 0 ? <>Type your answer below ↓</> : <>Connecting…</>)}
              </div>

              {phase === "listening" && (
                <>
                  {/* Live volume meter — bars that pulse with your voice so you know mic is hearing you */}
                  <div className="vol-meter" aria-label="Microphone level">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="vol-bar"
                        style={{
                          height: `${Math.max(4, Math.min(40, volumeLevel - i * 6))}px`,
                          opacity: volumeLevel > i * 6 ? 1 : 0.25,
                        }}
                      />
                    ))}
                  </div>
                  <div className="voice-transcript">
                    {transcript
                      ? <>{transcript}<span className="cursor-blink" /></>
                      : <span style={{ color: "var(--text-faint)" }}>
                          🎤 {volumeLevel > 10 ? "I can hear you! Your full transcript will appear after a brief pause…" : "Mic is on — start speaking. Auto-submits 5s after you stop."}
                        </span>}
                  </div>
                  <button className="btn" onClick={async () => {
                    clearSilenceTimers();
                    try { recognitionRef.current?.stop(); } catch {}
                    setListening(false);
                    setPhase("submitting");
                    const fallback = (finalTranscriptRef.current || "").trim();
                    const blob = await stopWhisperRecording();
                    let t = await transcribeWithWhisper(blob);
                    if (!t || t.length < 2) t = fallback;
                    if (t) doSendAnswer(t);
                    else { setError("Couldn't capture your answer. Try again or type below."); setPhase("idle"); }
                  }}>✓ Stop & submit (Whisper)</button>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>
                    Speaking is recorded · Whisper transcribes accurately on submit
                  </div>
                </>
              )}

              {phase === "idle" && voiceEnabled && (sessionId || messages.length > 0) && (
                <div style={{ width: "100%", maxWidth: 560, textAlign: "center", marginBottom: 10 }}>
                  <button className="btn" onClick={() => { setError(""); startAutoListening(); }}>
                    🎤 Resume voice mode
                  </button>
                  <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-dim)" }}>
                    Mic paused. Click above to continue with voice, or type below.
                  </div>
                </div>
              )}
              {phase === "idle" && (sessionId || messages.length > 0) && (
                <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea
                    className="textarea"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={sendAnswer} disabled={loading || !answer.trim()}>Send</button>
                    <button className="btn btn-ghost" onClick={() => { setError(""); startAutoListening(); }}>Retry mic</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === "interview" && !voiceEnabled && (
            <div className="input-bar">
              <textarea
                className="textarea"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer… (Shift+Enter for new line)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
                }}
              />
              <button className="btn" onClick={sendAnswer} disabled={loading || !answer.trim()}>Send</button>
            </div>
          )}

          {stage === "done" && (() => {
            const finalFeedback = messages.filter(m => m.role === "ai").slice(-1)[0]?.text || "";
            const userAnswers = messages.filter(m => m.role === "user");
            return (
              <div style={{ padding: 22 }}>
                <div className="done-banner">
                  <h3>✓ Interview complete</h3>
                  <p>Your performance report is ready below.</p>
                </div>

                <div id="print-report" style={{ marginTop: 22, padding: 28, background: "white", color: "#111", borderRadius: 12, fontFamily: "Inter, sans-serif" }}>
                  <div style={{ borderBottom: "2px solid #111", paddingBottom: 16, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>HireFlow · Interview Report</h2>
                    <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                      Role: <strong>{role || "Not specified"}</strong> · Date: {new Date().toLocaleDateString()} · Questions answered: {userAnswers.length}
                    </div>
                  </div>

                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 15 }}>
                    {finalFeedback}
                  </div>

                  <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #ddd", fontSize: 12, color: "#888" }}>
                    Generated by HireFlow · AI-Powered Candidate Evaluation
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button className="btn" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
                  <button className="btn btn-ghost" onClick={reset}>Start a new interview</button>
                </div>
              </div>
            );
          })()}

          {error && (
            <div style={{ padding: "0 22px 16px" }}>
              <div className="error">⚠ {error}</div>
              <div style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => resetToSetup()}>Start new interview</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="footer">HireFlow · Evaluate communication, confidence, and real-world experience — automatically.</div>
    </div>
  );
}
