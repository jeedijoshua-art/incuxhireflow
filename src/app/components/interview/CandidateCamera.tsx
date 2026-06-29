import React, { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { motion } from "motion/react";
import {
  registerMediaStream,
  consumeHandoffMediaStream,
} from "../../utils/mediaCleanup";

interface CandidateCameraProps {
  onFrameCaptured?: (b64: string) => void;
}

async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
) {
  video.srcObject = stream;
  try {
    await video.play();
  } catch (err) {
    console.warn("[CAMERA] video.play() failed, retrying on loadedmetadata", err);
    video.onloadedmetadata = () => {
      video.play().catch((e) => console.error("[CAMERA] play retry failed", e));
    };
  }
}

const CandidateCamera = React.memo(function CandidateCamera({
  onFrameCaptured,
}: CandidateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const onFrameCapturedRef = useRef(onFrameCaptured);

  useEffect(() => {
    onFrameCapturedRef.current = onFrameCaptured;
  }, [onFrameCaptured]);

  useEffect(() => {
    let cancelled = false;

    async function setupCamera() {
      const handoffStream = consumeHandoffMediaStream();
      if (handoffStream && handoffStream.getVideoTracks().some((t) => t.readyState === "live")) {
        streamRef.current = handoffStream;
        ownsStreamRef.current = false;
        registerMediaStream(handoffStream);
        if (videoRef.current) {
          await attachStreamToVideo(videoRef.current, handoffStream);
        }
        return;
      }

      let retries = 3;
      while (retries > 0 && !cancelled) {
        try {
          await new Promise((r) => setTimeout(r, 300));

          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          ownsStreamRef.current = true;
          registerMediaStream(stream);
          if (videoRef.current) {
            await attachStreamToVideo(videoRef.current, stream);
          }
          break;
        } catch (err) {
          console.error(
            `[CAMERA_ERROR] Failed to get camera stream. Retries left: ${retries - 1}`,
            err,
          );
          retries--;
          if (retries === 0) {
            console.error("[CAMERA_FATAL] Could not initialize camera after multiple attempts.");
          }
        }
      }
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
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(captureInterval);
      if (ownsStreamRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  return (
    <div className="bg-[#0a0f19] border border-[rgba(45,212,191,0.08)] shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
        <Camera className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
          Candidate Camera
        </h3>
      </div>

      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        <motion.video
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-4 bg-zinc-900/30 flex flex-col gap-3">
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          AI Environment Status
        </h4>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <StatusIndicator label="Face Detected" value="Active" />
          <StatusIndicator label="Lighting" value="Good" />
          <StatusIndicator label="Camera Quality" value="HD" />
        </div>
      </div>
    </div>
  );
});

function StatusIndicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-teal-400"
        />
        {value}
      </div>
    </div>
  );
}
export default CandidateCamera;
