"""Face detection wrapper around MediaPipe Face Mesh."""


class FaceDetector:
    """Wraps MediaPipe's face mesh to locate faces + 468 landmarks per frame."""

    def __init__(self) -> None:
        # Lazy-import so the rest of the app can be tested without the heavy ML dep
        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False, max_num_faces=1, refine_landmarks=True,
                min_detection_confidence=0.5, min_tracking_confidence=0.5,
            )
        except ImportError:
            self.face_mesh = None

    def detect(self, jpeg_bytes: bytes) -> list[dict]:
        """Returns a list of detected faces with landmark coordinates."""
        if self.face_mesh is None or not jpeg_bytes:
            return []
        try:
            import cv2
            import numpy as np
            arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                return []
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = self.face_mesh.process(rgb)
            if not result.multi_face_landmarks:
                return []
            return [{"landmarks": [(lm.x, lm.y, lm.z) for lm in face.landmark]} for face in result.multi_face_landmarks]
        except Exception:
            return []
