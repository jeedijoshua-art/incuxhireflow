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
from candidate_evaluator import CandidateEvaluator
from feedback_generator import FeedbackGenerator

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

class EndInterviewRequest(BaseModel):
    session_id: str
    answer: Optional[str] = None

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
            "stt": SpeechToText(),
            "evaluator": CandidateEvaluator(),
            "feedback": FeedbackGenerator()
        }
        
        # Prune old sessions (keep only the most recent 20) to prevent memory leaks
        # and ensure stale session state never bleeds into new interviews
        if len(sessions) > 20:
            oldest_keys = list(sessions.keys())[:-20]
            for old_key in oldest_keys:
                del sessions[old_key]
                print(f"[SESSION_PRUNED] Removed stale session: {old_key}")
        
        print(f"[SESSION_CREATED] {session_id} | Active sessions: {len(sessions)}")
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
        print(f"[REPORT_GENERATION] Generating final feedback report...")
        
        feedback_gen: FeedbackGenerator = session["feedback"]
        try:
            # Convert question turns to dict
            q_turns_dict = [qt.model_dump() for qt in flow.state.question_turns]
            
            report = feedback_gen.generate_feedback(
                target_role=flow.state.target_role,
                chat_history=flow.state.chat_history,
                evaluations=flow.state.evaluations,
                question_turns=q_turns_dict
            )
            return {"status": "complete", "report": report.model_dump()}
        except Exception as e:
            print(f"Report generation error: {e}")
            return {"status": "complete", "report": {"status": "error", "detail": str(e)}}
        
    q_idx = flow.state.current_question_index
    category = flow.get_current_category()
    
    print(f"[NEXT_QUESTION] Fetching question {q_idx} for session {req.session_id}")
    question_obj = generator.generate_question(q_idx)
        
    flow.add_interviewer_question(question_obj.question, question_obj.expected_answer)
    
    print(f"[QUESTION_INDEX] {q_idx}")
    print(f"[NEXT_QUESTION_SENT] Delivering question {q_idx} to client.")
    return {
        "question": question_obj.question,
        "expected_answer": question_obj.expected_answer,
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
    evaluator: CandidateEvaluator = session["evaluator"]
    
    if "answers" not in session:
        session["answers"] = []
        
    current_turn = None
    expected_answer = ""
    if flow.state.question_turns:
        current_turn = flow.state.question_turns[-1]
        expected_answer = current_turn.expected_answer
        current_question_text = current_turn.question
            
    session["answers"].append({
        "question": current_question_text,
        "answer": req.answer
    })
    print("[ANSWER_SAVED]")
    print(f"[QUESTION_SUBMITTED] Session {req.session_id}")
    
    flow.add_candidate_answer(req.answer)
    
    # Evaluate the answer - explicitly handle empty/skipped answers per question
    try:
        if current_turn:
            # If no answer given, explicitly mark as skipped with zero scores
            # This prevents ANY previous session data from contaminating the score
            if not req.answer or req.answer.strip() == "":
                from candidate_evaluator import AnswerEvaluation
                evaluation = AnswerEvaluation(
                    communication=0,
                    technical_accuracy=0,
                    confidence=0,
                    explanation="Question was skipped - no answer provided.",
                    expected_answer_match="Not attempted",
                    expected_answer=expected_answer
                )
                flow.record_evaluation(evaluation.model_dump())
                print(f"[EVALUATION_SKIPPED] Question {len(flow.state.question_turns)} was skipped")
            else:
                evaluation = evaluator.evaluate_answer(
                    question=current_turn.question,
                    answer=req.answer,
                    expected_answer=expected_answer,
                    target_role=flow.state.target_role
                )
                flow.record_evaluation(evaluation.model_dump())
                print(f"[EVALUATION_COMPLETED] Question {len(flow.state.question_turns)}")
    except Exception as e:
        print(f"Evaluation error: {e}")
    
    flow.advance_turn()
    
    q_idx = flow.state.current_question_index
    total = flow.state.total_questions
    
    print(f"[QUESTION_INDEX] {q_idx}")
    
    if q_idx > total:
        print("[INTERVIEW_COMPLETE]")
        # Generate final report
        feedback_gen: FeedbackGenerator = session["feedback"]
        try:
            # Convert question turns to dict
            q_turns_dict = [qt.model_dump() for qt in flow.state.question_turns]
            
            report = feedback_gen.generate_feedback(
                target_role=flow.state.target_role,
                chat_history=flow.state.chat_history,
                evaluations=flow.state.evaluations,
                question_turns=q_turns_dict
            )
            return {"status": "complete", "report": report.model_dump()}
        except Exception as e:
            print(f"Report generation error: {e}")
            return {"status": "complete", "report": {"status": "error", "detail": str(e)}}
    else:
        print("[NEXT_QUESTION]")
        return {"status": "continue"}

@router.post("/end")
async def end_interview(req: EndInterviewRequest):
    print(f"[END_INTERVIEW_REQUEST] Session: {req.session_id}")
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    flow: InterviewFlowManager = session["flow"]
    evaluator: CandidateEvaluator = session["evaluator"]
    
    # Process final answer if provided and there is a pending question
    if req.answer is not None and flow.state.question_turns:
        current_turn = flow.state.question_turns[-1]
        expected_answer = current_turn.expected_answer
        
        # Only evaluate if not already evaluated
        if current_turn.candidate_answer == "":
            flow.add_candidate_answer(req.answer)
            try:
                if not req.answer or req.answer.strip() == "":
                    from candidate_evaluator import AnswerEvaluation
                    evaluation = AnswerEvaluation(
                        communication=0,
                        technical_accuracy=0,
                        confidence=0,
                        explanation="Question was skipped - no answer provided.",
                        expected_answer_match="Not attempted",
                        expected_answer=expected_answer
                    )
                    flow.record_evaluation(evaluation.model_dump())
                    print(f"[EVALUATION_SKIPPED] Question {len(flow.state.question_turns)} was skipped on early end")
                else:
                    evaluation = evaluator.evaluate_answer(
                        question=current_turn.question,
                        answer=req.answer,
                        expected_answer=expected_answer,
                        target_role=flow.state.target_role
                    )
                    flow.record_evaluation(evaluation.model_dump())
                    print(f"[EVALUATION_COMPLETED] Question {len(flow.state.question_turns)} on early end")
            except Exception as e:
                print(f"Evaluation error on early end: {e}")
                
            flow.advance_turn()
            
    # Generate and skip remaining unattempted questions
    generator: StaticQuestionGenerator = session["generator"]
    while len(flow.state.question_turns) < flow.state.total_questions:
        q_idx = flow.state.current_question_index
        if q_idx > flow.state.total_questions:
            break
            
        question_obj = generator.generate_question(q_idx)
        flow.add_interviewer_question(question_obj.question, question_obj.expected_answer)
        
        from candidate_evaluator import AnswerEvaluation
        evaluation = AnswerEvaluation(
            communication=0,
            technical_accuracy=0,
            confidence=0,
            explanation="Question was not attempted because the interview was ended early.",
            expected_answer_match="Not attempted",
            expected_answer=question_obj.expected_answer
        )
        flow.record_evaluation(evaluation.model_dump())
        print(f"[EVALUATION_SKIPPED] Unattempted Question {len(flow.state.question_turns)} was skipped")
        flow.advance_turn()
            
    # Generate final report
    feedback_gen: FeedbackGenerator = session["feedback"]
    try:
        q_turns_dict = [qt.model_dump() for qt in flow.state.question_turns]
        
        report = feedback_gen.generate_feedback(
            target_role=flow.state.target_role,
            chat_history=flow.state.chat_history,
            evaluations=flow.state.evaluations,
            question_turns=q_turns_dict
        )
        return {"status": "complete", "report": report.model_dump()}
    except Exception as e:
        print(f"Report generation error: {e}")
        return {"status": "complete", "report": {"status": "error", "detail": str(e)}}

@router.post("/speech-to-text")
async def submit_speech_to_text(session_id: str = Form(...), file: UploadFile = File(...)):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    print(f"[STT_REQUEST_RECEIVED] Received audio file {file.filename} for session {session_id}")
    stt: SpeechToText = session["stt"]

    if not stt.client:
        raise HTTPException(
            status_code=503,
            detail="Server-side speech-to-text is not configured. Add GROQ_API_KEY to a backend .env file, or use the browser's built-in microphone which works automatically."
        )

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
        print(f"[STT_EXCEPTION] {e}")
        raise HTTPException(status_code=500, detail=str(e))
