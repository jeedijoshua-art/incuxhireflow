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
from experience_analyzer import ExperienceAnalyzer
from candidate_scorer import CandidateScorer
from job_matcher import JobMatcher
from question_generator import QuestionGenerator

# Define the exact output format requested by the user
class ResumeAnalyzerOutput(BaseModel):
    skills: list[str]
    experience_years: int
    candidate_score: int

def extract_candidate_info(resume_text: str, target_role: str):
    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", resume_text)
    phone_match = re.search(r"(\+?\d[\d\s\-\(\)]{7,}\d)", resume_text)
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    name = None
    stop_words = {"experience", "education", "skills", "summary", "objective", "professional", "project", "contact", "address", "phone", "email", "linkedin", "github"}
    for line in lines[:10]:
        lower = line.lower()
        if email_match and email_match.group(0).lower() in lower:
            continue
        if phone_match and phone_match.group(0).lower() in lower:
            continue
        if any(word in lower for word in stop_words):
            continue
        if 1 < len(line.split()) <= 5 and re.search(r"[A-Z][a-z]+", line):
            name = line
            break
    if not name and lines:
        name = lines[0]

    summary = ""
    summary_lines = [line for line in lines[:6] if line and line != name and (not email_match or email_match.group(0) not in line) and (not phone_match or phone_match.group(0) not in line)]
    if summary_lines:
        summary = " ".join(summary_lines[1:3]).strip()

    return {
        "name": name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "applied_role": target_role,
        "summary": summary or None,
    }


def run_resume_analysis(resume_path: str, target_role: str = "Software Engineer", job_desc_path: str = None):
    # 1. Parse Resume
    print(f"[*] Parsing resume: {resume_path}")
    resume_text = ResumeParser.parse(resume_path)
    print(f"[+] Successfully extracted {len(resume_text)} characters of text.")

    # 2. Extract Skills
    print("[*] Extracting skills...")
    extractor = SkillExtractor()
    skills = extractor.extract_skills(resume_text)
    print(f"[+] Found {len(skills)} skills.")

    # 3. Analyze Experience
    print("[*] Analyzing experience...")
    exp_analyzer = ExperienceAnalyzer()
    exp_result = exp_analyzer.analyze_experience(resume_text)
    exp_years = exp_result.total_experience_years
    print(f"[+] Experience: {exp_years} years.")

    # 4. Score Candidate
    print("[*] Scoring candidate resume...")
    scorer = CandidateScorer()
    score_result = scorer.score_candidate(resume_text, skills, exp_years)
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
    questions = q_generator.generate_questions(resume_text, target_role, skills=skills, experience_years=exp_years)
    print(f"[+] Generated {len(questions)} tailored questions.")

    candidate_info = extract_candidate_info(resume_text, target_role)

    # Format full result
    full_result = {
        "summary": output.model_dump(),
        "candidate_info": candidate_info,
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
