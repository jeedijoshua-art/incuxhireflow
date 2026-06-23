"""Extract technical skills, frameworks, languages from resume text."""
import re


# Curated skill keywords. Extend or load from models/skills.json.
SKILL_KEYWORDS = {
    "languages": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "sql"],
    "frameworks": ["react", "vue", "angular", "next.js", "express", "fastapi", "django", "flask", "spring", "rails", "laravel", "node.js", "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy"],
    "cloud": ["aws", "gcp", "azure", "ec2", "s3", "lambda", "cloud functions", "kubernetes", "docker"],
    "databases": ["mysql", "postgresql", "mongodb", "redis", "sqlite", "dynamodb", "cassandra", "elasticsearch"],
    "ml_ai": ["llm", "gpt", "bert", "transformer", "nlp", "computer vision", "rag", "embedding", "fine-tuning"],
    "tools": ["git", "github", "gitlab", "jira", "jenkins", "ci/cd", "linux", "vim"],
}


def extract_skills(text: str) -> dict:
    text_lower = (text or "").lower()
    found = {}
    for category, keywords in SKILL_KEYWORDS.items():
        hits = [kw for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", text_lower)]
        if hits:
            found[category] = hits
    return found
