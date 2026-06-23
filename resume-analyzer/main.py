"""Resume Analyzer — FastAPI service."""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from resume_parser import parse_resume
from skill_extractor import extract_skills
from experience_analyzer import analyze_experience
from job_matcher import match_job
from candidate_scorer import score_candidate
from question_generator import suggest_questions

app = FastAPI(title="HireFlow Resume Analyzer")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.post("/api/resume/parse")
async def parse(resume: UploadFile = File(...)):
    data = await resume.read()
    text = parse_resume(data, filename=resume.filename or "")
    return {"text": text, "length": len(text)}


@app.post("/api/resume/analyze")
async def analyze(resume: UploadFile = File(...), role: str = Form("")):
    data = await resume.read()
    text = parse_resume(data, filename=resume.filename or "")
    skills = extract_skills(text)
    exp = analyze_experience(text)
    match = match_job(text, role) if role else None
    score = score_candidate(skills, exp, match)
    questions = suggest_questions(text, skills, exp)
    return {
        "text": text,
        "skills": skills,
        "experience": exp,
        "match": match,
        "score": score,
        "suggested_questions": questions,
    }


@app.get("/api/health")
def health():
    return {"ok": True}
