"""Smoke tests for the interview flow."""
from interview_flow import InterviewFlow


def test_start_creates_session():
    flow = InterviewFlow()
    out = flow.start("Aarav Mehta\nKL University\nProjects: chatbot", "AI Engineer", "Fresher", "Easy", "Mixed")
    assert "session_id" in out
    assert "Aarav" in out["message"]


def test_clarification_does_not_count():
    flow = InterviewFlow()
    s = flow.start("Aarav Mehta\nKL University", "AI Engineer", "Fresher", "Easy", "Mixed")
    sid = s["session_id"]
    flow.answer(sid, "I don't understand the question")
    assert flow.sessions[sid]["real_answers"] == 0


def test_real_answer_increments_count():
    flow = InterviewFlow()
    s = flow.start("Aarav Mehta\nKL University", "AI Engineer", "Fresher", "Easy", "Mixed")
    sid = s["session_id"]
    flow.answer(sid, "I built a chatbot using LLMs and the experience taught me about prompt engineering.")
    assert flow.sessions[sid]["real_answers"] == 1
