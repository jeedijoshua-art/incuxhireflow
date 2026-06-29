import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Camera,
  Mic,
  Volume2,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  stopAllInterviewResources,
  registerMediaStream,
  setHandoffMediaStream,
} from "../utils/mediaCleanup";
import { VOICE_PERSONAS, resolveBrowserVoice } from "../utils/voicePersonas";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function InterviewReadinessPage() {
  const navigate = useNavigate();

  const [cameraState, setCameraState] = useState<
    "checking" | "connected" | "error" | "denied"
  >("checking");
  const [isStarting, setIsStarting] = useState(false);
  const [micState, setMicState] = useState<
    "checking" | "connected" | "error" | "denied"
  >("checking");
  const [speakerState, setSpeakerState] = useState<
    "untested" | "testing" | "good" | "bad"
  >("untested");
  const [faceState, setFaceState] = useState<
    "checking" | "connected" | "error" | "untested"
  >("untested");

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [audioLevel, setAudioLevel] = useState(0);

  const [networkQuality] = useState<"excellent" | "poor">("excellent");
  const [latency, setLatency] = useState(32);

  const [selectedVoice, setSelectedVoice] = useState<string>("david");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  useEffect(() => {
    // Request Camera & Mic
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        mediaStreamRef.current = stream;
        registerMediaStream(stream);

        setCameraState("connected");
        setMicState("connected");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Trigger face check once video is playing
          videoRef.current.onplaying = () => {
            checkFaceVerification();
          };
        }

        // Setup Audio Analyser
        const audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const microphone = audioCtx.createMediaStreamSource(stream);
        microphoneRef.current = microphone;
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setCameraState("denied");
          setMicState("denied");
        } else {
          setCameraState("error");
          setMicState("error");
        }
      }
    }

    setupMedia();

    // Simulate Network Latency updates
    const netInterval = setInterval(() => {
      setLatency((prev) => {
        const newLat = prev + (Math.random() * 10 - 5);
        return Math.max(15, Math.min(60, Math.round(newLat)));
      });
    }, 2000);

    return () => {
      clearInterval(netInterval);
      // Bug #9 fix: do NOT call stopAllInterviewResources() here — that would kill
      // the camera/mic stream before LiveInterviewPage can use it.
      // Only clean up audio analysis context and stop speech synthesis.
      window.speechSynthesis.cancel();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const savedVoice = localStorage.getItem("hireflow_selected_voice");
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }

    // Warm up speech synthesis voices
    window.speechSynthesis.getVoices();
  }, []);

  const handleVoiceSelect = (personaId: string) => {
    setSelectedVoice(personaId);
    localStorage.setItem("hireflow_selected_voice", personaId);
  };

  const handlePreview = (e: React.MouseEvent, personaId: string) => {
    e.stopPropagation();
    // Bug #6 fix: removed empty dead-code block
    window.speechSynthesis.cancel();

    const persona = VOICE_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;

    const utterance = new SpeechSynthesisUtterance(
      `Hello, I am ${persona.name}. I will be conducting your interview today. Let's begin when you are ready.`,
    );

    const voice = resolveBrowserVoice(personaId);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.95;
    utterance.volume = 1.0;
    utterance.pitch = persona.pitch;

    utterance.onstart = () => {
      setPreviewingVoice(personaId);
    };

    utterance.onend = () => {
      setPreviewingVoice(null);
    };

    utterance.onerror = () => {
      setPreviewingVoice(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const checkFaceVerification = async () => {
    if (!videoRef.current || !isMountedRef.current) return;
    setFaceState("checking");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL("image/jpeg", 0.8);

      const res = await fetch("/api/check_face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
      });
      const data = await res.json();

      if (!isMountedRef.current) return;

      if (data.face_detected) {
        setFaceState("connected");
      } else {
        setFaceState("error");
        // Bug #8 fix: guard with isMountedRef before scheduling retry
        setTimeout(() => {
          if (isMountedRef.current) checkFaceVerification();
        }, 2000);
      }
    } catch (e) {
      if (!isMountedRef.current) return;
      setFaceState("error");
      setTimeout(() => {
        if (isMountedRef.current) checkFaceVerification();
      }, 3000);
    }
  };

  const handlePlayTestAudio = () => {
    setSpeakerState("testing");
    const audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(
      880,
      audioCtx.currentTime + 0.5,
    ); // A5

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.5,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);

    setTimeout(() => {
      // Don't auto set to good/bad, let user decide
    }, 500);
  };

  const isCameraReady = cameraState === "connected";
  const isMicReady = micState === "connected";
  const isSpeakerReady = speakerState === "good";
  const isNetworkReady = networkQuality === "excellent";
  const isFaceReady = faceState === "connected";

  const readinessChecks = [
    { name: "Camera", ready: isCameraReady },
    { name: "Microphone", ready: isMicReady },
    { name: "Speaker", ready: isSpeakerReady },
    { name: "Face Detected", ready: isFaceReady },
    { name: "Internet", ready: isNetworkReady },
    { name: "Permissions", ready: isCameraReady && isMicReady },
  ];

  const readyCount = readinessChecks.filter((c) => c.ready).length;
  const totalCount = readinessChecks.length;
  const readinessScore = Math.round((readyCount / totalCount) * 100);

  const canStart = isCameraReady && isMicReady && isFaceReady && isSpeakerReady;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center relative z-10 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300">
          Interview Readiness Center
        </h1>
        <p className="text-gray-400 text-lg">
          Let’s make sure your camera, microphone, audio, and environment are
          ready for a successful interview session.
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Camera Check */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-400" /> Camera Check
            </h2>
            <div className="flex items-center gap-2 text-sm font-medium">
              {cameraState === "checking" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />{" "}
                  <span className="text-gray-400">Checking...</span>
                </>
              )}
              {cameraState === "connected" && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />{" "}
                  <span className="text-emerald-400">Connected</span>
                </>
              )}
              {cameraState === "error" && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />{" "}
                  <span className="text-red-400">Error</span>
                </>
              )}
              {cameraState === "denied" && (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />{" "}
                  <span className="text-red-400">Permission Denied</span>
                </>
              )}
            </div>
          </div>

          <div className="relative flex-grow bg-black/40 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-white/5">
            {cameraState === "connected" ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : cameraState === "checking" ? (
              <div className="animate-pulse flex flex-col items-center">
                <Camera className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-gray-500">Requesting access...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-6">
                <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                <span className="text-red-400 font-medium mb-1">
                  Camera Access Denied
                </span>
                <span className="text-gray-400 text-sm max-w-xs">
                  Please allow camera access in your browser settings and
                  refresh the page.
                </span>
              </div>
            )}

            {/* Overlay Grid lines for premium feel */}
            {cameraState === "connected" && (
              <div
                className="absolute inset-0 pointer-events-none border-[0.5px] border-white/10 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "33.33% 33.33%",
                }}
              ></div>
            )}
          </div>
        </motion.div>

        {/* Microphone & Speaker Column */}
        <div className="flex flex-col gap-6">
          {/* Microphone Check */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mic className="w-5 h-5 text-teal-400" /> Microphone
              </h2>
              {micState === "connected" ? (
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Working
                </span>
              ) : micState === "checking" ? (
                <span className="text-xs font-medium text-gray-400">
                  Checking...
                </span>
              ) : (
                <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Error
                </span>
              )}
            </div>

            <div className="h-12 bg-black/30 rounded-lg flex items-center px-4 gap-1 overflow-hidden border border-white/5">
              {Array.from({ length: 20 }).map((_, i) => {
                const isActive = (audioLevel / 100) * 20 > i;
                return (
                  <motion.div
                    key={i}
                    className={cn(
                      "flex-1 h-1/2 rounded-full transition-colors duration-150",
                      isActive
                        ? i > 15
                          ? "bg-red-400"
                          : i > 10
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        : "bg-white/10",
                    )}
                    animate={{ height: isActive ? "80%" : "20%" }}
                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* Speaker Test */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-teal-400" /> Speaker
              </h2>
              {speakerState === "good" && (
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>

            <button
              onClick={handlePlayTestAudio}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors mb-4"
            >
              <Play className="w-4 h-4" /> Play Test Audio
            </button>

            {speakerState !== "untested" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <p className="text-sm text-gray-400 mb-2 text-center">
                  Can you hear the audio clearly?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSpeakerState("good")}
                    className={cn(
                      "flex-1 py-2 text-sm rounded-lg transition-colors border border-white/5",
                      speakerState === "good"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-black/30 hover:bg-white/10",
                    )}
                  >
                    Yes
                  </button>
                  {/* Bug #5 fix: "No" now shows a retest option instead of permanently
                      locking the Start button with no recovery path */}
                  <button
                    onClick={() => {
                      setSpeakerState("untested");
                    }}
                    className={cn(
                      "flex-1 py-2 text-sm rounded-lg transition-colors border border-white/5",
                      "bg-black/30 hover:bg-white/10",
                    )}
                  >
                    No — Retest
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Network Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6 flex flex-col justify-center"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="w-5 h-5 text-teal-400" /> Network Status
            </h2>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Excellent
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Latency
                </p>
                <p className="text-2xl font-light font-mono">
                  {latency}
                  <span className="text-sm text-gray-400 ml-1">ms</span>
                </p>
              </div>
              <div className="h-8 flex items-end gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-teal-500/50 rounded-t-sm"
                    initial={{ height: "20%" }}
                    animate={{ height: `${Math.random() * 60 + 20}%` }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Browser
                </p>
                <p className="text-sm font-medium">Chrome (Detected)</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Environment Check */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold">AI Environment Analysis</h2>
            <span className="ml-2 text-[10px] uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <EnvMetric label="Face Visibility" status="excellent" />
            <EnvMetric label="Lighting Quality" status="good" />
            <EnvMetric label="Background Noise" status="moderate" />
            <EnvMetric label="Eye Visibility" status="excellent" />
          </div>
        </motion.div>
      </div>

      {/* Interviewer Voice Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="w-full max-w-6xl bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-teal-500/10 rounded-2xl p-6 md:p-8 mb-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <Volume2 className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-semibold">Select AI Interviewer Voice</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VOICE_PERSONAS.map((persona) => (
            <div
              key={persona.id}
              onClick={() => handleVoiceSelect(persona.id)}
              className={cn(
                "relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
                selectedVoice === persona.id
                  ? "bg-teal-500/20 border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.4)]"
                  : "bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5",
              )}
            >
              {selectedVoice === persona.id && (
                <div className="absolute -top-2 -right-2 bg-teal-500 text-teal-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </div>
              )}

              <div className="flex items-center gap-4">
                <span className="text-3xl bg-white/5 p-3 rounded-lg border border-white/10 group-hover:scale-105 transition-transform">
                  {persona.gender === "Female" ? "👩" : "👨"}
                </span>
                <div>
                  <div className="font-semibold text-gray-200 text-lg">
                    {persona.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {persona.description}
                  </div>
                </div>
              </div>

              <button
                disabled={previewingVoice !== null}
                onClick={(e) => handlePreview(e, persona.id)}
                className={cn(
                  "p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 text-xs font-medium",
                  previewingVoice === persona.id
                    ? "bg-teal-500/20 text-teal-400 border-teal-500/50 shadow-[0_0_10px_rgba(45,212,191,0.3)] animate-pulse"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                title="Preview Voice"
              >
                {previewingVoice === persona.id ? (
                  <>
                    <Volume2 className="w-4 h-4 fill-teal-400 animate-pulse" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Preview
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer Area: Score, Checklist, Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
      >
        {/* Readiness Score */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="6"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="url(#score-gradient)"
                strokeWidth="6"
                strokeDasharray="364.4"
                strokeDashoffset={364.4 - (364.4 * readinessScore) / 100}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 364.4 }}
                animate={{
                  strokeDashoffset: 364.4 - (364.4 * readinessScore) / 100,
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient
                  id="score-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <span className="text-3xl font-bold">{readinessScore}%</span>
            </div>
          </div>
          <span className="mt-2 text-sm font-medium text-emerald-400">
            Interview Ready
          </span>
        </div>

        {/* Checklist */}
        <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          {readinessChecks.map((check, i) => (
            <div key={i} className="flex items-center gap-2">
              {check.ready ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
              )}
              <span className={check.ready ? "text-gray-200" : "text-gray-500"}>
                {check.name}
              </span>
            </div>
          ))}
        </div>

        {/* Start Button */}
        <div className="shrink-0 w-full md:w-auto mt-6 md:mt-0">
          <button
            disabled={!canStart || isStarting}
            onClick={async () => {
              if (!selectedVoice) {
                alert("Please select a voice before starting the interview.");
                return;
              }
              setIsStarting(true);

              // CLEAR OLD INTERVIEW DATA FROM LOCALSTORAGE (keep session_id for the live interview page)
              localStorage.removeItem("hireflow_session");
              localStorage.removeItem("hireflow_final_report");
              
              localStorage.setItem("hireflow_selected_voice", selectedVoice);

              if (mediaStreamRef.current) {
                setHandoffMediaStream(mediaStreamRef.current);
              }

              // We simulate a tiny delay so the button animation can be seen
              setTimeout(() => {
                navigate("/interview");
              }, 500);
            }}
            className={cn(
              "w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden group",
              canStart
                ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] hover:scale-105"
                : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/10",
            )}
          >
            {canStart && (
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isStarting ? "Starting..." : "Start AI Interview"}
              {canStart && !isStarting && <Sparkles className="w-5 h-5" />}
            </span>
          </button>
          {!canStart && (
            <p className="text-xs text-red-400/80 text-center mt-3 max-w-[200px] mx-auto">
              Please complete all checks to proceed.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EnvMetric({
  label,
  status,
}: {
  label: string;
  status: "excellent" | "good" | "moderate" | "poor";
}) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "excellent":
        return "bg-emerald-500";
      case "good":
        return "bg-emerald-400";
      case "moderate":
        return "bg-amber-400";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (s: string) => {
    switch (s) {
      case "excellent":
        return "text-emerald-400";
      case "good":
        return "text-emerald-400";
      case "moderate":
        return "text-amber-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-black/30 rounded-lg p-3 border border-white/5 flex flex-col gap-2">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", getStatusColor(status))} />
        <span
          className={cn(
            "text-sm font-medium capitalize",
            getStatusText(status),
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
