import os
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class InterviewSessionState(BaseModel):
    session_id: str
    target_role: str
    resume_text: str
    current_question_index: int = 1
    total_questions: int = 15
    chat_history: List[Dict[str, str]] = Field(default_factory=list)
    evaluations: List[Dict[str, int]] = Field(default_factory=list)
    is_completed: bool = False

class InterviewFlowManager:
    """
    Manages the state and category sequencing of the interview session.
    Enforces a strict flow from greeting through 15 structured questions.
    """
    CATEGORIES = [
        "Self-Introduction & Background Check",
        "Project Deep-dive",
        "Technical Depth",
        "Behavioral Scenarios",
        "Hypothetical/Problem Solving",
        "Experience & Gap Probe",
        "Technology Comparison",
        "Real-world Application"
    ]

    def __init__(self, state: InterviewSessionState):
        self.state = state

    def get_current_category(self) -> str:
        """
        Maps current_question_index to one of the 8 interview flow stages.
        """
        idx = self.state.current_question_index
        if idx == 1:
            return self.CATEGORIES[0] # Self-Intro
        elif idx == 2:
            return self.CATEGORIES[0] # Self-Intro follow-up (if needed) or Project
        
        # Cycle through categories 1 to 7 for questions 3 to 15
        cat_index = 1 + ((idx - 3) % (len(self.CATEGORIES) - 1))
        return self.CATEGORIES[cat_index]

    def add_interviewer_question(self, question: str):
        self.state.chat_history.append({"role": "interviewer", "text": question})

    def add_candidate_answer(self, answer: str):
        self.state.chat_history.append({"role": "candidate", "text": answer})

    def record_evaluation(self, evaluation: Dict[str, int]):
        self.state.evaluations.append(evaluation)

    def advance_turn(self):
        """
        Increments the question index and checks for completion.
        """
        self.state.current_question_index += 1
        if self.state.current_question_index > self.state.total_questions:
            self.state.is_completed = True

    def is_complete(self) -> bool:
        return self.state.is_completed
