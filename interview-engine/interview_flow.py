"""Interview state machine — greeting → 15 questions → final feedback.

Tracks each session's history, enforces the question count, handles clarification
requests, detects off-resume / off-topic answers, and routes calls to the question
generator and feedback generator.
"""
import re
import uuid
import time
from typing import Any

from question_generator import QuestionGenerator
from candidate_evaluator import CandidateEvaluator
from feedback_generator import FeedbackGenerator

TOTAL_QUESTIONS = 15

# Phrases that mean the candidate is asking for clarification (NOT answering)
CLARIFICATION_KEYWORDS = (
    "i don't understand", "i dont understand", "didn't understand",
    "can you repeat", "please repeat", "what do you mean",
    "i'm confused", "im confused", "could you rephrase",
    "explain again", "explain it again", "i don't get it",
    "say that again", "sorry, what", "sorry what", "not clear",
    "didn't catch", "missed the question", "missed that",
    "what is the question", "what's the question",
)

# Regex patterns to strip leaked meta-commentary from AI responses
_STRIP_PATTERNS = [
    (re.compile(r"\[INTERVIEW_END\]", re.IGNORECASE), ""),
    (re.compile(r"\(\s*internal\s*state[^)]*\)", re.IGNORECASE), ""),
    (re.compile(r"\[\s*internal\s*state[^\]]*\]", re.IGNORECASE), ""),
    (re.compile(r"\(\s*\d+\s*/\s*\d+\s*\)"), ""),
    (re.compile(r"question\s*#?\d+\s*of\s*\d+\s*[:\-—]?\s*", re.IGNORECASE), ""),
    (re.compile(
        r"\(\s*(I'?ll|I\s+will|I'?m\s+going|let\s+me)\s+(internally|privately|silently|just|simply)?[^)]*"
        r"(track|note|check|observe|evaluate|monitor|score|grade|count|assess|tally)[^)]*\)",
        re.IGNORECASE,
    ), ""),
    (re.compile(r"\(\s*(internally|privately|silently|note to self|self-note)[^)]*\)", re.IGNORECASE), ""),
    (re.compile(r"\(\s*the candidate (should|needs to)[^)]*\)", re.IGNORECASE), ""),
    (re.compile(r"\n{3,}"), "\n\n"),
]


def _clean(reply: str) -> str:
    """Strip any leaked internal-state markers / meta-commentary from AI output."""
    for pat, repl in _STRIP_PATTERNS:
        reply = pat.sub(repl, reply)
    return reply.strip()


def _strip_first_question_list(reply: str) -> str:
    """Surgical cleanup of the first question — kill any leaked bullet/numbered list."""
    m = re.search(r"(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+\S", reply, flags=re.MULTILINE)
    if m and m.start() > 0:
        reply = reply[: m.start()].strip()
    reply = re.sub(
        r"[.!?]\s*(make sure (you'?d? )?to\s+(cover|include|mention|share)|"
        r"cover (the following|these)|include the following|please cover)[\s\S]*$",
        ".",
        reply,
        flags=re.IGNORECASE,
    ).strip()
    return reply


class InterviewFlow:
    """Owns sessions in-memory. State per session:
        resume, role, level, difficulty, type,
        history (list of {role: 'user'|'model', text}),
        real_answers (int — excludes clarification requests),
        bad_answers (list of strings describing off-topic / off-resume incidents),
        created_at.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.qgen = QuestionGenerator()
        self.evaluator = CandidateEvaluator()
        self.feedback = FeedbackGenerator()

    # ----- session lifecycle -----

    def start(self, resume_text: str, role: str | None, level: str, difficulty: str, itype: str) -> dict:
        sid = str(uuid.uuid4())
        first = _strip_first_question_list(self.qgen.first_question(resume_text))
        self.sessions[sid] = {
            "resume": resume_text,
            "role": role or "",
            "level": level or "Fresher",
            "difficulty": difficulty or "Easy",
            "type": itype or "Mixed",
            "history": [{"role": "model", "text": first}],
            "real_answers": 0,
            "bad_answers": [],
            "created_at": time.time(),
        }
        return {"session_id": sid, "message": first, "total_questions": TOTAL_QUESTIONS}

    def answer(self, sid: str, answer_text: str) -> dict:
        s = self.sessions.get(sid)
        if not s:
            return {"error": "Session not found", "status": 404}

        # 1) Clarification detection (does NOT count toward 15)
        low = answer_text.lower()
        is_clarification = (
            any(k in low for k in CLARIFICATION_KEYWORDS)
            and len(answer_text) < 100
        )

        # 2) Off-topic / off-resume detection (only for real answers)
        last_question = next(
            (m["text"] for m in reversed(s["history"]) if m["role"] == "model"),
            "",
        )
        eval_result = self.evaluator.evaluate(last_question, answer_text, s["resume"])

        s["history"].append({"role": "user", "text": answer_text})

        if not is_clarification:
            s["real_answers"] += 1
            if eval_result["off_topic"]:
                s["bad_answers"].append(f"Q{s['real_answers']}: off-topic — {answer_text[:80]}")
            if eval_result["off_resume"]:
                s["bad_answers"].append(f"Q{s['real_answers']}: off-resume — {answer_text[:80]}")

        # 3) Final feedback when count reached
        if s["real_answers"] >= TOTAL_QUESTIONS and not is_clarification:
            reply = _clean(self.feedback.generate_full(s))
            s["history"].append({"role": "model", "text": reply})
            return {"message": reply, "done": True}

        # 4) Otherwise generate the next message (clarification, call-out, or next question)
        reply = self.qgen.next_question(
            s,
            clarify=is_clarification,
            off_topic=eval_result["off_topic"] if not is_clarification else False,
            off_resume=eval_result["off_resume"] if not is_clarification else False,
        )
        reply = _clean(reply)
        s["history"].append({"role": "model", "text": reply})
        return {"message": reply, "done": False, "answered": s["real_answers"]}

    def end_early(self, sid: str) -> dict:
        s = self.sessions.get(sid)
        if not s:
            return {"error": "Session not found", "status": 404}
        answered = s["real_answers"]
        skipped = max(0, TOTAL_QUESTIONS - answered)
        reply = _clean(self.feedback.generate_early(s, answered, skipped))
        s["history"].append({"role": "model", "text": reply})
        return {"message": reply, "done": True, "answered": answered, "skipped": skipped}
