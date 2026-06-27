import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import AIAvatar from "../components/interview/AIAvatar";
import CandidateCamera from "../components/interview/CandidateCamera";
import { useNavigate } from "react-router-dom";
import { PhoneOff, ArrowRight, Activity, Eye, Mic, Zap, Smile, AlertTriangle } from "lucide-react";
import { stopAllInterviewResources, registerInterval } from "../utils/mediaCleanup";
import { VOICE_PERSONAS, resolveBrowserVoice } from "../utils/voicePersonas";

interface TelemetryData {
  timestamp: number;
  faceDetected: boolean;
  emotion: string;
  confidence: number;
  attention: number;
  eyeContact: number;
}

export default function LiveInterviewPage() {
  const navigate = useNavigate();
  const [interviewState, setInterviewState] = useState<"listening" | "thinking" | "speaking">("speaking");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: 0,
    faceDetected: false,
    emotion: "Neutral",
    confidence: 0,
    attention: 0,
    eyeContact: 0
  });

  const [violations, setViolations] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isEndingInterviewRef = useRef(false);
  
  const [transcript, setTranscript] = useState("");
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("Ready to capture your answer");
  
  // Speech Recognition State
  const recognitionRef = useRef<any>(null);
  const recognitionTimeoutRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const interimTranscriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const telemetryIntervalRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<string>("");
  const hasFetchedInitialQuestion = useRef(false);

  const cleanupRecognition = (recognition: any) => {
    if (!recognition) return;
    try {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onstart = null;
    } catch (e) {
      console.warn("[RECOGNITION_CLEANUP_FAILED]", e);
    }
    if ((window as any).__activeSpeechRecognitions) {
      (window as any).__activeSpeechRecognitions.delete(recognition);
    }
  };

  // Auto-scroll textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        if (e.key === "Escape") {
          e.preventDefault();
          document.getElementById("clear-btn")?.click();
          document.getElementById("stop-record-btn")?.click();
        }
        return;
      }
      
      if (e.code === "Space") {
        e.preventDefault();
        if (isRecordingRef.current) {
          document.getElementById("stop-record-btn")?.click();
        } else {
          document.getElementById("start-record-btn")?.click();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        document.getElementById("clear-btn")?.click();
        document.getElementById("stop-record-btn")?.click();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handleFullscreenChange = () => {
    if (isEndingInterviewRef.current) return;
    if (!document.fullscreenElement) {
      console.log("[FULLSCREEN_EXIT]");
      setViolations(prev => [...prev, `Exited fullscreen at ${new Date().toLocaleTimeString()}`]);
      
      setWarningCount(prev => {
        const newCount = prev + 1;
        console.log(`[WARNING_COUNT] ${newCount}`);
        if (newCount >= 3) {
          console.log("[INTERVIEW_TERMINATED]");
          handleEndInterview();
        } else {
          setShowFullscreenModal(true);
        }
        return newCount;
      });
    }
  };

  const handleVisibilityChange = () => {
    if (isEndingInterviewRef.current) return;
    if (document.hidden) {
      setViolations(prev => [...prev, `Tab hidden/switched at ${new Date().toLocaleTimeString()}`]);
    }
  };

  const handleBlur = () => {
    if (isEndingInterviewRef.current) return;
    setViolations(prev => [...prev, `Window lost focus at ${new Date().toLocaleTimeString()}`]);
  };

  // Fetch Next Question Helper
  const fetchNextQuestion = async (sessionId: string) => {
    setIsProcessing(true);
    setInterviewState("thinking");
    try {
      const payload = { session_id: sessionId };
      console.log(`[NEXT_QUESTION] Requesting next question. Current index: ${questionIndex}`);
      console.log("[DEBUG] Fetch Next Question Request URL: /interview/next-question");
      console.log("[DEBUG] Fetch Next Question Payload:", payload);
      
      const res = await fetch("/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log("[DEBUG] Fetch Next Question Response Status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("[DEBUG] Fetch Next Question Error Body:", errText);
        throw new Error("Failed");
      }
      
      const data = await res.json();
      console.log("[DEBUG] Fetch Next Question Response Body:", data);
      
      if (data.status === "complete") {
        console.log("[DEBUG] Final Report Received:", data.report);
        handleEndInterview(data.report);
        return;
      }
      
      // Use backend index if provided (backend is 0-indexed), otherwise increment
      if (data.index !== undefined) {
        setQuestionIndex(data.index + 1);
      } else {
        setQuestionIndex(prev => prev + 1);
      }
      
      setCurrentQuestion(data.question);
      setInterviewState("speaking");
      speakQuestion(data.question);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch next question");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakQuestion = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    const personaId = localStorage.getItem("hireflow_selected_voice") || "david";
    console.log(`[VOICE_SELECTED] ${personaId}`);
    console.log(`[VOICE_LOADED] ${personaId}`);
    
    const voice = resolveBrowserVoice(personaId);
    if (voice) {
      utterance.voice = voice;
      console.log(`[VOICE_RESOLVED] ${voice.name}`);
    } else {
      console.log(`[VOICE_RESOLVED] Default`);
    }

    const persona = VOICE_PERSONAS.find(p => p.id === personaId);
    utterance.rate = 0.95;
    utterance.volume = 1.0;
    if (persona) {
      utterance.pitch = persona.pitch;
    }

    console.log(`[SPEAKING_QUESTION] ${text}`);
    
    utterance.onstart = () => {
      console.log("[TTS_START]");
      console.log("[MIC_LOCKED]");
      setIsAiSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log("[TTS_END]");
      console.log("[MIC_UNLOCKED]");
      setIsAiSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.log("[TTS_END] via Error");
      console.error("Error speaking", e);
      console.log("[MIC_UNLOCKED]");
      setIsAiSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    document.title = "HireFlow | Mock Interview";
    
    const personaId = localStorage.getItem("hireflow_selected_voice") || "david";
    console.log(`[VOICE_PERSONAS_LOADED] ${VOICE_PERSONAS.length} personas loaded.`);
    console.log(`[VOICE_SELECTED] ${personaId}`);
    
    // Ensure voices are loaded into memory early
    window.speechSynthesis.getVoices();

    const sessionId = localStorage.getItem("hireflow_session_id");
    if (!sessionId) {
      alert("No active session found. Redirecting to dashboard.");
      navigate("/dashboard");
      return;
    }
    
    // Phase 2: Request Fullscreen on mount
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen request failed", err);
      }
    };
    requestFullscreen();

    // Setup Telemetry Polling (Phase 10) instead of WebSocket
    telemetryIntervalRef.current = window.setInterval(() => {
       // Frame capture is triggered via onFrameCaptured from CandidateCamera
    }, 2000);

    // Timer
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    registerInterval(timer as unknown as number);

    // Violation Tracking
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Fetch First Question (Prevent double fetch in Strict Mode)
    if (!hasFetchedInitialQuestion.current) {
      hasFetchedInitialQuestion.current = true;
      console.log("[INTERVIEW_START] Initializing interview for session:", sessionId);
      fetchNextQuestion(sessionId);
    }
    
    return () => {
      clearInterval(timer);
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.speechSynthesis.cancel();
      
      if (recognitionRef.current) {
        console.log("[RECOGNITION_STOPPED]");
        try { recognitionRef.current.stop(); } catch(e){}
        console.log("[RECOGNITION_ABORTED]");
        try { recognitionRef.current.abort(); } catch(e){}
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        console.log("[RECOGNITION_DESTROYED]");
        recognitionRef.current = null;
      }
      isRecordingRef.current = false;
      
      stopAllInterviewResources();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const normalizeTranscriptText = (value: string) => {
    return value
      .replace(/\s+/g, " ")
      .replace(/\s([,.;:!?])/g, "$1")
      .trim();
  };

  const correctSpokenText = (value: string) => {
    return value
      .replace(/\bteh\b/gi, "the")
      .replace(/\bthier\b/gi, "their")
      .replace(/\bthier\b/gi, "their")
      .replace(/\brecieve\b/gi, "receive")
      .replace(/\bseperate\b/gi, "separate")
      .replace(/\boccured\b/gi, "occurred")
      .replace(/\bdefinately\b/gi, "definitely")
      .replace(/\benviroment\b/gi, "environment")
      .replace(/\bcommited\b/gi, "committed")
      .replace(/\bimprovment\b/gi, "improvement")
      .replace(/\bbecuase\b/gi, "because")
      .replace(/\bgoverment\b/gi, "government")
      .replace(/\bwierd\b/gi, "weird")
      .replace(/\bintial\b/gi, "initial")
      .replace(/\bwich\b/gi, "which")
      .replace(/\bwht\b/gi, "what")
      .replace(/\btaht\b/gi, "that")
      .replace(/\bim\b/gi, "I")
      .replace(/\bi\b/g, (match, offset) => (offset === 0 ? "I" : match));
  };

  const updateTranscript = (value: string) => {
    const normalized = normalizeTranscriptText(value);
    transcriptRef.current = normalized;
    setTranscript(normalized);
  };

  const appendTranscriptChunk = (chunk: string) => {
    const cleaned = correctSpokenText(normalizeTranscriptText(chunk));
    if (!cleaned) return;

    const base = finalTranscriptRef.current.trim();
    const nextValue = base ? `${base} ${cleaned}` : cleaned;
    finalTranscriptRef.current = nextValue;
    updateTranscript(nextValue);
  };

  const persistSessionTurn = (turnTranscript: string) => {
    const cleanTranscript = turnTranscript.trim();
    if (!cleanTranscript) return;

    try {
      const existing = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
      const sessionData = Array.isArray(existing) ? existing : [];
      sessionData.push({
        question: questionIndex,
        transcript: cleanTranscript,
        telemetry,
        violations,
      });
      localStorage.setItem("hireflow_session", JSON.stringify(sessionData));
    } catch (error) {
      console.error("[SESSION_PERSIST_ERROR]", error);
    }
  };

  const handleNextQuestion = async () => {
    const answerText = transcriptRef.current.trim();
    if (!answerText) return;
    const sessionId = localStorage.getItem("hireflow_session_id");
    if (!sessionId) return;
    
    setIsProcessing(true);
    window.speechSynthesis.cancel();
    
    console.log("[SUBMIT_CLEANUP] Stopping recognition before next question");
    if (recognitionRef.current) {
      console.log("[RECOGNITION_STOPPED]");
      try { recognitionRef.current.stop(); } catch(e){}
      console.log("[RECOGNITION_STOP_PENDING]");
    }
    isRecordingRef.current = false;
    setInterviewState("thinking");
    console.log("[NEXT_QUESTION_READY]");
    
    try {
      const payload = { session_id: sessionId, answer: answerText };
      console.log("[SUBMIT_ANSWER]");
      console.log("[DEBUG] Submit Answer Request URL: /interview/text-answer");
      console.log("[DEBUG] Submit Answer Payload:", payload);
      
      // 1. Submit the text answer
      const res = await fetch("/interview/text-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log("[DEBUG] Submit Answer Response Status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("[DEBUG] Submit Answer Error Body:", errText);
        throw new Error("Failed");
      }
      
      const data = await res.json();
      console.log("[DEBUG] Submit Answer Response Body:", data);
      
      if (data.status === "complete") {
        console.log("[DEBUG] Final Report Received from answer:", data.report);
        handleEndInterview(data.report);
        return;
      }
      
      persistSessionTurn(answerText);
      updateTranscript("");
      
      // 2. Fetch the next question
      await fetchNextQuestion(sessionId);
    } catch (e) {
      console.error(e);
      alert("Failed to submit answer");
      setIsProcessing(false);
    }
  };

  const onStartRecording = async () => {
    if (isAiSpeaking) {
      console.log("[BLOCKED_RECORDING_ATTEMPT]");
      return;
    }

    const supported = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!supported) {
      alert("Speech recognition is not supported in this browser.");
      setSpeechStatus("Speech recognition not supported.");
      return;
    }

    setSpeechStatus("Listening for your answer...");

    if (recognitionRef.current) {
      console.log("[CLEANUP_EXISTING_RECOGNITION]");
      try { recognitionRef.current.stop(); } catch (e) { console.warn(e); }
      cleanupRecognition(recognitionRef.current);
      recognitionRef.current = null;
      isRecordingRef.current = false;
    }

    console.log("[NEW_RECOGNITION_CREATED]");
    const recognition = new supported();
    if (!(window as any).__activeSpeechRecognitions) {
      (window as any).__activeSpeechRecognitions = new Set();
    }
    (window as any).__activeSpeechRecognitions.add(recognition);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = window.navigator.language || "en-US";

    recognition.onstart = () => {
      console.log("[RECOGNITION_STARTED]");
      isRecordingRef.current = true;
      setSpeechStatus("Listening for your answer...");
      setInterviewState("listening");
    };

    recognition.onaudiostart = () => {
      console.log("[AUDIO_STARTED]");
    };

    recognition.onaudioend = () => {
      console.log("[AUDIO_ENDED]");
    };

    recognition.onspeechstart = () => {
      console.log("[SPEECH_STARTED]");
    };

    recognition.onresult = (event: any) => {
      console.log("[RECOGNITION_EVENT]", event);
      if (!event.results || event.results.length === 0) {
        console.log("[RECOGNITION_EMPTY_RESULT]");
        return;
      }

      let finalTranscript = finalTranscriptRef.current.trim();
      const interimChunks: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0]?.transcript || "";
        const normalizedText = normalizeTranscriptText(transcriptText);
        const cleanedText = correctSpokenText(normalizedText || transcriptText);
        if (!cleanedText) continue;

        if (result.isFinal) {
          finalTranscript = finalTranscript ? `${finalTranscript} ${cleanedText}` : cleanedText;
          console.log("[FINAL_RESULT]", cleanedText);
        } else {
          interimChunks.push(cleanedText);
          console.log("[INTERIM_RESULT]", cleanedText);
        }
      }

      finalTranscriptRef.current = finalTranscript;
      const interimTranscript = interimChunks.join(" ").trim();
      interimTranscriptRef.current = interimTranscript;
      const displayText = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();

      transcriptRef.current = displayText;
      setTranscript(displayText);
      console.log("[TRANSCRIPT_DISPLAY]", displayText);
      setSpeechStatus(interimTranscript ? "Listening for your answer..." : "Answer captured");
    };

    recognition.onnomatch = () => {
      console.log("[RECOGNITION_NO_MATCH]");
      setSpeechStatus("No speech recognized. Please try again.");
    };

    recognition.onend = () => {
      console.log("[RECOGNITION_ONEND] isRecording=", isRecordingRef.current);
      cleanupRecognition(recognition);
      recognitionRef.current = null;
      if (!isRecordingRef.current) {
        setSpeechStatus("Recording stopped");
        return;
      }
      setSpeechStatus("Speech recognition ended. Click Start to speak again.");
      setInterviewState("thinking");
    };

    recognition.onerror = (event: any) => {
      console.error("[SPEECH_ERROR]", event.error);
      setSpeechStatus(`Speech error: ${event.error}`);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isRecordingRef.current = false;
        setInterviewState("thinking");
      }
    };

    finalTranscriptRef.current = transcriptRef.current.trim();
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("[RECOGNITION_START_FAILED]", e);
      setSpeechStatus("Failed to start speech recognition. Please refresh and try again.");
      return;
    }
  };

  const onStopRecording = () => {
    console.log("[STOP_BUTTON_CLICKED]");
    setSpeechStatus("Recording stopped");
    if (recognitionTimeoutRef.current) {
      window.clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      console.log("[RECOGNITION_STOP_CALL]");
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("[RECOGNITION_STOP_ERROR]", e);
      }
      // Leave recognitionRef.current intact until onend fires so final results are delivered.
    }

    isRecordingRef.current = false;
    setInterviewState("thinking");
    setIsProcessingSpeech(true);
    setTimeout(() => {
      setIsProcessingSpeech(false);
    }, 800);
  };

  const onTranscriptUpdate = (newText: string) => {
    updateTranscript(newText);
  };

  const handleClearAnswer = () => {
    updateTranscript("");
    finalTranscriptRef.current = "";
    setSpeechStatus("Answer cleared");
  };
  // ----------------------------------------------------

  const handleEndInterview = (finalReport?: any) => {
    if (isEndingInterviewRef.current) return;
    isEndingInterviewRef.current = true;

    try {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.speechSynthesis.cancel();

      const currentTranscript = transcriptRef.current.trim();
      if (currentTranscript && !finalReport) {
        persistSessionTurn(currentTranscript);
      }

      if (finalReport) {
        localStorage.setItem("hireflow_final_report", JSON.stringify(finalReport));
      }

      if (recognitionRef.current) {
        console.log("[RECOGNITION_STOPPED]");
        try { recognitionRef.current.stop(); } catch(e){}
        console.log("[RECOGNITION_ABORTED]");
        try { recognitionRef.current.abort(); } catch(e){}
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        console.log("[RECOGNITION_DESTROYED]");
        recognitionRef.current = null;
      }
      isRecordingRef.current = false;
      console.log("[MIC_STOPPED]");
      stopAllInterviewResources();
      console.log("[CAMERA_STOPPED]");
      console.log("[STREAM_CLEANED]");
    } catch (error) {
      console.error("[END_INTERVIEW_ERROR]", error);
    }

    console.log("[REPORT_GENERATION] Navigating to processing page");
    navigate("/processing", { replace: true });
  };

  const handleFrameCaptured = async (b64: string) => {
    try {
      const res = await fetch("/api/check_face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 })
      });
      const data = await res.json();
      if (!data.error) {
        setTelemetry({
          timestamp: Date.now(),
          faceDetected: data.face_detected,
          emotion: data.emotion,
          confidence: data.confidence_score,
          attention: data.attention_score,
          eyeContact: data.eye_contact ? 100 : 0
        });
      }
    } catch (e) {
      // Silently ignore polling errors to not interrupt interview
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/favicon.png" alt="HireFlow Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">HireFlow</h1>
          </div>
          <div className="text-sm text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Session Recording Active
          </div>
        </div>
        
        {violations.length > 0 && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{violations.length} Violations Detected</span>
          </div>
        )}

        <div className="font-mono text-xl font-medium text-teal-400">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left: AI Avatar */}
        <div className="lg:col-span-1 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <AIAvatar state={interviewState} />
          <div className="mt-8 text-center text-zinc-400 text-sm">
            {isAiSpeaking ? "AI is asking the question..." : interviewState === "speaking" ? "AI is speaking..." : interviewState === "thinking" ? "AI is thinking..." : "AI is listening..."}
          </div>
        </div>

        {/* Center: Current Question */}
        <div className="lg:col-span-2 bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="text-teal-400 text-sm font-semibold mb-4 uppercase tracking-wider">Question {questionIndex}</div>
            <h2 className="text-2xl text-zinc-100 leading-relaxed font-medium">
              "{currentQuestion || "Loading question..."}"
            </h2>
            
            {currentQuestion && (
              <button 
                onClick={() => speakQuestion(currentQuestion)}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
              >
                Replay Audio
              </button>
            )}
          </div>

            <div className="flex-1 mt-6 flex flex-col gap-4">
              <textarea
                ref={textareaRef}
                className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-zinc-100 text-lg md:text-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[100px] md:min-h-[160px]"
                placeholder="Your answer will appear here..."
                value={transcript}
                onChange={(e) => onTranscriptUpdate(e.target.value)}
              />
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isProcessingSpeech ? (
                    <button 
                      disabled
                      className="px-6 py-3 bg-teal-500/50 text-teal-950 font-bold rounded-xl flex items-center gap-2 cursor-wait"
                    >
                      Processing speech...
                    </button>
                  ) : interviewState !== "listening" ? (
                    <button 
                      id="start-record-btn"
                      onClick={onStartRecording}
                      disabled={isAiSpeaking}
                      className={`px-6 py-3 font-bold rounded-xl transition-colors flex items-center gap-2 ${
                        isAiSpeaking
                          ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed"
                          : "bg-teal-500 hover:bg-teal-400 text-teal-950"
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      {isAiSpeaking ? "AI is speaking..." : "Start Recording"}
                    </button>
                  ) : (
                    <button 
                      id="stop-record-btn"
                      onClick={onStopRecording}
                      className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-colors flex items-center gap-2 relative overflow-hidden"
                    >
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping absolute ml-0.5" />
                      <span className="w-2.5 h-2.5 bg-white rounded-full relative z-10" />
                      ● Listening...
                    </button>
                  )}
                  
                  <button 
                    id="clear-btn"
                    onClick={handleClearAnswer}
                    disabled={!transcript}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 font-medium rounded-xl transition-colors"
                  >
                    Clear Answer
                  </button>
                </div>
              </div>
            </div>

          <div className="flex items-center justify-end pt-8 mt-6 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button 
                onClick={handleEndInterview}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Interview
              </button>
              <button 
                disabled={isProcessing || !transcript.trim()}
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-900 font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {isProcessing ? "Processing..." : "Submit & Next"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Metrics */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <CandidateCamera onFrameCaptured={handleFrameCaptured} />
          
          <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl flex-1 p-6 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> Live Telemetry
            </h3>
            
            <div className="space-y-8 flex-1 flex flex-col justify-center">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Confidence
                  </div>
                  <span className="text-cyan-400 font-mono text-sm font-bold">{telemetry.confidence}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.confidence}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-cyan-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Eye className="w-4 h-4 text-violet-400" />
                    Eye Contact
                  </div>
                  <span className="text-violet-400 font-mono text-sm font-bold">{telemetry.eyeContact}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.eyeContact}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-violet-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Attention
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-bold">{telemetry.attention}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${telemetry.attention}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-full bg-emerald-500 rounded-full" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    <Smile className="w-4 h-4 text-amber-400" />
                    Emotion
                  </div>
                  <span className="text-amber-400 font-mono text-sm font-bold">{telemetry.emotion}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                    Face Detected
                  </div>
                  <span className={`font-mono text-sm font-bold ${telemetry.faceDetected ? 'text-green-400' : 'text-red-400'}`}>
                    {telemetry.faceDetected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Violation Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[rgba(10,15,25,0.95)] border border-red-500/30 p-8 rounded-2xl max-w-md w-full shadow-[0_0_30px_rgba(239,68,68,0.2)] text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Interview Policy Violation</h2>
            <p className="text-zinc-300 mb-6">
              Please return to fullscreen mode.
              <br/>
              <span className="text-red-400 font-semibold mt-2 inline-block">Remaining Attempts: {3 - warningCount}</span>
            </p>
            <button
              onClick={() => {
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(e => console.log(e));
                }
                setShowFullscreenModal(false);
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
