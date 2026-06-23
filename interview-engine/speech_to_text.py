"""Whisper transcription via Groq + strict spelling-only cleanup via Llama 3.1 8B.

Pipeline:
    1. Send audio to Groq Whisper large-v3 with a SHORT bias prompt (resume snippet
       — short enough to avoid hallucinations).
    2. Take the raw transcript and pass it through a strict spelling-only corrector
       (Llama 3.1 8B) that ONLY fixes typos and proper-noun casing — never rephrases.
    3. Return the cleaned text.
"""
import os
import requests

from services.groq_client import chat_completion


GROQ_BASE = "https://api.groq.com/openai/v1"

# Session resumes injected here by interview_flow so Whisper can bias toward
# project names / tech terms actually in the candidate's resume.
_SESSION_RESUMES: dict[str, str] = {}


def register_session_resume(session_id: str, resume_text: str) -> None:
    """Called once when an interview session starts."""
    _SESSION_RESUMES[session_id] = (resume_text or "")[:300]


def transcribe(audio_bytes: bytes, session_id: str | None = None, language: str = "en") -> str:
    """Transcribe audio buffer (webm/opus) → cleaned English text."""
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY not configured")

    # Short bias prompt — just enough resume vocab to help proper nouns
    bias = "Job interview answer in English."
    if session_id and session_id in _SESSION_RESUMES:
        bias = f"Job interview answer. Resume vocab: {_SESSION_RESUMES[session_id]}"

    files = {"file": ("answer.webm", audio_bytes, "audio/webm")}
    data = {
        "model": "whisper-large-v3",
        "language": language,
        "response_format": "json",
        "prompt": bias[:800],
        "temperature": "0",
    }
    headers = {"Authorization": f"Bearer {key}"}
    r = requests.post(f"{GROQ_BASE}/audio/transcriptions", files=files, data=data, headers=headers, timeout=45)
    r.raise_for_status()
    raw_text = (r.json().get("text") or "").strip()
    if len(raw_text) < 3:
        return raw_text
    return _spelling_cleanup(raw_text)


def _spelling_cleanup(raw_text: str) -> str:
    """Strict spelling-only correction via Llama 3.1 8B. Preserves wording."""
    sys_prompt = (
        "You are a STRICT typo-fixer for speech-to-text transcripts of job interviews.\n"
        "FIX ONLY:\n"
        " • Misspelled common words (univers → university, enginer → engineer, pyhton → Python)\n"
        " • Misheard tech acronyms (aits → AIDS, lms → LLMs, aiandds → AI & DS, github → GitHub)\n"
        " • Proper-noun capitalization (kl university → KL University)\n"
        "STRICT RULES — NEVER VIOLATE:\n"
        " 1. NEVER rephrase. NEVER change word choice.\n"
        " 2. NEVER add or remove words. NEVER reorder words.\n"
        " 3. NEVER add or change punctuation.\n"
        " 4. NEVER expand acronyms. (AIDS stays AIDS.)\n"
        " 5. If no typos → return input EXACTLY unchanged.\n"
        "Output ONLY the corrected text. No quotes, no preamble, no commentary."
    )
    try:
        cleaned = chat_completion(
            "llama-3.1-8b-instant",
            [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": raw_text},
            ],
            temperature=0,
            max_tokens=800,
        ).strip()
        # Sanity: reject cleanup if length changed dramatically (means it rewrote)
        if cleaned and 0.7 * len(raw_text) <= len(cleaned) <= 1.4 * len(raw_text):
            return cleaned
    except Exception as e:
        print(f"[cleanup] skipped: {e}")
    return raw_text
