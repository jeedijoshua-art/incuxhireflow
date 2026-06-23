class AttentionTracker:
    """Monitors face centering and gaze telemetry to quantify user attention score."""
    def __init__(self):
        self.history = []

    def calculate_attention(self, face_box, eye_contact_detected, frame_width):
        score = 0
        face_presence = 0
        eye_contact = 0
        centering = 0
        stability = 0
        
        if face_box is not None:
            face_presence = 35
            
            if eye_contact_detected:
                eye_contact = 35
                
            x, y, w, h = face_box
            face_center_x = x + (w / 2)
            frame_center_x = frame_width / 2
            
            # 15% Frame Centering
            drift = abs(face_center_x - frame_center_x)
            max_allowed_drift = frame_width * 0.25
            if drift < max_allowed_drift:
                centering = 15 * (1 - (drift / max_allowed_drift))
            else:
                centering = 0
                
            # 15% Face Stability (requires history to measure drift velocity)
            if len(self.history) > 0:
                prev_x = self.history[-1]
                drift_velocity = abs(face_center_x - prev_x)
                # If they moved less than 5% of the frame width, score high stability
                if drift_velocity < (frame_width * 0.05):
                    stability = 15
                elif drift_velocity < (frame_width * 0.15):
                    stability = 7
                else:
                    stability = 0
            else:
                stability = 15 # default to stable on first frame
                
            self.history.append(face_center_x)
            if len(self.history) > 5:
                self.history.pop(0)
        else:
            self.history.clear()
            
        score = face_presence + eye_contact + centering + stability
        return max(5, min(100, score))