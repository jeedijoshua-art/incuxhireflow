# Expression Tracker

Optional webcam-based service that tracks facial expression, eye contact,
and emotion during the interview. Provides real-time signals to the live
telemetry panel (Communication / Confidence / **Eye Contact**).

> ⚠ Currently **not wired into the main app** — Eye Contact in the live telemetry
> shows N/A because this service is not running by default. Run this microservice
> to enable real Eye Contact tracking.

## Components

| File | Purpose |
|---|---|
| `main.py` | FastAPI WebSocket server — accepts video frames, returns signals |
| `face_detector.py` | MediaPipe face mesh wrapper |
| `eye_tracker.py` | Pupil + gaze direction estimation |
| `emotion_classifier.py` | Emotion recognition (happy/calm/tense/confused) |
| `attention_scorer.py` | Combines gaze + head pose → attention score |

## Sub-folders
- `models/` — pretrained MediaPipe / face emotion models
- `services/` — utility WebSocket/auth helpers
- `tests/` — fixture-based tests with sample frames
- `docs/` — signal definitions

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --port 5175
```

Then in the frontend, enable the "Expression Tracker" toggle (currently
hidden behind a feature flag).
