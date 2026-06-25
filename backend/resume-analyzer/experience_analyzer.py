import os
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class WorkExperienceItem(BaseModel):
    role: str = Field(description="The job title or role held by the candidate")
    company: str = Field(description="The name of the company or organization")
    duration: str = Field(description="The duration, e.g. 'June 2021 - Present' or '2 years'")
    years: float = Field(description="Calculated duration in years (e.g. 1.5, 2.0, 0.5)")

class ExperienceAnalysisResult(BaseModel):
    total_experience_years: int = Field(description="The cumulative years of relevant experience, rounded to the nearest integer")
    experiences: List[WorkExperienceItem] = Field(description="List of work experience entries found in the resume")

class ExperienceAnalyzer:
    """
    Analyzes experience, roles, and calculates cumulative years of experience from resume text.
    """
    def __init__(self):
        self.ai = AIHelper()

    def analyze_experience(self, resume_text: str) -> ExperienceAnalysisResult:
        if not resume_text:
            return ExperienceAnalysisResult(total_experience_years=0, experiences=[])
        
        prompt = f"""
        Analyze the following resume text and extract the work experience details.
        Calculate the total years of relevant experience by summing the duration of all professional roles (be careful not to double count overlapping dates).
        Round the total experience years to the nearest integer.
        
        Resume Content:
        ---
        {resume_text}
        ---
        """
        
        try:
            return self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=ExperienceAnalysisResult,
                system_prompt="You are an expert HR applicant tracking parser evaluating candidate employment history."
            )
        except Exception as e:
            print(f"Error in ExperienceAnalyzer: {e}")
            return ExperienceAnalysisResult(total_experience_years=0, experiences=[])
