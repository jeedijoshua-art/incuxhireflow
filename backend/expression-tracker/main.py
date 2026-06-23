import cv2
import json
import sys
import time
from face_detector import FaceDetector
from eye_contact_tracker import EyeContactTracker
from emotion_detector import EmotionAnalysis
from attention_tracker import AttentionTracker
from confidence_analyzer import ConfidenceAnalyzer
from telemetry import TrackerResult, TelemetryManager, ReportGenerator

def main():
    face_det = FaceDetector()
    eye_track = EyeContactTracker()
    emotion_det = EmotionAnalysis()
    atten_track = AttentionTracker()
    conf_analyze = ConfidenceAnalyzer()
    
    telemetry_manager = TelemetryManager()
    report_generator = ReportGenerator(telemetry_manager, report_interval=5.0)

    cap = cv2.VideoCapture(0)
    
    total_frames = 0
    eye_contact_frames = 0
    running_attention = 0
    running_confidence = 0
    current_emotion = "Neutral"

    print("=== HireFlow Pure OpenCV Engine Tracker Online ===")
    
    TARGET_FPS = 15
    FRAME_TIME = 1.0 / TARGET_FPS

    try:
        while True:
            start_time = time.time()
            ret, frame = cap.read()
            if not ret:
                break

            total_frames += 1
            h, w, _ = frame.shape
            
            # Process and track
            faces = face_det.process_frame(frame)
            face_box = face_det.extract_landmarks(faces)
            face_detected = face_box is not None
            
            eye_contact_present = False
            if face_detected:
                eye_contact_present = eye_track.check_contact(frame, face_box)
                if eye_contact_present:
                    eye_contact_frames += 1

                # Draw standard debug overlays onto visual feed window
                fx, fy, fw, fh = face_box
                cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (245, 158, 11), 2)

            eye_contact_pct = int((eye_contact_frames / total_frames) * 100) if total_frames > 0 else 0
            
            avg_attention_score = 0
            avg_confidence_score = 0
            
            if face_detected:
                frame_attention = atten_track.calculate_attention(face_box, eye_contact_present, w)
                running_attention += frame_attention
                
                frame_conf = conf_analyze.get_confidence(current_emotion, eye_contact_present, face_box, w)
                current_emotion = emotion_det.analyze_emotion(face_box, frame_conf)
                
                final_conf = conf_analyze.get_confidence(current_emotion, eye_contact_present, face_box, w)
                running_confidence += final_conf
                
                avg_attention_score = int(running_attention / total_frames)
                avg_confidence_score = int(running_confidence / total_frames)
            else:
                running_attention += 10
                running_confidence += 20
                avg_attention_score = int(running_attention / total_frames)
                avg_confidence_score = int(running_confidence / total_frames)

            # Store telemetry
            result = TrackerResult(
                face_detected=face_detected,
                emotion=current_emotion,
                confidence_score=avg_confidence_score,
                attention_score=avg_attention_score,
                eye_contact_score=eye_contact_pct,
                timestamp=time.time()
            )
            telemetry_manager.add_result(result)

            # Generate Report (print every 5 seconds)
            report = report_generator.generate_summary()
            if report:
                print(f"\n[REPORT] {json.dumps(report, indent=2)}")

            # Overlay Data on Video
            cv2.putText(frame, f"Face Detected: {face_detected}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0) if face_detected else (0, 0, 255), 2)
            cv2.putText(frame, f"Emotion: {current_emotion}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Confidence: {avg_confidence_score}%", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Attention: {avg_attention_score}%", (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Eye Contact: {eye_contact_pct}%", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow("HireFlow Live Tracker Engine", frame)
            
            # FPS Control and Exit Handling
            process_time = time.time() - start_time
            sleep_time = max(0, FRAME_TIME - process_time)
            
            # Wait for key press or sleep_time to control FPS
            # waitKey takes milliseconds
            wait_ms = max(1, int(sleep_time * 1000))
            if cv2.waitKey(wait_ms) & 0xFF == ord('q'):
                print("\n[INFO] Exiting tracker gracefully...")
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()