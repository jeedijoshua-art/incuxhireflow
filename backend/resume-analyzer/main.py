import os
import re
import sys
import json
import argparse
from pydantic import BaseModel
from dotenv import load_dotenv

# Add current folder to path to allow importing local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from resume_parser import ResumeParser
from skill_extractor import SkillExtractor
from experience_analyzer import ExperienceAnalyzer, ExperienceAnalysisResult, WorkExperienceItem
from candidate_scorer import CandidateScorer, CandidateScoreResult
from job_matcher import JobMatcher
from question_generator import QuestionGenerator, GeneratedQuestion

# Define the exact output format requested by the user
class ResumeAnalyzerOutput(BaseModel):
    skills: list[str]
    experience_years: int
    candidate_score: int

# Common technical and professional skills for rule-based fallback extraction
COMMON_SKILLS = {
    "python", "javascript", "java", "c++", "c#", "go", "rust", "typescript", "ruby", "php",
    "swift", "kotlin", "scala", "r", "matlab", "sql", "nosql", "html", "css", "sass", "less",
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "django", "flask", "fastapi",
    "spring", "express", "node.js", "nodejs", ".net", "laravel", "rails",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "opencv",
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "jenkins", "git",
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle", "dynamodb",
    "graphql", "rest", "api", "microservices", "kafka", "rabbitmq", "celery",
    "linux", "bash", "powershell", "terraform", "ansible", "ci/cd", "devops",
    "machine learning", "deep learning", "nlp", "computer vision", "data analysis",
    "agile", "scrum", "kanban", "jira", "confluence", "leadership", "communication",
    "problem solving", "teamwork", "project management", "product management"
}

_GENERIC_QUESTIONS = [
    "Tell me about yourself and your background in {role}.",
    "What motivated you to apply for this {role} position?",
    "Describe a challenging project you worked on and how you handled it.",
    "What are your strongest technical skills relevant to {role}?",
    "How do you stay updated with the latest technologies and trends?",
    "Tell me about a time you had to debug a difficult issue.",
    "How do you approach learning a new technology or framework?",
    "Describe your experience working in a team environment.",
]


def _fallback_extract_skills(text: str) -> list[str]:
    """Extract skills from resume text using a keyword list when AI is unavailable."""
    if not text:
        return []
    lowered = text.lower()
    found = []
    for skill in COMMON_SKILLS:
        # Use word boundaries for short skills to avoid false matches
        pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"
        if re.search(pattern, lowered):
            found.append(skill.title() if " " in skill else skill.capitalize())
    return found


def _fallback_extract_experience(text: str) -> ExperienceAnalysisResult:
    """Estimate total experience years from common patterns in resume text."""
    if not text:
        return ExperienceAnalysisResult(total_experience_years=0, experiences=[])

    # Look for patterns like "3+ years", "3 years", "3 yrs"
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|year)", text, re.IGNORECASE)
    years_list = [float(y) for y in matches]
    total = int(round(sum(years_list))) if years_list else 0

    # Try to extract role/company/duration lines
    experiences = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        # Simple heuristic: line contains a title-like word and a date/duration
        if re.search(r"\b(20\d{2}|present|current|years?)\b", line, re.IGNORECASE) and len(line) < 120:
            experiences.append(WorkExperienceItem(role=line, company="", duration=line, years=0))

    return ExperienceAnalysisResult(total_experience_years=total, experiences=experiences[:5])


def _fallback_score(text: str, skills: list[str], experience_years: int) -> CandidateScoreResult:
    """Generate a simple score based on resume content when AI is unavailable."""
    score = min(100, max(50, len(skills) * 5 + experience_years * 3 + min(len(text) // 200, 15)))
    breakdown = {
        "skills": min(100, len(skills) * 10),
        "experience": min(100, experience_years * 15),
        "projects": min(100, len(text) // 300),
        "formatting": 70
    }
    explanation = (
        f"Rule-based fallback score. Detected {len(skills)} skills and "
        f"{experience_years} years of experience from the resume."
    )
    return CandidateScoreResult(score=score, breakdown=breakdown, explanation=explanation)


def _fallback_questions(target_role: str) -> list[GeneratedQuestion]:
    """Return generic role-based questions when AI question generation fails."""
    return [
        GeneratedQuestion(
            category="General",
            question_text=q.format(role=target_role),
            expected_topics=["background", "motivation", "communication"]
        )
        for q in _GENERIC_QUESTIONS
    ]


def run_resume_analysis(resume_path: str, target_role: str = "Software Engineer", job_desc_path: str = None):
    # 1. Parse Resume
    print(f"[*] Parsing resume: {resume_path}")
    try:
        resume_text = ResumeParser.parse(resume_path)
    except Exception as e:
        print(f"[!] Resume parsing failed: {e}. Attempting raw text fallback.")
        # Last resort: read raw bytes as text
        try:
            with open(resume_path, "r", encoding="utf-8", errors="ignore") as f:
                resume_text = f.read()
        except Exception:
            resume_text = ""
    print(f"[+] Successfully extracted {len(resume_text)} characters of text.")

    if not resume_text.strip():
        raise ValueError("Could not extract any readable text from the uploaded resume. Please upload a PDF or DOCX with selectable text.")

    # 2. Extract Skills
    print("[*] Extracting skills...")
    extractor = SkillExtractor()
    skills = extractor.extract_skills(resume_text)
    if not skills:
        print("[*] Using rule-based skill extraction fallback.")
        skills = _fallback_extract_skills(resume_text)
    print(f"[+] Found {len(skills)} skills.")

    # 3. Analyze Experience
    print("[*] Analyzing experience...")
    exp_analyzer = ExperienceAnalyzer()
    exp_result = exp_analyzer.analyze_experience(resume_text)
    if not exp_result.experiences and exp_result.total_experience_years == 0:
        print("[*] Using rule-based experience extraction fallback.")
        exp_result = _fallback_extract_experience(resume_text)
    exp_years = exp_result.total_experience_years
    print(f"[+] Experience: {exp_years} years.")

    # 4. Score Candidate
    print("[*] Scoring candidate resume...")
    scorer = CandidateScorer()
    score_result = scorer.score_candidate(resume_text, skills, exp_years)
    if score_result.score == 70 and score_result.explanation == "Fallback score due to calculation error.":
        print("[*] Using rule-based scoring fallback.")
        score_result = _fallback_score(resume_text, skills, exp_years)
    candidate_score = score_result.score
    print(f"[+] Candidate Score: {candidate_score}")

    # Build primary output format
    output = ResumeAnalyzerOutput(
        skills=skills,
        experience_years=exp_years,
        candidate_score=candidate_score
    )

    # 5. Optional Job Matcher
    match_result = None
    if job_desc_path and os.path.exists(job_desc_path):
        print(f"[*] Matching candidate against job description: {job_desc_path}")
        with open(job_desc_path, "r", encoding="utf-8") as f:
            jd_text = f.read()
        matcher = JobMatcher()
        match_result = matcher.match_job(resume_text, jd_text)
        print(f"[+] Match score: {match_result.match_percentage}%")

    # 6. Optional Question Generation
    print("[*] Generating tailored interview questions...")
    q_generator = QuestionGenerator()
    questions = q_generator.generate_questions(resume_text, target_role)
    if not questions:
        print("[*] Using generic question fallback.")
        questions = _fallback_questions(target_role)
    print(f"[+] Generated {len(questions)} tailored questions.")

    # Format full result
    full_result = {
        "summary": output.model_dump(),
        "raw_text": resume_text,
        "detailed_experience": [exp.model_dump() for exp in exp_result.experiences],
        "detailed_score": score_result.model_dump(),
        "questions": [q.model_dump() for q in questions]
    }
    if match_result:
        full_result["job_match"] = match_result.model_dump()

    return full_result

def main():
    parser = argparse.ArgumentParser(description="HireFlow Resume Analyzer CLI")
    parser.add_argument("--resume", type=str, required=True, help="Path to resume file (PDF or TXT)")
    parser.add_argument("--role", type=str, default="Software Engineer", help="Target job role")
    parser.add_argument("--jd", type=str, default=None, help="Path to target Job Description text file")
    args = parser.parse_args()

    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

    try:
        results = run_resume_analysis(args.resume, args.role, args.jd)
        print("\n" + "="*50)
        print("RESUME ANALYSIS SUMMARY OUTPUT (Strict Output Example Format):")
        print("="*50)
        print(json.dumps(results["summary"], indent=2))
        
        print("\n" + "="*50)
        print("FULL ANALYSIS METADATA (FastAPI Ready Payload):")
        print("="*50)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"\n[!] Error during execution: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
