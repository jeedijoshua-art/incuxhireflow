import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import AIAvatar from "../components/interview/AIAvatar";
import CandidateCamera from "../components/interview/CandidateCamera";
import { useNavigate } from "react-router-dom";
import { PhoneOff, ArrowRight, Activity, Mic, Zap, Smile, AlertTriangle, Eye } from "lucide-react";
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
  const isFetchingRef = useRef(false); // Prevent multiple fetches
  const lastSpokenQuestionRef = useRef(""); // Prevent speaking the same question twice
  const isSpeakingRef = useRef(false); // Track if currently speaking
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
  const isEndingInterviewRef = useRef(false);
  
  const [transcript, setTranscript] = useState("");
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("Ready to capture your answer");
  
  // Speech Recognition State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const telemetryIntervalRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<string>("");
  const hasFetchedInitialQuestion = useRef(false);
  const recognitionRef = useRef<any>(null);
  // Bug #12 fix: track current question index in a ref so persistSessionTurn
  // always captures the correct value without stale closure issues
  const questionIndexRef = useRef(0);

  // Bug #10 fix: actually start the countdown timer with setInterval
  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleEndInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

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

      // Bug #14 fix: compute new count outside setState, then call the side effect separately
      setWarningCount(prev => {
        const newCount = prev + 1;
        console.log(`[WARNING_COUNT] ${newCount}`);
        return newCount;
      });
    }
  };

  // Bug #14 fix: watch warningCount in a separate effect to trigger the side effects
  useEffect(() => {
    if (warningCount === 0) return;
    if (warningCount >= 3) {
      console.log("[INTERVIEW_TERMINATED]");
      handleEndInterview();
    } else {
      setShowFullscreenModal(true);
    }
  }, [warningCount]);

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
  const fetchNextQuestion = async (sessionId: string, skipSpeak: boolean = false) => {
    if (isFetchingRef.current) {
      console.log("[FETCH_SKIPPED] Already fetching a question");
      return;
    }
    
    isFetchingRef.current = true;
    setIsProcessing(true);
    setInterviewState("thinking");
    try {
      const payload = { session_id: sessionId };
      console.log("[NEXT_QUESTION] Requesting next question. Current index:", questionIndex);
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
        questionIndexRef.current = data.index + 1;
      } else {
        setQuestionIndex(prev => {
          const next = prev + 1;
          questionIndexRef.current = next;
          return next;
        });
      }
      
      setCurrentQuestion(data.question);
      setInterviewState("speaking");
      if (!skipSpeak) {
        console.log("[SPEAK_QUESTION] About to speak next question");
        lastSpokenQuestionRef.current = ""; // Reset for new question
        isSpeakingRef.current = false;
        speakQuestion(data.question);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch next question");
    } finally {
      setIsProcessing(false);
      isFetchingRef.current = false;
    }
  };

  const speakQuestion = (text: string) => {
    console.log("[SPEAK_QUESTION] Starting speak function for:", text);
    
    // Check if we already spoke this question
    if (lastSpokenQuestionRef.current === text || isSpeakingRef.current) {
      console.log("[SPEAK_SKIPPED] Already spoke or currently speaking this question");
      return;
    }
    
    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    // Set our flags
    lastSpokenQuestionRef.current = text;
    isSpeakingRef.current = true;
    
    // Ensure voices are loaded
    try {
      window.speechSynthesis.getVoices();
    } catch (e) {
      console.warn("[VOICE_LOAD_ERROR]", e);
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    const personaId = localStorage.getItem("hireflow_selected_voice") || "david";
    console.log(`[VOICE_SELECTED] ${personaId}`);
    
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
      isSpeakingRef.current = false;
    };

    utterance.onerror = (e) => {
      console.log("[TTS_END] via Error");
      console.error("Error speaking", e);
      console.log("[MIC_UNLOCKED]");
      setIsAiSpeaking(false);
      isSpeakingRef.current = false;
    };

    // Set voice
    const voice = resolveBrowserVoice(personaId);
    if (voice) {
      utterance.voice = voice;
      console.log(`[VOICE_RESOLVED] ${voice.name}`);
    } else {
      console.log(`[VOICE_RESOLVED] Default`);
    }

    // Speak!
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    document.title = "HireFlow | Mock Interview";
    
    const personaId = localStorage.getItem("hireflow_selected_voice") || "david";
    console.log(`[VOICE_PERSONAS_LOADED] ${VOICE_PERSONAS.length} personas loaded.`);
    console.log(`[VOICE_SELECTED] ${personaId}`);
    
    // Ensure voices are loaded into memory early
    window.speechSynthesis.getVoices();
    
    // RESET ALL INTERVIEW STATES WHEN PAGE LOADS!
    // Clear ALL previous interview data from localStorage - every interview is independent
    localStorage.removeItem("hireflow_session");
    localStorage.removeItem("hireflow_final_report");
    
    setTranscript("");
    transcriptRef.current = "";
    finalTranscriptRef.current = "";
    setQuestionIndex(0);
    questionIndexRef.current = 0;
    setCurrentQuestion("");
    setViolations([]);
    setWarningCount(0);
    hasFetchedInitialQuestion.current = false;
    lastSpokenQuestionRef.current = "";
    isSpeakingRef.current = false;
    isFetchingRef.current = false;
    isRecordingRef.current = false;

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

    // Setup violation listeners
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Fetch First Question (Prevent double fetch in Strict Mode)
    if (!hasFetchedInitialQuestion.current) {
      hasFetchedInitialQuestion.current = true;
      console.log("[INTERVIEW_START] Initializing interview for session:", sessionId);
      // Wait a tiny bit to make sure voices are loaded
      setTimeout(() => {
        fetchNextQuestion(sessionId, false);
      }, 300);
    }
    
    return () => {
      clearInterval(Number(telemetryIntervalRef.current));
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.speechSynthesis.cancel();
      
      if (recognitionRef.current) {
        console.log("[RECOGNITION_STOPPED]");
        try { recognitionRef.current.stop(); } catch(e){}
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
    return value.trim();
  };

  const updateTranscript = (newText: string) => {
    transcriptRef.current = newText;
    setTranscript(newText);
  };

  const persistSessionTurn = (turnTranscript: string) => {
    const cleanTranscript = turnTranscript.trim();
    if (!cleanTranscript) return;

    try {
      const existing = JSON.parse(localStorage.getItem("hireflow_session") || "[]");
      const sessionData = Array.isArray(existing) ? existing : [];
      // Bug #12 fix: use ref instead of state to get the correct question index
      sessionData.push({
        question: questionIndexRef.current,
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
    if (isFetchingRef.current) {
      console.log("[SUBMIT_SKIPPED] Already processing");
      return;
    }
    
    const answerText = transcriptRef.current.trim();
    // Allow submitting even if empty (to handle unanswered questions)
    const sessionId = localStorage.getItem("hireflow_session_id");
    if (!sessionId) return;
    
    setIsProcessing(true);
    window.speechSynthesis.cancel();
    
    console.log("[SUBMIT_CLEANUP] Stopping recognition before next question");
    if (recognitionRef.current) {
      console.log("[RECOGNITION_STOPPED]");
      try { recognitionRef.current.stop(); } catch(e){}
      try { recognitionRef.current.abort(); } catch(e){}
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onstart = null;
      recognitionRef.current = null;
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
      // Clear BOTH transcript refs completely before next question - no answer carryover
      updateTranscript("");
      transcriptRef.current = "";
      finalTranscriptRef.current = "";
      
      // 2. Fetch the next question - don't skip speaking!
      console.log("[FETCH_NEXT_AND_SPEAK]");
      await fetchNextQuestion(sessionId, false);
    } catch (e) {
      console.error(e);
      alert("Failed to submit answer");
      setIsProcessing(false);
    }
  };

  // Browser-native speech recognition (primary - no backend API key required).
  // Also records audio in parallel so it can be sent to the backend Whisper STT
  // for a higher-accuracy final transcript when the user stops speaking.
  const startBrowserSpeechRecognition = async (): Promise<boolean> => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    // Stop any previous recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
      try { recognitionRef.current.abort(); } catch(e){}
      recognitionRef.current = null;
    }

    // Stop any previous recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    isRecordingRef.current = false;
    audioChunksRef.current = [];

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("[MIC_ERROR]", e);
      setSpeechStatus("Failed to access microphone.");
      return true; // Return true so we don't immediately fall back again
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Use the browser locale for better accent/model matching, default to en-US
    recognition.lang = navigator.language?.startsWith("en")
      ? navigator.language
      : "en-US";
    recognitionRef.current = recognition;

    let accumulatedInterim = "";

    recognition.onstart = () => {
      console.log("[BROWSER_SPEECH_STARTED]");
      isRecordingRef.current = true;
      setInterviewState("listening");
      setSpeechStatus("🎤 Listening... Speak now!");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0];
        const resultTranscript = result.transcript;
        if (event.results[i].isFinal) {
          finalChunk += resultTranscript + " ";
        } else {
          interim += resultTranscript;
        }
      }
      accumulatedInterim = interim;

      if (finalChunk.trim()) {
        const currentFinal = finalTranscriptRef.current.trim();
        const updatedFinal = [currentFinal, finalChunk.trim()].filter(Boolean).join(" ").trim();
        finalTranscriptRef.current = updatedFinal;
      }

      const displayText = [finalTranscriptRef.current, accumulatedInterim.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();
      transcriptRef.current = finalTranscriptRef.current;
      setTranscript(displayText);
    };

    recognition.onerror = (event: any) => {
      console.error("[BROWSER_SPEECH_ERROR]", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isRecordingRef.current = false;
        setSpeechStatus("Microphone permission denied. Check browser settings.");
      } else if (event.error === "no-speech") {
        // Don't stop recording on no-speech; the user may simply be pausing
        setSpeechStatus("No speech heard. Keep speaking...");
      } else if (event.error === "aborted") {
        // Usually triggered by our own stop/abort; ignore
      } else {
        isRecordingRef.current = false;
        setSpeechStatus("Speech recognition error.");
      }
    };

    recognition.onend = () => {
      console.log("[BROWSER_SPEECH_ENDED]");
      if (isRecordingRef.current && recognitionRef.current === recognition) {
        // The browser ended the session (often after silence). Restart quickly
        // so the microphone feels continuously active.
        try {
          recognition.start();
          return;
        } catch(e) {
          // If restart fails, fall through to cleanup
        }
      }

      // Commit any remaining interim text as final so nothing is lost
      if (accumulatedInterim.trim()) {
        const currentFinal = finalTranscriptRef.current.trim();
        const updatedFinal = [currentFinal, accumulatedInterim.trim()].filter(Boolean).join(" ").trim();
        finalTranscriptRef.current = updatedFinal;
        accumulatedInterim = "";
      }

      transcriptRef.current = finalTranscriptRef.current;
      setTranscript(finalTranscriptRef.current);
      // Don't set "Answer captured" here; the recorder onstop will refine with backend STT
      recognitionRef.current = null;
    };

    // Start parallel audio recording for backend refinement
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";
    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error("[MEDIA_RECORDER_ERROR]", event);
    };

    mediaRecorder.onstop = async () => {
      console.log("[MEDIA_RECORDER_STOPPED]");
      isRecordingRef.current = false;
      setInterviewState("thinking");

      const recordedType = mediaRecorder.mimeType || "audio/webm";
      const extension = recordedType.includes("mp4") ? ".mp4" : ".webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
      console.log("[AUDIO_BLOB] size:", audioBlob.size, "type:", audioBlob.type);

      if (audioBlob.size < 1000) {
        setSpeechStatus("Answer captured");
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      const browserFinal = finalTranscriptRef.current.trim();
      setSpeechStatus("Refining with AI...");

      const formData = new FormData();
      formData.append("file", audioBlob, `recording${extension}`);
      formData.append("session_id", localStorage.getItem("hireflow_session_id") || "");

      try {
        const res = await fetch("/interview/speech-to-text", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const backendTranscript = (data.transcript || "").trim();
          console.log("[BACKEND_TRANSCRIPT]", backendTranscript);

          if (backendTranscript) {
            // Prefer the backend transcript because Whisper is more accurate.
            // Keep the browser transcript only if the backend returned nothing.
            const refined = [browserFinal, backendTranscript]
              .filter(Boolean)
              .join(" ")
              .trim();
            finalTranscriptRef.current = backendTranscript || browserFinal;
            transcriptRef.current = finalTranscriptRef.current;
            setTranscript(finalTranscriptRef.current);
            setSpeechStatus("Answer captured (refined)");
          } else {
            setSpeechStatus("Answer captured");
          }
        } else if (res.status === 503) {
          // Backend STT not configured (no API key) — keep browser transcript
          console.log("[BACKEND_STT_NOT_CONFIGURED] Keeping browser transcript.");
          setSpeechStatus("Answer captured");
        } else {
          const errText = await res.text();
          console.error("[STT_HTTP_ERROR]", res.status, errText);
          setSpeechStatus("Answer captured");
        }
      } catch (e) {
        console.error("[STT_ERROR]", e);
        setSpeechStatus("Answer captured");
      }

      stream?.getTracks().forEach((track) => track.stop());
    };

    setSpeechStatus("Initializing microphone...");
    try {
      recognition.start();
      mediaRecorder.start();
      return true;
    } catch (e) {
      console.error("[BROWSER_SPEECH_START_FAILED]", e);
      try { mediaRecorder.stop(); } catch(e2){}
      stream?.getTracks().forEach((track) => track.stop());
      recognitionRef.current = null;
      mediaRecorderRef.current = null;
      return false;
    }
  };

  // Server-side STT fallback using Groq Whisper
  const startMediaRecorderFallback = async () => {
    // Stop any existing recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    isRecordingRef.current = false;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log("[MEDIA_RECORDER_STARTED]");
        isRecordingRef.current = true;
        setInterviewState("listening");
      };

      mediaRecorder.onerror = (event) => {
        console.error("[MEDIA_RECORDER_ERROR]", event);
        setSpeechStatus("Recording error. Please try again.");
        isRecordingRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.onstop = async () => {
        console.log("[MEDIA_RECORDER_STOPPED]");
        isRecordingRef.current = false;
        setInterviewState("thinking");
        setSpeechStatus("Processing speech...");

        const recordedType = mediaRecorder.mimeType || "audio/webm";
        const extension = recordedType.includes("mp4") ? ".mp4" : ".webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
        console.log("[AUDIO_BLOB] size:", audioBlob.size, "type:", audioBlob.type);

        if (audioBlob.size < 1000) {
          setSpeechStatus("Recording too short. Nothing was captured.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const formData = new FormData();
        formData.append("file", audioBlob, `recording${extension}`);
        formData.append("session_id", localStorage.getItem("hireflow_session_id") || "");

        try {
          const res = await fetch("/interview/speech-to-text", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            const newTranscript = data.transcript;

            if (newTranscript) {
              const currentFinal = finalTranscriptRef.current.trim();
              const displayText = [currentFinal, newTranscript].filter(Boolean).join(" ").trim();

              finalTranscriptRef.current = displayText;
              transcriptRef.current = displayText;
              setTranscript(displayText);
            }
            setSpeechStatus("Answer captured");
          } else {
            const errText = await res.text();
            console.error("[STT_HTTP_ERROR]", res.status, errText);
            setSpeechStatus(`Speech error: ${res.status === 500 ? "Server transcription failed" : "Failed to transcribe"}`);
          }
        } catch (e) {
          console.error("[STT_ERROR]", e);
          setSpeechStatus("Speech error: Failed to connect to transcription service");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (e) {
      console.error("[MIC_ERROR]", e);
      setSpeechStatus("Failed to access microphone.");
    }
  };

  const onStartRecording = async () => {
    if (isAiSpeaking) {
      console.log("[BLOCKED_RECORDING_ATTEMPT]");
      return;
    }

    // Primary: browser speech recognition (real-time, no API key)
    if (await startBrowserSpeechRecognition()) {
      return;
    }

    // Fallback: MediaRecorder + server-side Whisper
    await startMediaRecorderFallback();
  };

  const onStopRecording = () => {
    console.log("[STOP_BUTTON_CLICKED]");
    if (recognitionRef.current) {
      isRecordingRef.current = false;
      try { recognitionRef.current.stop(); } catch(e){}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    if (!recognitionRef.current && (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording")) {
      setSpeechStatus("Recording stopped");
    }
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

  const handleEndInterview = async (finalReport?: any) => {
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
      } else {
        // Force the backend to end the interview and generate a report now
        setIsProcessing(true);
        const sessionId = localStorage.getItem("hireflow_session_id");
        if (sessionId) {
          try {
            console.log("[REPORT_GENERATION] Requesting final report generation for early end");
            const res = await fetch("/interview/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                session_id: sessionId, 
                answer: currentTranscript 
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.report) {
                localStorage.setItem("hireflow_final_report", JSON.stringify(data.report));
                console.log("[REPORT_GENERATION] Early end report saved to localStorage");
              }
            }
          } catch (e) {
            console.error("Failed to generate final report on end", e);
          }
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        console.log("[RECOGNITION_STOPPED]");
        try { mediaRecorderRef.current.stop(); } catch(e){}
        mediaRecorderRef.current = null;
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
    <div className="min-h-screen flex flex-col bg-[#030712] p-6">
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
        <div className="lg:col-span-1 bg-[#0a0f19] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <AIAvatar state={interviewState} />
          <div className="mt-8 text-center text-zinc-400 text-sm">
            {isAiSpeaking ? "AI is asking the question..." : interviewState === "speaking" ? "AI is speaking..." : interviewState === "thinking" ? "AI is thinking..." : "AI is listening..."}
          </div>
        </div>

        {/* Center: Current Question */}
        <div className="lg:col-span-2 bg-[#0a0f19] border border-[rgba(45,212,191,0.08)] rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="text-teal-400 text-sm font-semibold mb-4 uppercase tracking-wider">Question {questionIndex}</div>
            <h2 className="text-2xl text-zinc-100 leading-relaxed font-medium mb-4">
              "{currentQuestion || "Loading question..."}"
            </h2>
            
            {currentQuestion && (
              <button 
                onClick={() => {
                  console.log("[REPLAY_CLICKED] Replaying question");
                  lastSpokenQuestionRef.current = ""; // Allow replaying
                  isSpeakingRef.current = false;
                  speakQuestion(currentQuestion);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-teal-900/20"
              >
                🔊 Replay Question
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
                <div className="text-xs text-zinc-500">{speechStatus}</div>
              </div>
            </div>

          <div className="flex items-center justify-end pt-8 mt-6 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button 
                onClick={() => handleEndInterview()}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Interview
              </button>
              <button 
                disabled={isProcessing}
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
          
          <div className="bg-[#0a0f19] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl flex-1 p-6 flex flex-col">
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
