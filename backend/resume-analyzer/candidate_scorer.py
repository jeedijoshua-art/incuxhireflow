import os
from typing import Dict, List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class CandidateScoreResult(BaseModel):
    score: int = Field(description="Overall candidate resume score from 0 to 100")
    breakdown: Dict[str, int] = Field(description="Category scores out of 100 (e.g. 'skills', 'experience', 'projects', 'formatting')")
    explanation: str = Field(description="Clear explanation of the scoring decisions and strengths/weaknesses")

class CandidateScorer:
    """
    Evaluates the quality, completeness, and impact of a candidate's resume and scores it.
    """
    def __init__(self):
        self.ai = AIHelper()

    def score_candidate(self, resume_text: str, skills: List[str], experience_years: float) -> CandidateScoreResult:
        if not resume_text:
            return CandidateScoreResult(score=0, breakdown={"skills": 0, "experience": 0}, explanation="Empty resume text.")

        prompt = f"""
        Evaluate and score the candidate's resume based on the raw resume text, extracted skills list, and calculated experience years.
        
        Provide:
        1. An overall score out of 100.
        2. Category scores (skills, experience, project impact/depth, formatting/structure).
        3. A brief explanation of the candidate's core strengths and areas of improvement.

        Candidate Info:
        - Extracted Skills: {skills}
        - Experience Years: {experience_years}
        
        Resume Content:
        ---
        {resume_text}
        ---
        """
        
        try:
            return self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=CandidateScoreResult,
                system_prompt="You are a professional hiring manager grading candidate resume suitability."
            )
        except Exception as e:
            print(f"Error in CandidateScorer: {e}")
            return CandidateScoreResult(
                score=70, 
                breakdown={"skills": 70, "experience": 70}, 
                explanation="Fallback score due to calculation error."
            )
