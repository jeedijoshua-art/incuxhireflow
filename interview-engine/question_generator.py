"""Generates resume-anchored interview questions using Groq Llama 3.3 70B."""
from services.groq_client import chat_completion
from prompts.interview_system_prompt import build_system_prompt


class QuestionGenerator:
    def __init__(self) -> None:
        self.model = "llama-3.3-70b-versatile"

    def first_question(self, resume_text: str) -> str:
        """Opening 'tell me about yourself' question, greeted by first name.

        Deliberately deterministic (no LLM call) so the 7 self-intro points NEVER leak.
        """
        first_name = self._extract_first_name(resume_text)
        return (
            f"Hi {first_name}, great to meet you. "
            f"To know more about you, please tell me a little about yourself."
        )

    def next_question(
        self,
        session: dict,
        clarify: bool = False,
        off_topic: bool = False,
        off_resume: bool = False,
    ) -> str:
        """Generate the next message: clarification, call-out, or next question."""
        sys = build_system_prompt(session["resume"], session["role"], session)

        if clarify:
            sys += (
                "\n\n--- THIS TURN: CLARIFICATION ---\n"
                "The candidate just asked you to clarify your previous question. "
                "Re-explain the SAME question in simpler words with an example if helpful. "
                "Do NOT ask a new question. Do NOT move on yet."
            )
        elif off_resume:
            sys += (
                "\n\n--- THIS TURN: OFF-RESUME CALL-OUT ---\n"
                "The candidate's last answer claimed experience or skills NOT in their resume. "
                "Your reply MUST start with: \"What you're speaking doesn't match your resume.\" "
                "Then briefly list the actual relevant resume items and re-ask the SAME question. "
                "Do NOT move on to a new question."
            )
        elif off_topic:
            sys += (
                "\n\n--- THIS TURN: OFF-TOPIC CALL-OUT ---\n"
                "The candidate's last answer didn't address the question (nonsense, gibberish, "
                "or completely unrelated). "
                "Your reply MUST politely point out that the answer didn't address the question "
                "and ask them to focus specifically on what was asked. "
                "Do NOT ask a new question. Do NOT move on yet."
            )
        else:
            answered = session.get("real_answers", 0)
            total = 15
            sys += (
                f"\n\n--- PRIVATE INSTRUCTIONS (never mention to the candidate) ---\n"
                f"{total - answered} more questions remain. "
                f"Ask the next NEW resume-anchored question. "
                f"Do NOT end the interview yet. "
                f"Do NOT mention question numbers, internal state, or meta-commentary."
            )

        messages = [{"role": "system", "content": sys}]
        for m in session["history"]:
            messages.append({
                "role": "assistant" if m["role"] == "model" else "user",
                "content": m["text"],
            })

        return chat_completion(self.model, messages, temperature=0.7).strip()

    @staticmethod
    def _extract_first_name(resume: str) -> str:
        first_line = (resume or "").strip().splitlines()[0] if resume else ""
        words = first_line.replace(",", " ").split()
        for w in words:
            if w and w[0].isalpha():
                return w
        return "there"
