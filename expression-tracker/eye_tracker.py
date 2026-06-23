"""Estimates gaze direction from face landmarks. Returns horizontal + vertical offset."""


# MediaPipe face mesh indices for left/right iris (refine_landmarks=True)
LEFT_IRIS = 468
RIGHT_IRIS = 473
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362


class EyeTracker:
    def estimate(self, face: dict) -> dict:
        """Returns {h_offset, v_offset, looking_at_camera}.
        h_offset: -1 (far left) → +1 (far right)
        looking_at_camera: True when |h_offset|<0.15 and |v_offset|<0.15
        """
        lms = face.get("landmarks", [])
        if len(lms) < 478:
            return {"h_offset": 0, "v_offset": 0, "looking_at_camera": False}
        # Iris center relative to inner eye corner — rough gaze proxy
        left_iris = lms[LEFT_IRIS]
        left_corner = lms[LEFT_EYE_INNER]
        h = (left_iris[0] - left_corner[0]) * 10
        v = (left_iris[1] - left_corner[1]) * 10
        looking = abs(h) < 0.15 and abs(v) < 0.15
        return {"h_offset": h, "v_offset": v, "looking_at_camera": looking}
