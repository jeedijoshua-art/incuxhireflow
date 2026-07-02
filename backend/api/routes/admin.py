from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Dict, Any, List
import sys
import os
import uuid

# Add services directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.join(BASE_DIR, "services") not in sys.path:
    sys.path.insert(0, os.path.join(BASE_DIR, "services"))

from in_memory_services import (
    UserService,
    SessionService,
    QuestionService,
    TemplateService,
    ReportService,
    AnalyticsService,
    PlatformConfigurationService
)

import time
from routes.interview_engine import sessions

router = APIRouter()

# --- Auth / User Management ---

@router.post("/auth/login")
def login(user_data: Dict[str, Any]):
    user = UserService.create_or_update(user_data)
    return {"status": "success", "user": user}

@router.post("/auth/logout")
def logout(data: Dict[str, str]):
    user_id = data.get("user_id")
    if user_id:
        UserService.update_status(user_id, online_status="Offline")
    return {"status": "success"}

@router.get("/users")
def get_users():
    return UserService.get_all()

# --- Dashboard & Analytics ---

@router.get("/stats")
def get_stats():
    return AnalyticsService.get_dashboard_stats()

@router.get("/dashboard")
def get_dashboard():
    stats = AnalyticsService.get_overview({})
    
    all_users = UserService.get_all()
    recent_users = sorted(all_users, key=lambda x: x.get("joinDate", ""), reverse=True)[:5]
    
    all_reports = ReportService.get_all()
    recent_reports = sorted(all_reports, key=lambda x: x.get("date", ""), reverse=True)[:5]
    
    return {
        "activeUsers": stats.get("activeUsers", 0), # note: get_overview doesn't return activeUsers anymore, but let's add it back or mock
        "completedInterviews": stats.get("completionRate", 0), # mock for now since it's just the dash
        "averageScore": stats.get("averageScore", 0),
        "activeInterviews": 0,
        "recentUsers": recent_users,
        "recentReports": recent_reports
    }

@router.get("/analytics/overview")
def get_analytics_overview(timeframe: str = "all", role: str = "all", interviewType: str = "all"):
    return AnalyticsService.get_overview({"timeframe": timeframe, "role": role, "interviewType": interviewType})

@router.get("/analytics/interviews")
def get_analytics_interviews(timeframe: str = "all", role: str = "all", interviewType: str = "all"):
    return AnalyticsService.get_interviews_trend({"timeframe": timeframe, "role": role, "interviewType": interviewType})

@router.get("/analytics/roles")
def get_analytics_roles(timeframe: str = "all", role: str = "all", interviewType: str = "all"):
    return AnalyticsService.get_roles_distribution({"timeframe": timeframe, "role": role, "interviewType": interviewType})

@router.get("/analytics/skills")
def get_analytics_skills(timeframe: str = "all", role: str = "all", interviewType: str = "all"):
    return AnalyticsService.get_weak_skills({"timeframe": timeframe, "role": role, "interviewType": interviewType})

# --- Live Interviews & Sessions ---

@router.get("/live")
def get_live_interviews():
    active_sessions = []
    now = time.time()
    for s_id, s_data in sessions.items():
        flow = s_data.get("flow")
        if not flow:
            continue
            
        elapsed = int(now - s_data.get("start_time", now))
        
        # Format elapsed time
        m = elapsed // 60
        s = elapsed % 60
        elapsed_str = f"{m}m {s}s"
        
        telemetry = s_data.get("live_telemetry", {})
        
        active_sessions.append({
            "id": s_id,
            "candidate": s_data.get("candidate_name", "Unknown Candidate"),
            "candidateEmail": s_data.get("candidate_email", ""),
            "role": flow.state.target_role,
            "interviewType": s_data.get("interview_mode", "Unknown"),
            "currentQuestion": flow.state.current_question_index,
            "totalQuestions": flow.state.total_questions,
            "remainingTime": elapsed_str,
            "elapsedTime": elapsed_str,
            "confidence": telemetry.get("confidence", 0),
            "emotion": telemetry.get("emotion", "Neutral"),
            "status": "LIVE" if not s_data.get("live_warnings") else "Warning",
            "warnings": s_data.get("live_warnings", []),
            "avatar": "" # Could map based on name later
        })
    return active_sessions

@router.get("/live/{session_id}")
def get_live_session_details(session_id: str):
    s_data = sessions.get(session_id)
    if not s_data:
        raise HTTPException(status_code=404, detail="Live session not found")
        
    flow = s_data.get("flow")
    now = time.time()
    elapsed = int(now - s_data.get("start_time", now))
    
    m = elapsed // 60
    s = elapsed % 60
    elapsed_str = f"{m}m {s}s"
    
    telemetry = s_data.get("live_telemetry", {})
    
    # Get exact current question text
    current_q_text = "Thinking..."
    if len(flow.state.chat_history) > 0:
        last_msg = flow.state.chat_history[-1]
        if isinstance(last_msg, dict):
            current_q_text = last_msg.get("text") or last_msg.get("content", current_q_text)
        else:
            current_q_text = getattr(last_msg, "text", getattr(last_msg, "content", current_q_text))
            
    progress = 0
    if flow.state.total_questions > 0:
        progress = round((flow.state.current_question_index / flow.state.total_questions) * 100)
    
    return {
        "id": session_id,
        "candidate": s_data.get("candidate_name", "Unknown Candidate"),
        "candidateEmail": s_data.get("candidate_email", ""),
        "role": flow.state.target_role,
        "interviewType": s_data.get("interview_mode", "Unknown"),
        "currentQuestion": current_q_text,
        "currentQuestionIndex": flow.state.current_question_index,
        "totalQuestions": flow.state.total_questions,
        "progress": progress,
        "elapsedTime": elapsed_str,
        "telemetry": telemetry,
        "transcript": s_data.get("live_transcript", ""),
        "warnings": s_data.get("live_warnings", []),
        "latestFrame": s_data.get("live_frame"),
        "status": "LIVE" if not s_data.get("live_warnings") else "Warning"
    }

@router.post("/sessions")
def create_session(data: Dict[str, Any]):
    return SessionService.create(data)

@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: str):
    session = SessionService.complete(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# --- Questions ---

@router.get("/questions")
def get_questions():
    return QuestionService.get_all()

@router.post("/questions")
def create_question(data: Dict[str, Any]):
    return QuestionService.create(data)

@router.put("/questions/{q_id}")
def update_question(q_id: str, data: Dict[str, Any]):
    q = QuestionService.update(q_id, data)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q

@router.delete("/questions/{q_id}")
def delete_question(q_id: str):
    if not QuestionService.delete(q_id):
        raise HTTPException(status_code=404, detail="Question not found")
    return {"status": "success"}

@router.post("/questions/{q_id}/toggle")
def toggle_question(q_id: str):
    q = QuestionService.toggle(q_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q

@router.patch("/questions/reorder")
def reorder_questions(reorder_data: List[Dict[str, Any]]):
    success = QuestionService.reorder(reorder_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reorder questions")
    return {"status": "success"}

# --- Templates ---

@router.get("/templates")
def get_templates():
    return TemplateService.get_all()

@router.post("/templates")
def create_template(data: Dict[str, Any]):
    return TemplateService.create(data)

@router.put("/templates/{t_id}")
def update_template(t_id: str, data: Dict[str, Any]):
    t = TemplateService.update(t_id, data)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t

@router.delete("/templates/{t_id}")
def delete_template(t_id: str):
    if not TemplateService.delete(t_id):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "success"}

# --- Reports ---

@router.get("/reports")
def get_reports():
    return ReportService.get_all()

@router.post("/reports")
def create_report(data: Dict[str, Any]):
    return ReportService.create(data)

@router.post("/reports/upload")
async def upload_report(
    file: UploadFile = File(...),
    candidate: str = Form("Unknown"),
    role: str = Form("General"),
    interviewType: str = Form("Unknown"),
    score: int = Form(0),
    status: str = Form("Completed"),
    sessionId: str = Form(""),
    weakSkills: str = Form(""),
    durationMinutes: int = Form(0)
):
    import json
    
    # Ensure reports directory exists
    reports_dir = os.path.join(BASE_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Save the file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(reports_dir, f"{file_id}.pdf")
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
        
    # Parse weak skills
    skills_list = []
    if weakSkills:
        try:
            skills_list = json.loads(weakSkills)
        except Exception:
            skills_list = [s.strip() for s in weakSkills.split(",") if s.strip()]

    # Create the report record
    data = {
        "sessionId": sessionId,
        "candidate": candidate,
        "role": role,
        "interviewType": interviewType,
        "score": score,
        "status": status,
        "filePath": file_path,
        "durationMinutes": durationMinutes,
        "weakSkills": skills_list
    }
    
    # Also mark session as complete if not already
    SessionService.complete(sessionId)
    
    return ReportService.create(data)

@router.get("/reports/{report_id}/download")
def download_report(report_id: str):
    report = ReportService.get_by_id(report_id)
    if not report or not report.get("filePath"):
        raise HTTPException(status_code=404, detail="Report not found")
        
    file_path = report["filePath"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    return FileResponse(
        path=file_path,
        filename=f"HireFlow_Report_{report_id}.pdf",
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=HireFlow_Report_{report_id}.pdf"}
    )

# --- System Status ---

@router.get("/health")
def get_system_health():
    return PlatformConfigurationService.get_system_health()

@router.get("/settings")
def get_settings():
    return PlatformConfigurationService.get_config()

@router.put("/settings")
def update_settings(data: Dict[str, Any]):
    return PlatformConfigurationService.update_config(data)
