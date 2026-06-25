import os
import sys
import tempfile
import uuid
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INTERVIEW_ENGINE_DIR = os.path.join(BASE_DIR, "interview-engine")

# Ensure correct module loading by prioritizing this directory
if INTERVIEW_ENGINE_DIR in sys.path:
    sys.path.remove(INTERVIEW_ENGINE_DIR)
sys.path.insert(0, INTERVIEW_ENGINE_DIR)

# Remove conflicting modules from sys.modules to force a fresh import
for mod in ['ai_helper', 'question_generator', 'main']:
    if mod in sys.modules:
        del sys.modules[mod]

from interview_flow import InterviewSessionState, InterviewFlowManager
from question_generator import StaticQuestionGenerator
from speech_to_text import SpeechToText

# In-memory store for session states
sessions: Dict[str, Any] = {}

class StartInterviewRequest(BaseModel):
    resume_text: str
    target_role: str
    difficulty: Optional[str] = "medium"
    max_questions: Optional[int] = 10

class NextQuestionRequest(BaseModel):
    session_id: str

class TextAnswerRequest(BaseModel):
    session_id: str
    answer: str

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "interview-engine"}

@router.post("/start")
async def start_interview(req: StartInterviewRequest):
    try:
        print(f"[INTERVIEW_START] Starting new interview session for role: {req.target_role}")
        session_id = str(uuid.uuid4())
        state = InterviewSessionState(
            session_id=session_id,
            target_role=req.target_role,
            resume_text=req.resume_text,
            total_questions=req.max_questions
        )
        flow = InterviewFlowManager(state)
        
        sessions[session_id] = {
            "flow": flow,
            "generator": StaticQuestionGenerator(),
            "stt": SpeechToText()
        }
        
        return {"session_id": session_id, "status": "Interview initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/next-question")
async def get_next_question(req: NextQuestionRequest):
    print(f"[NEXT_QUESTION_REQUEST] Request received for session: {req.session_id}")
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    flow: InterviewFlowManager = session["flow"]
    generator: StaticQuestionGenerator = session["generator"]
    
    if flow.is_complete():
        print(f"[INTERVIEW_COMPLETED] Session {req.session_id} has reached all required questions.")
        print(f"[REPORT_GENERATION] Returning telemetry-only report for session {req.session_id}")
        return {"status": "complete", "report": {"status": "done"}}
        
    q_idx = flow.state.current_question_index
    category = flow.get_current_category()
    
    print(f"[NEXT_QUESTION] Fetching question {q_idx} for session {req.session_id}")
    question = generator.generate_question(q_idx)
        
    flow.add_interviewer_question(question)
    
    print(f"[QUESTION_INDEX] {q_idx}")
    print(f"[NEXT_QUESTION_SENT] Delivering question {q_idx} to client.")
    return {
        "question": question,
        "question_index": q_idx,
        "total_questions": flow.state.total_questions,
        "category": category
    }

@router.post("/text-answer")
async def submit_text_answer(req: TextAnswerRequest):
    print(f"[TEXT_ANSWER_RECEIVED] Session: {req.session_id}")
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    flow: InterviewFlowManager = session["flow"]
    
    if "answers" not in session:
        session["answers"] = []
        
    current_question = ""
    if len(flow.state.chat_history) > 0:
        last_message = flow.state.chat_history[-1]
        if isinstance(last_message, dict):
            current_question = last_message.get("text") or last_message.get("content")
        else:
            current_question = getattr(last_message, "text", getattr(last_message, "content", ""))
            
    session["answers"].append({
        "question": current_question,
        "answer": req.answer
    })
    print("[ANSWER_SAVED]")
    print(f"[QUESTION_SUBMITTED] Session {req.session_id}")
    
    flow.advance_turn()
    
    q_idx = flow.state.current_question_index
    total = flow.state.total_questions
    
    print(f"[QUESTION_INDEX] {q_idx}")
    
    if q_idx > total:
        print("[INTERVIEW_COMPLETE]")
        return {"status": "complete", "report": {"status": "done"}}
    else:
        print("[NEXT_QUESTION]")
        return {"status": "continue"}

@router.post("/speech-to-text")
async def submit_speech_to_text(session_id: str = Form(...), file: UploadFile = File(...)):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    print(f"[STT_REQUEST_RECEIVED] Received audio file {file.filename} for session {session_id}")
    stt: SpeechToText = session["stt"]
    
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        print("[AUDIO_FILE_SAVED] Temporary audio file created.")
            
        transcription = stt.transcribe(tmp_path)
        os.remove(tmp_path)
        print(f"[TRANSCRIPTION_CREATED] {transcription}")
        print(f"[TRANSCRIPTION_RETURNED] Returning transcript to frontend")
        
        return {
            "transcript": transcription
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
