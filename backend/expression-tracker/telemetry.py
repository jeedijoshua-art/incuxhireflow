import time
import json
from collections import Counter
from dataclasses import dataclass
from typing import List

@dataclass
class TrackerResult:
    face_detected: bool
    emotion: str
    confidence_score: int
    attention_score: int
    eye_contact_score: int
    timestamp: float

class TelemetryManager:
    def __init__(self):
        self.history: List[TrackerResult] = []

    def add_result(self, result: TrackerResult):
        self.history.append(result)

    def get_recent_history(self, duration_sec: float) -> List[TrackerResult]:
        current_time = time.time()
        # Clean up old history to prevent memory leak
        self.history = [r for r in self.history if current_time - r.timestamp <= duration_sec * 2]
        return [r for r in self.history if current_time - r.timestamp <= duration_sec]

class ReportGenerator:
    def __init__(self, telemetry_manager: TelemetryManager, report_interval: float = 5.0):
        self.telemetry_manager = telemetry_manager
        self.last_report_time = time.time()
        self.report_interval = report_interval

    def generate_summary(self):
        current_time = time.time()
        if current_time - self.last_report_time >= self.report_interval:
            recent_data = self.telemetry_manager.get_recent_history(self.report_interval)
            self.last_report_time = current_time
            
            if not recent_data:
                return None
            
            avg_confidence = int(sum(r.confidence_score for r in recent_data) / len(recent_data))
            avg_attention = int(sum(r.attention_score for r in recent_data) / len(recent_data))
            avg_eye_contact = int(sum(r.eye_contact_score for r in recent_data) / len(recent_data))
            
            emotions = [r.emotion for r in recent_data]
            dominant_emotion = Counter(emotions).most_common(1)[0][0] if emotions else "Neutral"
            
            report = {
                "avg_confidence": avg_confidence,
                "avg_attention": avg_attention,
                "dominant_emotion": dominant_emotion,
                "eye_contact": avg_eye_contact
            }
            return report
        return None
