# HireFlow

AI-powered interview preparation platform. Upload a resume → AI conducts a voice-based interview tailored to that resume → get a comprehensive feedback report.

## Architecture

```
hireflow/
├── frontend/                       React + Vite SPA (port 5173)
├── backend/
│   ├── interview-engine/           Python FastAPI (port 5174)
│   │   ├── main.py                 API entry point
│   │   ├── interview_flow.py       15-question state machine
│   │   ├── question_generator.py   Resume-anchored question generation (Groq Llama 3.3 70B)
│   │   ├── candidate_evaluator.py  Per-answer evaluation
│   │   ├── feedback_generator.py   Final structured feedback report
│   │   ├── speech_to_text.py       Groq Whisper + Llama spelling cleanup
│   │   ├── prompts/                System prompts
│   │   ├── services/groq_client.py Groq API wrapper with retry + fallback
│   │   ├── evaluations/            Scoring logic
│   │   ├── docs/  tests/
│   │   ├── requirements.txt
│   │   └── OWNER.md  README.md
│   │
│   ├── resume-analyzer/            Python FastAPI (port 5175)
│   │   ├── main.py
│   │   ├── resume_parser.py        Routes PDF/DOCX/text to format-specific parsers
│   │   ├── parsers/                pdf_parser.py + docx_parser.py
│   │   ├── skill_extractor.py
│   │   ├── experience_analyzer.py
│   │   ├── candidate_scorer.py
│   │   ├── job_matcher.py
│   │   ├── question_generator.py   Suggests interview questions from resume
│   │   ├── models/  outputs/  docs/  tests/
│   │   ├── requirements.txt
│   │   └── OWNER.md  README.md
│   │
│   └── legacy-node/                Original Node.js backend (preserved for reference)
│
└── expression-tracker/             Future module: eye contact + emotion detection
```

## Quick start

### 1. Backend services (Python 3.11+)
```bash
# Interview engine
cd backend/interview-engine
pip install -r requirements.txt
cp .env.example .env       # then add GROQ_API_KEY
python -m uvicorn main:app --port 5174

# Resume analyzer (separate terminal)
cd backend/resume-analyzer
pip install -r requirements.txt
cp .env.example .env       # then add GROQ_API_KEY
python -m uvicorn main:app --port 5175
```

### 2. Frontend (Node 18+)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Required API keys
- **GROQ_API_KEY** — free at https://console.groq.com/keys (powers Whisper + Llama 3.3)

## Features
- Voice-first interview UX (Web Speech API + browser TTS personas)
- Resume parsing: PDF (pdfplumber + pypdf fallback), DOCX (python-docx), TXT
- 15 unique questions, all anchored to resume content
- Self-intro 7-point coverage check
- Off-resume / off-topic answer detection
- Live telemetry: Communication & Confidence from real voice signals
- Printable PDF feedback report (11 sections)
- Early-end with partial feedback

## Stack
- **Frontend:** React 18, Vite, Web Speech API, MediaRecorder
- **Backend:** Python 3.11, FastAPI, Uvicorn
- **AI:** Groq Llama 3.3 70B (interview brain) + Whisper Large v3 (STT) + Llama 3.1 8B (typo cleanup)
- **Parsing:** pdfplumber, pypdf, python-docx

## API endpoints

### interview-engine (:5174)
- `POST /api/interview/start` → `{sessionId, message, totalQuestions}`
- `POST /api/interview/answer` → `{message, done}`
- `POST /api/interview/end` → `{message, done, answered, skipped}`
- `POST /api/transcribe` → `{text}`
- `GET /api/health`

### resume-analyzer (:5175)
- `POST /api/resume/parse` → `{text, length}`
- `POST /api/resume/analyze` → `{text, skills, experience, match, score, suggested_questions}`
- `GET /api/health`
