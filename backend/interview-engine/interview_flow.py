import os
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class InterviewQuestionTurn(BaseModel):
    question: str
    expected_answer: str
    candidate_answer: str = ""
    evaluation: Optional[Dict] = None

class InterviewSessionState(BaseModel):
    session_id: str
    target_role: str
    resume_text: str = ""
    current_question_index: int = 1
    total_questions: int = 10
    chat_history: List[Dict[str, str]] = Field(default_factory=list)
    question_turns: List[InterviewQuestionTurn] = Field(default_factory=list)
    is_completed: bool = False

    @property
    def evaluations(self) -> List[Dict]:
        return [turn.evaluation for turn in self.question_turns if turn.evaluation is not None]

class InterviewFlowManager:
    """
    Manages the state and category sequencing of the interview session.
    Enforces a strict flow through structured questions.
    """
    CATEGORIES = [
        "General",
        "Technical",
        "Behavioral"
    ]

    def __init__(self, state: InterviewSessionState):
        self.state = state

    def get_current_category(self) -> str:
        """
        Maps current_question_index to category.
        """
        idx = self.state.current_question_index
        if idx == 1:
            return self.CATEGORIES[0]
        
        cat_index = idx % len(self.CATEGORIES)
        return self.CATEGORIES[cat_index]

    def add_interviewer_question(self, question: str, expected_answer: str):
        self.state.chat_history.append({"role": "interviewer", "text": question})
        self.state.question_turns.append(InterviewQuestionTurn(
            question=question,
            expected_answer=expected_answer
        ))

    def add_candidate_answer(self, answer: str):
        self.state.chat_history.append({"role": "candidate", "text": answer})
        if self.state.question_turns:
            self.state.question_turns[-1].candidate_answer = answer

    def record_evaluation(self, evaluation: Dict):
        if self.state.question_turns:
            self.state.question_turns[-1].evaluation = evaluation

    def advance_turn(self):
        """
        Increments the question index and checks for completion.
        """
        self.state.current_question_index += 1
        if self.state.current_question_index > self.state.total_questions:
            self.state.is_completed = True

    def is_complete(self) -> bool:
        return self.state.is_completed
