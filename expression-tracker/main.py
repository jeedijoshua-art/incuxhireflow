"""Expression Tracker — FastAPI WebSocket service for live webcam analysis."""
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from face_detector import FaceDetector
from eye_tracker import EyeTracker
from emotion_classifier import EmotionClassifier
from attention_scorer import AttentionScorer

app = FastAPI(title="HireFlow Expression Tracker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

face = FaceDetector()
eyes = EyeTracker()
emotion = EmotionClassifier()
attn = AttentionScorer()


@app.websocket("/ws/track")
async def track(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_json()
            # Expecting base64 jpeg frame in msg["frame"]
            frame_bytes = base64.b64decode(msg.get("frame", ""))
            faces = face.detect(frame_bytes)
            if not faces:
                await ws.send_json({"face_detected": False})
                continue
            gaze = eyes.estimate(faces[0])
            emo = emotion.classify(faces[0])
            score = attn.score(gaze, emo)
            await ws.send_json({
                "face_detected": True,
                "eye_contact": score["eye_contact"],
                "attention": score["attention"],
                "emotion": emo,
            })
    except WebSocketDisconnect:
        return


@app.get("/api/health")
def health():
    return {"ok": True}
