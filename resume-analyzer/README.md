# Resume Analyzer

Parses resumes (PDF / DOCX / TXT), extracts skills + experience, matches against
target role, and produces a candidate score. Standalone microservice — can be
called by the interview-engine OR used independently for batch screening.

## Components

| File | Purpose |
|---|---|
| `main.py` | FastAPI entrypoint |
| `resume_parser.py` | PDF/DOCX → plain text (pdf-plumber + python-docx) |
| `skill_extractor.py` | NER + keyword matching for tech skills |
| `experience_analyzer.py` | Computes years of experience, seniority level |
| `job_matcher.py` | Scores resume against a job description |
| `candidate_scorer.py` | Aggregates skill + experience + match into final score |
| `question_generator.py` | Suggests resume-specific questions for interviewers |

## Sub-folders
- `parsers/` — format-specific parsers (PDF, DOCX, TXT)
- `models/` — ML models / regex rule sets for skill extraction
- `outputs/` — saved analysis JSON
- `tests/` — unit tests
- `docs/` — schema + algorithm explainers
