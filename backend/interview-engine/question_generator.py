import os
from typing import List, Dict
from ai_helper import AIHelper

class DynamicQuestionGenerator:
    """
    Generates dynamic interview questions in real-time, considering the candidate's resume,
    target role, and the conversation history.
    """
    def __init__(self):
        self.ai = AIHelper()

    def generate_question(
        self, 
        resume_text: str, 
        target_role: str, 
        chat_history: List[Dict[str, str]], 
        category: str = "General"
    ) -> str:
        """
        Generate the next natural interview question.
        chat_history is a list of dicts: [{'role': 'interviewer'/'candidate', 'text': '...'}]
        """
        history_formatted = ""
        for turn in chat_history:
            role_label = "Interviewer" if turn.get("role") == "interviewer" else "Candidate"
            history_formatted += f"{role_label}: {turn.get('text')}\n"

        prompt = f"""
        You are an elite, friendly, yet rigorous technical interviewer for the target role: "{target_role}".
        Generate the next interview question for the candidate, matching the category: "{category}".

        Resume Context:
        ---
        {resume_text}
        ---

        Interview History:
        ---
        {history_formatted if history_formatted else "(No history yet - this is the first question)"}
        ---

        Guidelines:
        1. Keep the question natural, conversational, and direct (do not include meta-text or preambles like "Sure, I'll ask...").
        2. Anchor the question specifically to items in their resume (projects, tools, experience) while progressing the conversation.
        3. Do not repeat questions or topics already discussed in the interview history.
        4. Focus on the category "{category}" (e.g. Technical Depth, Behavioral, Project Deep-dive, Hypothetical).
        """
        
        try:
            return self.ai.generate_text(
                prompt=prompt,
                system_prompt=f"You are a professional hiring manager interviewing a candidate for a {target_role} position."
            )
        except Exception as e:
            print(f"Error in DynamicQuestionGenerator: {e}")
            return "Could you elaborate on your most recent project and the challenges you faced?"
