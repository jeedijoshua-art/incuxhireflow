class ConfidenceAnalyzer:
    """Compiles eye contact and face alignment tracking data into confidence levels."""
    def __init__(self):
        self.history = []

    def get_confidence(self, current_emotion, eye_contact_detected, face_box, frame_width, attention_score):
        score = 0
        
        if face_box is None:
            self.history.clear()
            return 5
            
        x, y, w, h = face_box
        face_center_x = x + (w / 2)
        frame_center_x = frame_width / 2
        
        # 40% Eye Contact
        if eye_contact_detected:
            score += 40
            
        # 25% Face Stability
        stability = 0
        if len(self.history) > 0:
            prev_x = self.history[-1]
            drift = abs(face_center_x - prev_x)
            if drift < (frame_width * 0.05):
                stability = 25
            elif drift < (frame_width * 0.15):
                stability = 10
        else:
            stability = 25
        score += stability
        
        self.history.append(face_center_x)
        if len(self.history) > 5:
            self.history.pop(0)
            
        # 15% Head Position (Centered)
        centering_drift = abs(face_center_x - frame_center_x)
        if centering_drift < (frame_width * 0.10):
            score += 15
        elif centering_drift < (frame_width * 0.25):
            score += 5
            
        # 10% Attention Score (pass-through weight)
        score += (attention_score / 100) * 10
        
        # 10% Emotion Confidence
        if current_emotion in ["Happy", "Surprise", "Neutral"]:
            score += 10
        elif current_emotion in ["Sad", "Fear", "Angry", "Disgust", "Nervous"]:
            score += 0
        else:
            score += 5
            
        return max(5, min(100, score))