import os
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class GeneratedQuestion(BaseModel):
    category: str = Field(description="Category of the question (e.g. Project Deep-dive, Technical Depth, Behavioral, Scenario)")
    question_text: str = Field(description="The customized, resume-anchored interview question")
    expected_topics: List[str] = Field(description="Key topics, terms, or technologies expected in a comprehensive answer")

class QuestionGenerationResult(BaseModel):
    questions: List[GeneratedQuestion] = Field(description="List of custom generated questions")

class QuestionGenerator:
    """
    Generates customized, resume-anchored interview questions based on the candidate's resume and target role.
    """
    def __init__(self):
        self.ai = AIHelper()

    def generate_questions(self, resume_text: str, target_role: str, num_questions: int = 5) -> List[GeneratedQuestion]:
        if not resume_text:
            return []
        
        prompt = f"""
        Generate {num_questions} high-quality, customized interview questions tailored to the candidate's resume and target role.
        
        Rules:
        - Every question must be grounded in the candidate's resume (reference specific projects, tools, or experiences).
        - Cover a range of question types (e.g., technical deep dives, behavioral questions, project analysis).
        - For each question, define expected concepts or topics that would make a strong answer.

        Target Role: {target_role}

        Resume Content:
        ---
        {resume_text}
        ---
        """
        
        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=QuestionGenerationResult,
                system_prompt="You are a professional technical interviewer compiling tailored assessment items."
            )
            return result.questions
        except Exception as e:
            print(f"Error in QuestionGenerator: {e}")
            return []
