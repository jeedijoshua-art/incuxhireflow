export function stopAllInterviewResources() {
  console.log("Cleanup Started");

  // 1. Stop all tracks in any video or audio elements
  document.querySelectorAll("video, audio").forEach((element) => {
    const mediaElement = element as HTMLVideoElement | HTMLAudioElement;
    if (mediaElement.srcObject instanceof MediaStream) {
      console.log("Tracks Found:", mediaElement.srcObject.getTracks().length);
      mediaElement.srcObject.getTracks().forEach((track) => {
        console.log("Track Stopped:", track.kind);
        track.stop();
      });
      mediaElement.srcObject = null;
    }
  });

  // 2. Stop SpeechRecognition (if globally registered by the app)
  if ((window as any).__activeSpeechRecognitions) {
    (window as any).__activeSpeechRecognitions.forEach((recognition: any) => {
      try {
        recognition.stop();
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      } catch (e) {
        // ignore already stopped errors
      }
    });
    (window as any).__activeSpeechRecognitions.clear();
  }

  // 3. Stop MediaRecorders
  if ((window as any).__activeMediaRecorders) {
    (window as any).__activeMediaRecorders.forEach((recorder: MediaRecorder) => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    });
    (window as any).__activeMediaRecorders.clear();
  }

  // 4. Release global media streams (fallback)
  if ((window as any).__activeMediaStreams) {
    (window as any).__activeMediaStreams.forEach((stream: MediaStream) => {
      console.log("Tracks Found (global):", stream.getTracks().length);
      stream.getTracks().forEach((track) => {
        console.log("Track Stopped (global):", track.kind);
        track.stop();
      });
    });
    (window as any).__activeMediaStreams.clear();
  }

  // 5. Clear globally registered intervals/timeouts/animations
  if ((window as any).__interviewIntervals) {
    (window as any).__interviewIntervals.forEach((id: number) => window.clearInterval(id));
    (window as any).__interviewIntervals.clear();
  }
  
  if ((window as any).__interviewTimeouts) {
    (window as any).__interviewTimeouts.forEach((id: number) => window.clearTimeout(id));
    (window as any).__interviewTimeouts.clear();
  }
  
  if ((window as any).__interviewRAFs) {
    (window as any).__interviewRAFs.forEach((id: number) => window.cancelAnimationFrame(id));
    (window as any).__interviewRAFs.clear();
  }

  // 6. Check track termination state
  setTimeout(() => {
    let allEnded = true;
    document.querySelectorAll("video, audio").forEach((element) => {
      const mediaElement = element as HTMLVideoElement | HTMLAudioElement;
      if (mediaElement.srcObject instanceof MediaStream) {
        allEnded = false;
      }
    });
    if ((window as any).__activeMediaStreams) {
        (window as any).__activeMediaStreams.forEach((stream: MediaStream) => {
            stream.getTracks().forEach((track) => {
                if (track.readyState !== "ended") {
                    allEnded = false;
                    console.log("Track failed to end:", track.kind);
                }
            });
        });
    }
    console.log("Tracks all ended:", allEnded);
    console.log("Cleanup Complete");
  }, 100);
}

// Helpers to register resources so they can be cleaned up globally
export function registerMediaStream(stream: MediaStream) {
  if (!(window as any).__activeMediaStreams) (window as any).__activeMediaStreams = new Set();
  (window as any).__activeMediaStreams.add(stream);
}

/** Store the readiness-page stream for reuse on the live interview page. */
export function setHandoffMediaStream(stream: MediaStream | null) {
  (window as any).__handoffMediaStream = stream;
}

/** Take the handoff stream once; avoids a second getUserMedia call on Windows. */
export function consumeHandoffMediaStream(): MediaStream | null {
  const stream = (window as any).__handoffMediaStream as MediaStream | null | undefined;
  (window as any).__handoffMediaStream = null;
  return stream ?? null;
}

export function registerInterval(id: number) {
  if (!(window as any).__interviewIntervals) (window as any).__interviewIntervals = new Set();
  (window as any).__interviewIntervals.add(id);
}

export function registerTimeout(id: number) {
  if (!(window as any).__interviewTimeouts) (window as any).__interviewTimeouts = new Set();
  (window as any).__interviewTimeouts.add(id);
}

export function registerRAF(id: number) {
  if (!(window as any).__interviewRAFs) (window as any).__interviewRAFs = new Set();
  (window as any).__interviewRAFs.add(id);
}
