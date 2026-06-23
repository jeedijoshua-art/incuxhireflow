# Interview Engine

Core AI interview orchestrator. Handles the conversation flow, generates resume-aware questions, evaluates candidate answers, and produces the final feedback report.

## Components

| File | Purpose |
|---|---|
| `main.py` | FastAPI entrypoint, exposes REST endpoints |
| `interview_flow.py` | Manages interview state machine (greeting → 15 Qs → feedback) |
| `question_generator.py` | Generates resume-anchored questions using Llama 3.3 70B |
| `candidate_evaluator.py` | Scores each answer (relevance, technical depth, confidence) |
| `feedback_generator.py` | Produces the final structured feedback report |
| `speech_to_text.py` | Wraps Whisper for audio transcription |

## Sub-folders

- `prompts/` — system prompts and few-shot examples
- `services/` — external API clients (Groq, OpenAI fallback)
- `evaluations/` — saved interview transcripts and scores
- `tests/` — unit + integration tests
- `docs/` — architecture diagrams and API specs

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --port 5174
```
