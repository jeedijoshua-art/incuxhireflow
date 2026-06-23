import cv2

class FaceDetector:
    """Handles native OpenCV face detection to completely bypass MediaPipe bugs."""
    def __init__(self):
        # Using OpenCV's built-in front face cascade loader
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    def process_frame(self, frame):
        if frame is None:
            return []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))
        return faces

    def extract_landmarks(self, results):
        # Returns the first face bounding box found [x, y, w, h]
        if len(results) > 0:
            return results[0]
        return None