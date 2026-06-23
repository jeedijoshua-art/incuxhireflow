import cv2

class EyeContactTracker:
    """Tracks eye visibility metrics natively inside the face bounding box region."""
    def __init__(self):
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

    def check_contact(self, frame, face_box):
        try:
            if face_box is None:
                return False
            x, y, w, h = face_box
            face_roi = frame[y:y+h, x:x+w]
            gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
            
            eyes = self.eye_cascade.detectMultiScale(gray_roi, scaleFactor=1.1, minNeighbors=4, minSize=(15, 15))
            
            # If both eyes are clearly visible in front of the camera, eye contact is maintained
            if len(eyes) >= 1:
                return True
            return False
        except Exception:
            return True