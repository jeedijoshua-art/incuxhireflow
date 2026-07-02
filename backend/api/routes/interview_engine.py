import os
import copy
import sys
import tempfile
import uuid
import time
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INTERVIEW_ENGINE_DIR = os.path.join(BASE_DIR, "interview-engine")

# Ensure correct module loading by prioritizing this directory
if INTERVIEW_ENGINE_DIR in sys.path:
    sys.path.remove(INTERVIEW_ENGINE_DIR)
sys.path.insert(0, INTERVIEW_ENGINE_DIR)

SERVICES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "services")
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

# Remove conflicting modules from sys.modules to force a fresh import

from interview_flow import InterviewSessionState, InterviewFlowManager
from question_generator import QuestionGenerator
from speech_to_text import SpeechToText
from candidate_evaluator import CandidateEvaluator
from feedback_generator import FeedbackGenerator
from in_memory_services import QuestionService, TemplateService, PlatformConfigurationService
import random

def _select_questions(questions: List[Dict], template: Dict) -> List[Dict]:
    req_cat = {
        "HR": template.get("hrQuestions", 0),
        "Technical": template.get("technicalQuestions", 0),
        "Behavioral": template.get("behavioralQuestions", 0)
    }
    req_diff = {
        "Easy": template.get("easyQuestions", 0),
        "Medium": template.get("mediumQuestions", 0),
        "Hard": template.get("hardQuestions", 0)
    }
    
    total_needed = sum(req_cat.values())
    total_diff = sum(req_diff.values())
    if total_needed != total_diff:
        return None # Invalid template configuration
        
    pool = list(questions)
    random.shuffle(pool)
    selected = []
    
    def backtrack(index: int, curr_cat: Dict, curr_diff: Dict):
        if len(selected) == total_needed:
            return all(curr_cat[k] == req_cat[k] for k in req_cat) and all(curr_diff[k] == req_diff[k] for k in curr_diff)
            
        if index >= len(pool):
            return False
            
        q = pool[index]
        cat = q.get("category", "")
        if cat not in ["HR", "Technical", "Behavioral"]:
            cat = "Technical" # Fallback mapping
            
        diff = q.get("difficulty", "Medium")
        
        if curr_cat.get(cat, 0) < req_cat.get(cat, 0) and curr_diff.get(diff, 0) < req_diff.get(diff, 0):
            selected.append(q)
            curr_cat[cat] = curr_cat.get(cat, 0) + 1
            curr_diff[diff] = curr_diff.get(diff, 0) + 1
            
            if backtrack(index + 1, curr_cat, curr_diff):
                return True
                
            selected.pop()
            curr_cat[cat] -= 1
            curr_diff[diff] -= 1
            
        return backtrack(index + 1, curr_cat, curr_diff)
        
    if backtrack(0, {"HR": 0, "Technical": 0, "Behavioral": 0}, {"Easy": 0, "Medium": 0, "Hard": 0}):
        return selected
    return None

# In-memory store for session states
sessions: Dict[str, Any] = {}

class StartInterviewRequest(BaseModel):
    resume_text: str
    target_role: str
    difficulty: Optional[str] = "medium"
    max_questions: Optional[int] = 10
    generated_questions: Optional[List[Any]] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    interview_mode: Optional[str] = "recruiter"

class NextQuestionRequest(BaseModel):
    session_id: str

class TextAnswerRequest(BaseModel):
    session_id: str
    answer: str

class TelemetryRequest(BaseModel):
    session_id: str
    telemetry: Dict[str, Any]
    transcript: str
    warnings: Optional[List[str]] = []
    latest_frame: Optional[str] = None

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
        active_config = copy.deepcopy(PlatformConfigurationService.get_config())
        
        mode = req.interview_mode or "recruiter"
        
        if mode == "resume-ai":
            if not req.generated_questions or len(req.generated_questions) == 0:
                print(f"[HTTP_400_DEBUG] Validation Failed: No generated questions provided for Resume AI interview.")
                print(f"[HTTP_400_DEBUG] Requested Role: {req.target_role}")
                print(f"[HTTP_400_DEBUG] Interview Type: {mode}")
                print(f"[HTTP_400_DEBUG] Generated Questions Received: {req.generated_questions}")
                print(f"[HTTP_400_DEBUG] Request Body: {req.json()}")
                raise HTTPException(status_code=400, detail="No generated questions provided for Resume AI interview.")
                
            resume_questions = req.generated_questions
            flow.state.total_questions = len(req.generated_questions)
            
            # Unify questions format
            unified_questions = []
            for q in req.generated_questions:
                if isinstance(q, dict):
                    unified_questions.append({
                        "question": q.get("question_text", q.get("question", "")),
                        "metadata": q
                    })
                else:
                    unified_questions.append({"question": str(q), "metadata": {}})
            
            sessions[session_id] = {
                "flow": flow,
                "stt": SpeechToText(),
                "evaluator": CandidateEvaluator(),
                "feedback_gen": FeedbackGenerator(),
                "questions": unified_questions,
                "interview_mode": "resume-ai",
                "candidate_name": req.candidate_name or "Unknown Candidate",
                "candidate_email": req.candidate_email or "unknown@example.com",
                "start_time": time.time(),
                "live_telemetry": {},
                "live_transcript": "",
                "live_warnings": [],
                "live_frame": None,
                "config": active_config
            }
            print("[SESSION] Resume questions stored.")
            print(f"[SESSION] Loaded {len(unified_questions)} questions.")
            print("[INTERVIEW_MODE] resume-ai")
            
        elif mode == "recruiter":
            # 1. Fetch Question Bank
            db_questions = QuestionService.get_all()
            if not db_questions:
                raise HTTPException(status_code=400, detail="Question Bank is empty.")
                
            active_questions = [q for q in db_questions if q.get("isEnabled", True)]
            if not active_questions:
                raise HTTPException(status_code=400, detail="No active questions exist in the Question Bank.")
                
            # Sort by question_index ascending
            active_questions.sort(key=lambda x: int(x.get("question_index", 0)))
            
            # Unify questions format
            unified_questions = []
            for q in active_questions:
                unified_questions.append({
                    "question": q["question"],
                    "metadata": q
                })
            
            print("="*50)
            print("Recruiter Interview Started")
            print(f"Questions Loaded: {len(unified_questions)}")
            print(f"Question IDs: {[q.get('id') for q in active_questions]}")
            print(f"Question Order: {[q.get('question_index') for q in active_questions]}")
            print("="*50)
            
            flow.state.total_questions = len(unified_questions)
            
            sessions[session_id] = {
                "flow": flow,
                "stt": SpeechToText(),
                "evaluator": CandidateEvaluator(),
                "feedback_gen": FeedbackGenerator(),
                "interview_mode": "recruiter",
                "questions": unified_questions,
                "candidate_name": req.candidate_name or "Unknown Candidate",
                "candidate_email": req.candidate_email or "unknown@example.com",
                "start_time": time.time(),
                "live_telemetry": {},
                "live_transcript": "",
                "live_warnings": [],
                "live_frame": None,
                "config": active_config
            }
            print("[SESSION] Recruiter questions loaded from Question Bank.")
            print("[INTERVIEW_MODE] recruiter")
            
        else:
            print(f"[HTTP_400_DEBUG] Validation Failed: Invalid interview mode '{mode}'.")
            print(f"[HTTP_400_DEBUG] Requested Role: {req.target_role}")
            print(f"[HTTP_400_DEBUG] Interview Type: {mode}")
            print(f"[HTTP_400_DEBUG] Request Body: {req.json()}")
            raise HTTPException(status_code=400, detail="Invalid interview mode.")
        
        return {"session_id": session_id, "status": "Interview initialized", "config": active_config}
    except HTTPException:
        raise
    except Exception:
        import traceback
        traceback.print_exc()
        raise

@router.post("/next-question")
async def get_next_question(req: NextQuestionRequest):
    print(f"[NEXT_QUESTION_REQUEST] Request received for session: {req.session_id}")
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    flow: InterviewFlowManager = session["flow"]
    
    if flow.is_complete():
        print(f"[INTERVIEW_COMPLETED] Session {req.session_id} has reached all required questions.")
        
        # Generate final report
        feedback_gen = session.get("feedback_gen")
        evaluations = session.get("evaluations", [])
        chat_history = flow.state.chat_history
        target_role = flow.state.target_role
        final_report = None
        if feedback_gen and chat_history:
            print("[REPORT_GENERATION] Running AI FeedbackGenerator...")
            final_report_obj = feedback_gen.generate_feedback(target_role, chat_history, evaluations)
            final_report = final_report_obj.model_dump()
            final_report["evaluations"] = evaluations
            final_report["questions"] = session.get("questions", [])
        else:
            print(f"[REPORT_GENERATION] Returning telemetry-only report for session {req.session_id}")
            final_report = {"status": "done", "evaluations": evaluations, "questions": session.get("questions", [])}

        
        # Cleanup session
        if req.session_id in sessions:
            del sessions[req.session_id]
            
        return {"status": "complete", "report": final_report}
        
    q_idx = flow.state.current_question_index
    category = flow.get_current_category()
    
    print(f"[NEXT_QUESTION] Fetching question {q_idx} for session {req.session_id}")
    
    questions = session.get("questions", [])
    if q_idx - 1 < len(questions):
        question_obj = questions[q_idx - 1]
        question_text = question_obj["question"]
    else:
        question_text = "No more questions."
        
    print("="*50)
    print(f"Current Index: {q_idx}")
    print(f"Current Question: {question_text}")
    print("="*50)
        
    flow.add_interviewer_question(question_text)
    
    print(f"[QUESTION_INDEX] {q_idx}")
    print(f"[NEXT_QUESTION_SENT] Delivering question {q_idx} to client.")
    return {
        "question": question_text,
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
    if "evaluations" not in session:
        session["evaluations"] = []
        
    current_question = ""
    metadata = {}
    
    q_idx = flow.state.current_question_index
    questions = session.get("questions", [])
    if q_idx - 1 < len(questions):
        question_obj = questions[q_idx - 1]
        current_question = question_obj.get("question", "")
        metadata = question_obj.get("metadata", {})
        
    session["answers"].append({
        "question": current_question,
        "answer": req.answer
    })
    
    evaluator = session.get("evaluator")
    if evaluator and current_question:
        try:
            print("[EVALUATOR] Running CandidateEvaluator on answer...")
            evaluation_obj = evaluator.evaluate_answer(current_question, req.answer, metadata, flow.state.target_role)
            eval_dict = evaluation_obj.model_dump()
            
            # Pull latest telemetry and embed it
            telemetry = session.get("live_telemetry", {})
            conf = telemetry.get("confidence", 75)
            att = telemetry.get("attention", 75)
            eye = telemetry.get("eyeContact", 75)
            eval_dict["telemetry_score"] = round((conf + att + eye) / 3)
            
            session["evaluations"].append(eval_dict)
            print("[EVALUATOR] Evaluation saved.")
        except Exception as e:
            print(f"[EVALUATOR] Failed to evaluate answer: {e}")

    print("[ANSWER_SAVED]")
    print(f"[QUESTION_SUBMITTED] Session {req.session_id}")
    
    flow.advance_turn()
    
    total = flow.state.total_questions
    
    print(f"[QUESTION_INDEX] flow.state.current_question_index = {flow.state.current_question_index}")
    
    if flow.state.current_question_index > total:
        print("[INTERVIEW_COMPLETE]")
        
        feedback_gen = session.get("feedback_gen")
        evaluations = session.get("evaluations", [])
        chat_history = flow.state.chat_history
        target_role = flow.state.target_role
        final_report = None
        if feedback_gen and chat_history:
            print("[REPORT_GENERATION] Running AI FeedbackGenerator...")
            final_report_obj = feedback_gen.generate_feedback(target_role, chat_history, evaluations)
            final_report = final_report_obj.model_dump()
            final_report["evaluations"] = evaluations
            final_report["questions"] = session.get("questions", [])
        else:
            print(f"[REPORT_GENERATION] Returning telemetry-only report for session {req.session_id}")
            final_report = {"status": "done", "evaluations": evaluations, "questions": session.get("questions", [])}

            
        # Cleanup session
        if req.session_id in sessions:
            del sessions[req.session_id]
            
        return {"status": "complete", "report": final_report}
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

@router.post("/telemetry")
async def receive_telemetry(req: TelemetryRequest):
    session = sessions.get(req.session_id)
    if not session:
        # Ignore gracefully if session is already completed or invalid
        return {"status": "ignored"}
        
    session["live_telemetry"] = req.telemetry
    session["live_transcript"] = req.transcript
    session["live_warnings"] = req.warnings or []
    if req.latest_frame:
        session["live_frame"] = req.latest_frame
        
    return {"status": "ok"}
