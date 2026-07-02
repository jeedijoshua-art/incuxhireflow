import os
import sys
import base64
import time
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRACKER_DIR = os.path.join(BASE_DIR, "expression-tracker")

# Ensure correct module loading by prioritizing this directory
if TRACKER_DIR in sys.path:
    sys.path.remove(TRACKER_DIR)
sys.path.insert(0, TRACKER_DIR)

# Remove conflicting modules from sys.modules
for mod in ['main']:
    if mod in sys.modules:
        del sys.modules[mod]

from face_detector import FaceDetector
from eye_contact_tracker import EyeContactTracker
from emotion_detector import EmotionAnalysis
from attention_tracker import AttentionTracker
from confidence_analyzer import ConfidenceAnalyzer
from in_memory_services import PlatformConfigurationService

# Stateless trackers
face_det = FaceDetector()
eye_track = EyeContactTracker()
emotion_det = EmotionAnalysis()

atten_track = AttentionTracker()
conf_analyze = ConfidenceAnalyzer()

@router.get("/expression/health")
def health_check():
    return {"status": "ok", "service": "expression-tracker"}

@router.post("/api/check_face")
async def check_face(request: Request):
    # Import sessions locally to avoid circular dependency
    from routes.interview_engine import sessions
    
    data = await request.json()
    b64_data = data.get("image", "")
    session_id = data.get("session_id")
    
    if ',' in b64_data:
        b64_data = b64_data.split(',')[1]
        
    try:
        img_bytes = base64.b64decode(b64_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"face_detected": False, "error": "Invalid frame"}
            
        faces = face_det.process_frame(frame)
        face_box = face_det.extract_landmarks(faces)
        
        if face_box is None:
            return {"face_detected": False, "error": "No face detected"}
            
        h, w, _ = frame.shape
        
        # Default fallback values
        eye_contact_present = True
        raw_attention_score = 100.0
        current_emotion = "neutral"
        raw_confidence_score = 100.0
        
        # Get active session config
        from routes.interview_engine import sessions
        config = sessions.get(session_id, {}).get("config", PlatformConfigurationService.get_config())
        t_config = config.get("telemetry", {})
        
        if t_config.get("enable_eye_tracking", True):
            eye_contact_present = eye_track.check_contact(frame, face_box)
            
        if t_config.get("enable_head_pose", True):
            raw_attention_score = atten_track.calculate_attention(face_box, eye_contact_present, w)
            
        if t_config.get("enable_emotion_detection", True):
            current_emotion = emotion_det.analyze_emotion(face_box, 50)
            
        if t_config.get("enable_confidence_analysis", True):
            raw_confidence_score = conf_analyze.get_confidence(current_emotion, eye_contact_present, face_box, w, raw_attention_score)
        
        return {
            "face_detected": True,
            "eye_contact": eye_contact_present,
            "emotion": current_emotion,
            "attention_score": int(raw_attention_score),
            "confidence_score": int(raw_confidence_score)
        }
    except Exception as e:
        print(f"Error checking face: {e}")
        return {"face_detected": False, "error": str(e)}

@router.websocket("/expression/telemetry")
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
