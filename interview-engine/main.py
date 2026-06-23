"""HireFlow Interview Engine — FastAPI entry point."""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from interview_flow import InterviewFlow
from speech_to_text import transcribe, register_session_resume

app = FastAPI(title="HireFlow Interview Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

flow = InterviewFlow()


class StartReq(BaseModel):
    resumeText: str
    role: str | None = None
    experienceLevel: str | None = "Fresher"
    difficulty: str | None = "Easy"
    interviewType: str | None = "Mixed"


class AnswerReq(BaseModel):
    sessionId: str
    answer: str


class EndReq(BaseModel):
    sessionId: str


@app.post("/api/interview/start")
def start(req: StartReq):
    result = flow.start(req.resumeText, req.role, req.experienceLevel, req.difficulty, req.interviewType)
    # Register resume snippet so Whisper can bias toward proper nouns / tech terms
    register_session_resume(result["session_id"], req.resumeText)
    return {
        "sessionId": result["session_id"],
        "message": result["message"],
        "totalQuestions": result["total_questions"],
    }


@app.post("/api/interview/answer")
def answer(req: AnswerReq):
    result = flow.answer(req.sessionId, req.answer)
    if result.get("status") == 404:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"error": result.get("error", "Session not found")})
    return {"message": result["message"], "done": result.get("done", False)}


@app.post("/api/interview/end")
def end(req: EndReq):
    result = flow.end_early(req.sessionId)
    if result.get("status") == 404:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"error": result.get("error", "Session not found")})
    return {
        "message": result["message"],
        "done": True,
        "answered": result.get("answered", 0),
        "skipped": result.get("skipped", 0),
    }


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), sessionId: str | None = Form(None)):
    data = await audio.read()
    text = transcribe(data, session_id=sessionId)
    return {"text": text}


@app.get("/api/health")
def health():
    return {"ok": True}
