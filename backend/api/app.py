import sys
import os
import json
import base64
import time
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_DIR = os.path.join(BASE_DIR, "expression-tracker")

print(f"BASE_DIR: {BASE_DIR}")
print(f"TRACKER_DIR: {TRACKER_DIR}")
print(f"Tracker Dir Exists: {os.path.exists(TRACKER_DIR)}")

if TRACKER_DIR not in sys.path:
    sys.path.insert(0, TRACKER_DIR)

print(f"SYS PATH HEAD: {sys.path[0]}")

from face_detector import FaceDetector
from eye_contact_tracker import EyeContactTracker
from emotion_detector import EmotionAnalysis
from attention_tracker import AttentionTracker
from confidence_analyzer import ConfidenceAnalyzer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stateless trackers
face_det = FaceDetector()
eye_track = EyeContactTracker()
emotion_det = EmotionAnalysis()

@app.get("/")
def read_root():
    return {"status": "HireFlow API Running"}

@app.post("/api/check_face")
async def check_face(request: Request):
    data = await request.json()
    b64_data = data.get("image", "")
    if ',' in b64_data:
        b64_data = b64_data.split(',')[1]
        
    try:
        img_bytes = base64.b64decode(b64_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"faceDetected": False}
            
        faces = face_det.process_frame(frame)
        face_box = face_det.extract_landmarks(faces)
        
        return {"faceDetected": face_box is not None}
    except Exception as e:
        print(f"Error checking face: {e}")
        return {"faceDetected": False}

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Stateful trackers per connection
    atten_track = AttentionTracker()
    conf_analyze = ConfidenceAnalyzer()
    
    total_frames = 0
    eye_contact_frames = 0
    current_emotion = "Neutral"
    
    # Exponential Moving Average State
    ema_attention = None
    ema_confidence = None
    ema_eye_contact = None
    alpha = 0.35 # Smoothing factor

    try:
        while True:
            # Receive base64 string from frontend
            data = await websocket.receive_text()
            
            try:
                # Format is often "data:image/jpeg;base64,....."
                if ',' in data:
                    b64_data = data.split(',')[1]
                else:
                    b64_data = data
                    
                img_bytes = base64.b64decode(b64_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue
                
                total_frames += 1
                h, w, _ = frame.shape
                
                faces = face_det.process_frame(frame)
                face_box = face_det.extract_landmarks(faces)
                face_detected = face_box is not None
                
                eye_contact_present = False
                if face_detected:
                    eye_contact_present = eye_track.check_contact(frame, face_box)
                    if eye_contact_present:
                        eye_contact_frames += 1

                raw_eye_contact_pct = int((eye_contact_frames / total_frames) * 100) if total_frames > 0 else 0
                
                raw_attention_score = 0
                raw_confidence_score = 0
                
                if face_detected:
                    # Emotion parsing first (since confidence needs it, and emotion needs a basic conf)
                    # We pass 50 as a dummy conf just for emotion analysis if it requires it
                    current_emotion = emotion_det.analyze_emotion(face_box, 50)
                    
                    raw_attention_score = atten_track.calculate_attention(face_box, eye_contact_present, w)
                    raw_confidence_score = conf_analyze.get_confidence(current_emotion, eye_contact_present, face_box, w, raw_attention_score)
                else:
                    raw_attention_score = atten_track.calculate_attention(None, False, w)
                    raw_confidence_score = conf_analyze.get_confidence(current_emotion, False, None, w, raw_attention_score)
                    
                # Apply EMA Smoothing
                if ema_attention is None:
                    ema_attention = raw_attention_score
                    ema_confidence = raw_confidence_score
                    ema_eye_contact = raw_eye_contact_pct
                else:
                    ema_attention = (raw_attention_score * alpha) + (ema_attention * (1 - alpha))
                    ema_confidence = (raw_confidence_score * alpha) + (ema_confidence * (1 - alpha))
                    ema_eye_contact = (raw_eye_contact_pct * alpha) + (ema_eye_contact * (1 - alpha))
                    
                # Build telemetry payload
                payload = {
                    "timestamp": time.time(),
                    "faceDetected": face_detected,
                    "emotion": current_emotion,
                    "confidence": int(ema_confidence),
                    "attention": int(ema_attention),
                    "eyeContact": int(ema_eye_contact)
                }
                
                await websocket.send_json(payload)
                
            except Exception as e:
                print(f"Error processing frame: {e}")
                
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
