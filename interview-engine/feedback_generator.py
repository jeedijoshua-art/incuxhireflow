"""Final feedback report generator — calls Llama 3.3 70B for structured evaluation."""
from services.groq_client import chat_completion
from prompts.feedback_prompt import build_feedback_prompt


class FeedbackGenerator:
    def __init__(self) -> None:
        self.model = "llama-3.3-70b-versatile"

    def generate_full(self, session: dict) -> str:
        """Full feedback after all 15 questions answered."""
        sys = build_feedback_prompt(session, early=False)
        messages = [{"role": "system", "content": sys}]
        for m in session["history"]:
            messages.append({"role": "assistant" if m["role"] == "model" else "user", "content": m["text"]})
        messages.append({"role": "user", "content": "Please produce the final feedback report now."})
        return chat_completion(self.model, messages, temperature=0.4).strip()

    def generate_early(self, session: dict, answered: int, skipped: int) -> str:
        """Early-end feedback when candidate stops before completing 15 questions."""
        sys = build_feedback_prompt(session, early=True, answered=answered, skipped=skipped)
        messages = [{"role": "system", "content": sys}]
        for m in session["history"]:
            messages.append({"role": "assistant" if m["role"] == "model" else "user", "content": m["text"]})
        messages.append({
            "role": "user",
            "content": f"The candidate ended the interview early. They answered {answered} of 15 ({skipped} skipped). Produce the report based only on what was answered."
        })
        return chat_completion(self.model, messages, temperature=0.4).strip()
