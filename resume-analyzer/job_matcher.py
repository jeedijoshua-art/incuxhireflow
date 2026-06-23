"""Score how well a resume matches a target job description / role."""
import re


# Role → expected core skills (extend as needed)
ROLE_SKILLS = {
    "frontend developer": ["javascript", "react", "css", "html", "typescript"],
    "backend developer": ["python", "node.js", "sql", "postgresql", "rest api"],
    "fullstack developer": ["javascript", "react", "node.js", "sql", "rest api"],
    "data scientist": ["python", "pandas", "numpy", "scikit-learn", "sql"],
    "ml engineer": ["python", "tensorflow", "pytorch", "llm", "fine-tuning"],
    "ai engineer": ["python", "llm", "transformer", "rag", "pytorch"],
    "devops engineer": ["docker", "kubernetes", "aws", "ci/cd", "linux"],
}


def match_job(resume_text: str, role: str) -> dict:
    role_key = (role or "").strip().lower()
    expected = ROLE_SKILLS.get(role_key, [])
    text_lower = (resume_text or "").lower()
    matched = [s for s in expected if re.search(rf"\b{re.escape(s)}\b", text_lower)]
    missing = [s for s in expected if s not in matched]
    pct = round(100 * len(matched) / len(expected)) if expected else 0
    return {
        "role": role,
        "expected_skills": expected,
        "matched": matched,
        "missing": missing,
        "match_percent": pct,
    }
