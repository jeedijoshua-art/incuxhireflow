"""Groq Chat Completions client wrapper with retry + fallback models."""
import os
import time
import requests


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
FALLBACK_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


def chat_completion(model: str, messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
    """POST to Groq Chat Completions. Retries on transient errors; falls back through model list."""
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY not configured")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    candidates = [model] + [m for m in FALLBACK_MODELS if m != model]
    last_err = None
    for m in candidates:
        for attempt in range(3):
            try:
                r = requests.post(GROQ_URL, json={
                    "model": m,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }, headers=headers, timeout=45)
                if r.status_code in (429, 500, 503):
                    time.sleep(0.8 * (attempt + 1))
                    continue
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                last_err = e
                time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Groq chat failed: {last_err}")
