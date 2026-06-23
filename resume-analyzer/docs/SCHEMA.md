# Resume Analyzer Output Schema

```json
{
  "text": "...",
  "skills": {
    "languages": ["python", "javascript"],
    "frameworks": ["react", "fastapi"],
    "cloud": ["aws"],
    "databases": ["postgresql"]
  },
  "experience": {
    "estimated_years": 2,
    "seniority": "Junior",
    "internships": 1,
    "projects": 3
  },
  "match": {
    "role": "AI Engineer",
    "expected_skills": ["python", "llm", "transformer", "rag", "pytorch"],
    "matched": ["python", "llm"],
    "missing": ["transformer", "rag", "pytorch"],
    "match_percent": 40
  },
  "score": {
    "skill_score": 60,
    "experience_score": 24,
    "match_score": 40,
    "final_score": 43,
    "verdict": "Possible fit"
  }
}
```
