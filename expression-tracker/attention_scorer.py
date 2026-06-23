"""Combines gaze + emotion into a single attention/eye-contact score."""


class AttentionScorer:
    def score(self, gaze: dict, emotion: str) -> dict:
        looking = gaze.get("looking_at_camera", False)
        eye_contact = 90 if looking else max(0, 50 - int(abs(gaze.get("h_offset", 0)) * 200))
        attention = eye_contact - (10 if emotion == "confused" else 0)
        return {"eye_contact": max(0, min(100, eye_contact)), "attention": max(0, min(100, attention))}
