# Interview Engine Architecture

```
Client ──HTTP──▶ FastAPI (main.py)
                   │
                   ├── /start  → InterviewFlow.start
                   ├── /answer → InterviewFlow.answer
                   ├── /end    → InterviewFlow.end_early
                   └── /transcribe → speech_to_text.transcribe
                              │
                              ▼
                       ┌────────────────────────┐
                       │ Groq Cloud             │
                       │  Whisper Large v3      │
                       │  Llama 3.3 70B         │
                       └────────────────────────┘
```

## Session lifecycle
1. `/start` creates session, returns first question
2. Each `/answer` updates history, optionally bumps real_answer count
3. At 15 real answers OR `/end` → feedback generator runs
4. Session persists in memory (could swap to Redis/Postgres)

## Modules and Responsibilities
- **interview_flow** — state machine
- **question_generator** — turn-by-turn question prompts
- **candidate_evaluator** — per-answer scoring signals
- **feedback_generator** — final report
- **speech_to_text** — Whisper API wrapper
- **services/groq_client** — common Groq HTTP client
- **prompts/** — pure functions returning prompt strings
