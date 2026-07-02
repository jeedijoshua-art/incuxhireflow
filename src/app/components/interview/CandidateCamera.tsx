import React, { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { motion } from "motion/react";
import {
  stopAllInterviewResources,
  registerMediaStream,
} from "../../utils/mediaCleanup";

interface CandidateCameraProps {
  onFrameCaptured?: (b64: string) => void;
  faceDetected?: boolean;
}

const CandidateCamera = React.memo(function CandidateCamera({
  onFrameCaptured,
  faceDetected = false,
}: CandidateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameCapturedRef = useRef(onFrameCaptured);

  useEffect(() => {
    onFrameCapturedRef.current = onFrameCaptured;
  }, [onFrameCaptured]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        registerMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {}
    }
    setupCamera();

    const captureInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current && onFrameCapturedRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const b64 = canvas.toDataURL("image/jpeg", 0.7);
            onFrameCapturedRef.current(b64);
          }
        }
      }
    }, 5000); // 1 frame every 5 seconds for telemetry

    return () => {
      clearInterval(captureInterval);
      stopAllInterviewResources();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array ensures setup only runs once on mount

  return (
    <div className="bg-[rgba(10,15,25,0.72)] backdrop-blur-md border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
        <Camera className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
          Candidate Camera
        </h3>
      </div>

      {/* Camera Feed */}
      <div className="relative aspect-video bg-black/50 overflow-hidden">
        <motion.video
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* AI Environment Status */}
      <div className="p-4 bg-zinc-900/30 flex flex-col gap-3">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          AI Environment Status
        </h4>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <StatusIndicator
            label="Face Detected"
            value={faceDetected ? "Yes" : "No"}
            status={faceDetected ? "success" : "error"}
          />
          <StatusIndicator label="Lighting" value="Good" />
          <StatusIndicator label="Camera Quality" value="HD" />
        </div>
      </div>
    </div>
  );
});

function StatusIndicator({ label, value, status }: { label: string; value: string; status?: "success" | "error" | "warning" }) {
  const dotClass =
    status === "success"
      ? "bg-emerald-400"
      : status === "error"
      ? "bg-red-400"
      : "bg-teal-400";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`w-2 h-2 rounded-full ${dotClass}`}
        />
        {value}
      </div>
    </div>
  );
}
export default CandidateCamera;
