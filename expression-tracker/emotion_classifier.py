"""Classifies facial emotion from landmarks. Stub — wire a real CNN or use FER."""


CATEGORIES = ["calm", "happy", "tense", "confused", "neutral"]


class EmotionClassifier:
    def classify(self, face: dict) -> str:
        """Currently returns 'neutral' — replace with a real model (FER, DeepFace, ONNX).
        Possible options:
          - HuggingFace `motheecreator/vit-Facial-Expression-Recognition`
          - face_recognition + sklearn classifier on mouth/eye landmarks
          - DeepFace (heavyweight)
        """
        return "neutral"
