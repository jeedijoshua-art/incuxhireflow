import os
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class AnswerEvaluation(BaseModel):
    communication: int = Field(description="Score for communication clarity and articulation (0-100)")
    technical_accuracy: int = Field(description="Score for correctness, depth of knowledge, and technical validity (0-100)")
    confidence: int = Field(description="Score representing candidate confidence level (0-100)")
    explanation: str = Field(description="Brief assessment of what was good and what was lacking in this specific answer")

class CandidateEvaluator:
    """
    Evaluates candidate answers in real-time, providing scores for communication, technical accuracy, and confidence.
    """
    def __init__(self):
        self.ai = AIHelper()

    def evaluate_answer(self, question: str, answer: str, target_role: str = "Candidate") -> AnswerEvaluation:
        if not question or not answer:
            return AnswerEvaluation(communication=0, technical_accuracy=0, confidence=0, explanation="Empty question or answer.")
        
        prompt = f"""
        Evaluate the candidate's answer to the following interview question for a target role of: "{target_role}".
        Score the answer based on:
        1. Communication: how clearly, structured, and articulately they answered.
        2. Technical Accuracy: correctness and validity of the information given.
        3. Confidence: how self-assured, conversational, and direct the tone was.
        
        Question:
        {question}

        Candidate Answer:
        {answer}
        """
        
        try:
            return self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=AnswerEvaluation,
                system_prompt="You are a senior technical evaluator grading mock interview responses."
            )
        except Exception as e:
            print(f"Error in CandidateEvaluator: {e}")
            return AnswerEvaluation(
                communication=75,
                technical_accuracy=75,
                confidence=75,
                explanation="Fallback score due to API error."
            )
