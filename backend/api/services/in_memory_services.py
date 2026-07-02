import sys
import os
from datetime import datetime
import uuid
from typing import List, Dict, Any, Optional

# Add interview-engine to path so we can import StaticQuestionGenerator
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INTERVIEW_ENGINE_DIR = os.path.join(BASE_DIR, "interview-engine")
if INTERVIEW_ENGINE_DIR not in sys.path:
    sys.path.insert(0, INTERVIEW_ENGINE_DIR)

from question_generator import QuestionGenerator
from metadata_generator import QuestionMetadataGenerator
import threading

# In-memory storage dictionaries
_users = {}
_sessions = {}
_questions = {}
_templates = {}
_reports = {}

# Initialize questions from static generator
_generator = QuestionGenerator()
for idx, q_text in enumerate(_generator.question_bank, 1):
    q_id = str(idx)
    now = datetime.utcnow().isoformat()
    default_ideal_answers = [
        "A concise career summary highlighting education, current focus, relevant projects, technical skills, accomplishments, and why you are interested in this role.",
        "A detailed walkthrough of one strong project, including your role, technical stack, impact, and measurable outcomes.",
        "A structured story describing a challenging problem, your approach, the solution, and what you learned.",
        "An explanation showing that a primary key uniquely identifies records in a table, while a foreign key defines relationships between tables.",
        "A clear comparison where a compiler translates code into machine language ahead of execution and an interpreter executes code line by line at runtime.",
        "A description that overloading uses same method name with different signatures, while overriding replaces a base class method in a subclass.",
        "A compelling answer about your preferred language, why it suits your skills, and examples of how you use it effectively.",
        "A narrative about quickly learning new technology, the steps you took, how you applied it, and the resulting success.",
        "A thoughtful problem-solving process that emphasizes analysis, research, testing, and learning from unknowns.",
        "A persuasive summary of your fit for the role, emphasizing your strengths, accomplishments, motivation, and how you can contribute."
    ]
    _questions[q_id] = {
        "id": q_id,
        "question_index": idx,
        "question": q_text,
        "role": "General",
        "category": "HR" if idx in [1, 10] else "Frontend",
        "difficulty": "Easy" if idx in [1, 2, 10] else "Medium",
        "expectedTime": 120,
        "isEnabled": True,
        "createdAt": now,
        "updatedAt": now,
        "expected_skills": [],
        "expected_keywords": [],
        "expected_concepts": [],
        "weight": 1.0,
        "passing_score": 60,
        "ideal_answer": default_ideal_answers[idx - 1],
        "hints": []
    }

class PlatformConfigurationService:
    _config = {
        "system_health": {
            "Backend Status": "Online",
            "Database Status": "Online",
            "Telemetry Status": "Online",
            "Resume Analyzer Status": "Online",
            "Speech Service Status": "Online",
            "Camera Service Status": "Online",
            "Report Generator Status": "Online",
            "Authentication Status": "Online"
        },
        "interview": {
            "default_duration_minutes": 45,
            "prep_time_seconds": 30,
            "max_questions": 10,
            "question_timeout_seconds": 120,
            "auto_end_interview": True,
            "enable_question_timer": True,
            "enable_resume_questions": True,
            "enable_recruiter_questions": True,
            "enable_follow_up_questions": True
        },
        "ai_assistant": {
            "voice_profile": "Professional (Default)",
            "silence_timeout_seconds": 5,
            "speaking_speed": 1.0,
            "speaking_pitch": 1.0,
            "voice_enabled": True,
            "auto_repeat_question": False,
            "max_retries": 3
        },
        "security": {
            "require_fullscreen": True,
            "max_tab_switches": 3,
            "max_window_blur": 3,
            "max_camera_warnings": 5,
            "max_face_failures": 5,
            "terminate_after_max_violations": True,
            "allow_copy_paste": False,
            "allow_developer_tools": False,
            "allow_multiple_displays": False
        },
        "telemetry": {
            "enable_emotion_detection": True,
            "enable_eye_tracking": True,
            "enable_head_pose": True,
            "enable_confidence_analysis": True,
            "enable_audio_recording": True,
            "enable_video_recording": True,
            "enable_blink_detection": True,
            "enable_looking_away_detection": True,
            "enable_speech_analysis": True,
            "enable_transcript": True
        },
        "reports": {
            "generate_pdf": True,
            "generate_behaviour_report": True,
            "generate_telemetry_summary": True,
            "generate_resume_summary": True,
            "generate_ai_recommendations": True,
            "generate_candidate_score": True,
            "store_report": True,
            "allow_download": True
        }
    }

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        return cls._config

    @classmethod
    def update_config(cls, updates: Dict[str, Any]) -> Dict[str, Any]:
        for category, values in updates.items():
            if category in cls._config and isinstance(values, dict):
                cls._config[category].update(values)
        return cls._config

    @classmethod
    def get_system_health(cls) -> Dict[str, str]:
        return cls._config["system_health"]

class UserService:
    @classmethod
    def get_all(cls) -> List[Dict]:
        return list(_users.values())

    @classmethod
    def get_by_id(cls, user_id: str) -> Optional[Dict]:
        return _users.get(user_id)
        
    @classmethod
    def get_by_email(cls, email: str) -> Optional[Dict]:
        for user in _users.values():
            if user.get("email") == email:
                return user
        return None

    @classmethod
    def create_or_update(cls, user_data: Dict) -> Dict:
        user_id = user_data.get("id") or str(uuid.uuid4())
        
        if user_id in _users:
            _users[user_id].update({
                "lastLogin": datetime.utcnow().isoformat(),
                "onlineStatus": "Online"
            })
        else:
            _users[user_id] = {
                "id": user_id,
                "name": user_data.get("name", ""),
                "email": user_data.get("email", ""),
                "picture": user_data.get("picture", ""),
                "joinDate": datetime.utcnow().isoformat(),
                "lastLogin": datetime.utcnow().isoformat(),
                "onlineStatus": "Online",
                "interviewStatus": "Idle",
                "totalInterviews": 0,
                # First user to register or hardcoded email gets admin
                "isAdmin": True if len(_users) == 0 else False
            }
        return _users[user_id]
        
    @classmethod
    def update_status(cls, user_id: str, online_status: str = None, interview_status: str = None):
        if user_id in _users:
            if online_status:
                _users[user_id]["onlineStatus"] = online_status
            if interview_status:
                _users[user_id]["interviewStatus"] = interview_status

class SessionService:
    @classmethod
    def get_all(cls) -> List[Dict]:
        return list(_sessions.values())
        
    @classmethod
    def get_active(cls) -> List[Dict]:
        return [s for s in _sessions.values() if s.get("status") == "Active"]
        
    @classmethod
    def create(cls, session_data: Dict) -> Dict:
        session_id = str(uuid.uuid4())
        _sessions[session_id] = {
            "id": session_id,
            "userId": session_data.get("userId"),
            "candidateName": session_data.get("candidateName", "Unknown"),
            "role": session_data.get("role", "General"),
            "currentQuestion": 1,
            "remainingTime": session_data.get("duration", 3600),
            "status": "Active",
            "startTime": datetime.utcnow().isoformat()
        }
        UserService.update_status(_sessions[session_id]["userId"], interview_status="In Interview")
        return _sessions[session_id]
        
    @classmethod
    def complete(cls, session_id: str) -> Optional[Dict]:
        if session_id in _sessions:
            _sessions[session_id]["status"] = "Completed"
            UserService.update_status(_sessions[session_id]["userId"], interview_status="Idle")
            if _sessions[session_id]["userId"] in _users:
                _users[_sessions[session_id]["userId"]]["totalInterviews"] += 1
            return _sessions[session_id]
        return None

class QuestionService:
    @classmethod
    def get_all(cls) -> List[Dict]:
        questions = list(_questions.values())
        return sorted(questions, key=lambda q: q.get("question_index", 999))

    @classmethod
    def create(cls, data: Dict) -> Dict:
        q_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        _questions[q_id] = {
            "id": q_id,
            "question": data.get("question"),
            "role": data.get("role"),
            "category": data.get("category"),
            "difficulty": data.get("difficulty"),
            "expectedTime": data.get("expectedTime", 120),
            "isEnabled": data.get("isEnabled", True),
            "createdAt": now,
            "updatedAt": now
        }
        def _bg_generate(qid, text):
            try:
                gen = QuestionMetadataGenerator()
                meta = gen.generate_metadata(text)
                if qid in _questions:
                    _questions[qid]["expected_keywords"] = meta.get("expected_keywords", [])
                    _questions[qid]["expected_concepts"] = meta.get("expected_concepts", [])
                    _questions[qid]["ideal_answer"] = meta.get("ideal_answer", "")
                    _questions[qid]["skills"] = meta.get("skills", [])
                    _questions[qid]["weight"] = meta.get("weight", 1.0)
                    if meta.get("category"):
                        _questions[qid]["category"] = meta.get("category")
                    if meta.get("difficulty"):
                        _questions[qid]["difficulty"] = meta.get("difficulty")
            except Exception as e:
                print(f"Error generating metadata in bg: {e}")
                
        threading.Thread(target=_bg_generate, args=(q_id, data.get("question", ""))).start()

        return _questions[q_id]

    @classmethod
    def update(cls, q_id: str, data: Dict) -> Optional[Dict]:
        if q_id in _questions:
            _questions[q_id].update({
                "question": data.get("question", _questions[q_id]["question"]),
                "role": data.get("role", _questions[q_id]["role"]),
                "category": data.get("category", _questions[q_id]["category"]),
                "difficulty": data.get("difficulty", _questions[q_id]["difficulty"]),
                "expectedTime": data.get("expectedTime", _questions[q_id]["expectedTime"]),
                "isEnabled": data.get("isEnabled", _questions[q_id]["isEnabled"]),
                "updatedAt": datetime.utcnow().isoformat()
            })
            if "question" in data and data["question"] != _questions[q_id].get("original_q_for_meta", ""):
                _questions[q_id]["original_q_for_meta"] = data["question"]
                def _bg_update(qid, text):
                    try:
                        gen = QuestionMetadataGenerator()
                        meta = gen.generate_metadata(text)
                        if qid in _questions:
                            _questions[qid]["expected_keywords"] = meta.get("expected_keywords", [])
                            _questions[qid]["expected_concepts"] = meta.get("expected_concepts", [])
                            _questions[qid]["ideal_answer"] = meta.get("ideal_answer", "")
                            _questions[qid]["skills"] = meta.get("skills", [])
                            _questions[qid]["weight"] = meta.get("weight", 1.0)
                    except Exception as e:
                        print(f"Error updating metadata in bg: {e}")
                threading.Thread(target=_bg_update, args=(q_id, data["question"])).start()

            return _questions[q_id]
        return None

    @classmethod
    def delete(cls, q_id: str) -> bool:
        if q_id in _questions:
            del _questions[q_id]
            return True
        return False
        
    @classmethod
    def toggle(cls, q_id: str) -> Optional[Dict]:
        if q_id in _questions:
            _questions[q_id]["isEnabled"] = not _questions[q_id]["isEnabled"]
            _questions[q_id]["updatedAt"] = datetime.utcnow().isoformat()
            return _questions[q_id]
        return None

    @classmethod
    def reorder(cls, reorder_data: List[Dict]) -> bool:
        try:
            for item in reorder_data:
                q_id = item.get("id")
                new_idx = item.get("question_index")
                if q_id and new_idx is not None and q_id in _questions:
                    _questions[q_id]["question_index"] = new_idx
            return True
        except Exception:
            return False

class TemplateService:
    @classmethod
    def get_all(cls) -> List[Dict]:
        return list(_templates.values())

    @classmethod
    def create(cls, data: Dict) -> Dict:
        t_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        _templates[t_id] = {
            "id": t_id,
            "roleName": data.get("roleName"),
            "totalDuration": data.get("totalDuration", 30),
            "hrQuestions": data.get("hrQuestions", 0),
            "technicalQuestions": data.get("technicalQuestions", 0),
            "behavioralQuestions": data.get("behavioralQuestions", 0),
            "easyQuestions": data.get("easyQuestions", 0),
            "mediumQuestions": data.get("mediumQuestions", 0),
            "hardQuestions": data.get("hardQuestions", 0),
            "passingScore": data.get("passingScore", 70),
            "status": data.get("status", "Active"),
            "createdAt": now,
            "updatedAt": now
        }
        return _templates[t_id]
        
    @classmethod
    def update(cls, t_id: str, data: Dict) -> Optional[Dict]:
        if t_id in _templates:
            _templates[t_id].update({
                "roleName": data.get("roleName", _templates[t_id].get("roleName")),
                "totalDuration": data.get("totalDuration", _templates[t_id].get("totalDuration")),
                "hrQuestions": data.get("hrQuestions", _templates[t_id].get("hrQuestions")),
                "technicalQuestions": data.get("technicalQuestions", _templates[t_id].get("technicalQuestions")),
                "behavioralQuestions": data.get("behavioralQuestions", _templates[t_id].get("behavioralQuestions")),
                "easyQuestions": data.get("easyQuestions", _templates[t_id].get("easyQuestions")),
                "mediumQuestions": data.get("mediumQuestions", _templates[t_id].get("mediumQuestions")),
                "hardQuestions": data.get("hardQuestions", _templates[t_id].get("hardQuestions")),
                "passingScore": data.get("passingScore", _templates[t_id].get("passingScore")),
                "status": data.get("status", _templates[t_id].get("status")),
                "updatedAt": datetime.utcnow().isoformat()
            })
            return _templates[t_id]
        return None
        
    @classmethod
    def delete(cls, t_id: str) -> bool:
        if t_id in _templates:
            del _templates[t_id]
            return True
        return False

class ReportService:
    @classmethod
    def get_all(cls) -> List[Dict]:
        return list(_reports.values())
        
    @classmethod
    def get_by_id(cls, r_id: str) -> Optional[Dict]:
        return _reports.get(r_id)

    @classmethod
    def create(cls, data: Dict) -> Dict:
        r_id = str(uuid.uuid4())
        _reports[r_id] = {
            "id": r_id,
            "sessionId": data.get("sessionId"),
            "candidate": data.get("candidate", "Unknown"),
            "role": data.get("role", "General"),
            "interviewType": data.get("interviewType", "Unknown"),
            "score": data.get("score", 0),
            "status": data.get("status", "Completed"),
            "filePath": data.get("filePath", ""),
            "durationMinutes": data.get("durationMinutes", 0),
            "weakSkills": data.get("weakSkills", []),
            "confidence": data.get("confidence", 0),
            "attention": data.get("attention", 0),
            "eyeContact": data.get("eyeContact", 0),
            "emotion": data.get("emotion", "Neutral"),
            "date": datetime.utcnow().isoformat()
        }
        return _reports[r_id]

class AnalyticsService:
    @classmethod
    def _filter_reports(cls, filters: Dict) -> List[Dict]:
        timeframe = filters.get("timeframe", "all")
        role = filters.get("role", "all")
        interview_type = filters.get("interviewType", "all")
        
        filtered = []
        now = datetime.utcnow()
        for r in _reports.values():
            # Role Filter
            if role != "all" and r.get("role") != role:
                continue
            # Interview Type Filter
            if interview_type != "all":
                # handle frontend values "Resume AI" vs "Recruiter"
                if r.get("interviewType", "").lower() != interview_type.lower():
                    continue
            # Timeframe Filter
            if timeframe != "all":
                r_date_str = r.get("date")
                if r_date_str:
                    try:
                        r_date = datetime.fromisoformat(r_date_str)
                        days_diff = (now - r_date).days
                        if timeframe == "7d" and days_diff > 7:
                            continue
                        elif timeframe == "30d" and days_diff > 30:
                            continue
                        elif timeframe == "90d" and days_diff > 90:
                            continue
                    except ValueError:
                        pass
            filtered.append(r)
        return filtered

    @classmethod
    def get_overview(cls, filters: Dict) -> Dict:
        filtered_reports = cls._filter_reports(filters)
        
        scores = [r.get("score", 0) for r in filtered_reports]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0
        
        durations = [r.get("durationMinutes", 0) for r in filtered_reports]
        avg_time = round(sum(durations) / len(durations)) if durations else 0
        
        # Completion Rate
        started = len(_sessions)
        completed = len(filtered_reports)
        completion_rate = round((completed / started) * 100) if started > 0 else 0
        
        return {
            "averageScore": avg_score,
            "completionRate": completion_rate,
            "totalRegistrations": len(_users),
            "avgInterviewTime": avg_time
        }
        
    @classmethod
    def get_interviews_trend(cls, filters: Dict) -> List[Dict]:
        filtered_reports = cls._filter_reports(filters)
        
        days_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
        counts = {k: 0 for k in days_map.keys()}
        now = datetime.utcnow()
        
        for r in filtered_reports:
            r_date_str = r.get("date")
            if r_date_str:
                try:
                    r_date = datetime.fromisoformat(r_date_str)
                    if (now - r_date).days <= 7:
                        day_name = r_date.strftime("%a")
                        if day_name in counts:
                            counts[day_name] += 1
                except ValueError:
                    pass
                    
        return [{"label": k, "value": v} for k, v in counts.items()]
        
    @classmethod
    def get_roles_distribution(cls, filters: Dict) -> List[Dict]:
        filtered_reports = cls._filter_reports(filters)
        
        roles = {}
        for r in filtered_reports:
            role = r.get("role", "General")
            roles[role] = roles.get(role, 0) + 1
            
        total = len(filtered_reports)
        sorted_roles = sorted(roles.items(), key=lambda x: x[1], reverse=True)[:5]
        colors = ["bg-teal-500", "bg-violet-500", "bg-emerald-500", "bg-cyan-500", "bg-amber-500"]
        
        return [
            {
                "role": role,
                "percentage": round((count / total) * 100) if total > 0 else 0,
                "color": colors[i % len(colors)]
            }
            for i, (role, count) in enumerate(sorted_roles)
        ]
        
    @classmethod
    def get_weak_skills(cls, filters: Dict) -> List[Dict]:
        filtered_reports = cls._filter_reports(filters)
        
        skills = {}
        for r in filtered_reports:
            for skill in r.get("weakSkills", []):
                skills[skill] = skills.get(skill, 0) + 1
                
        sorted_skills = sorted(skills.items(), key=lambda x: x[1], reverse=True)[:8]
        return [{"skill": skill, "freq": count} for skill, count in sorted_skills]

