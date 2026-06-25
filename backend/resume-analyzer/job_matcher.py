import os
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class JobMatchResult(BaseModel):
    match_percentage: int = Field(description="The alignment score between the candidate profile and job description, from 0 to 100")
    matching_skills: List[str] = Field(description="List of skills matching between the resume and the job description")
    missing_skills: List[str] = Field(description="Key skills mentioned in the job description that are missing from the resume")
    fit_explanation: str = Field(description="Short summary of why the candidate fits or does not fit the role, and recommendations")

class JobMatcher:
    """
    Evaluates how well a candidate's resume matches a specific target job description.
    """
    def __init__(self):
        self.ai = AIHelper()

    def match_job(self, resume_text: str, job_description: str) -> JobMatchResult:
        if not resume_text or not job_description:
            return JobMatchResult(
                match_percentage=0, 
                matching_skills=[], 
                missing_skills=[], 
                fit_explanation="Resume text or Job Description was empty."
            )
        
        prompt = f"""
        Analyze the following resume text and compare it with the job description.
        Calculate a match percentage (0-100), identify overlapping skills, determine missing key skills, and summarize overall fit.

        Job Description:
        ---
        {job_description}
        ---

        Resume Content:
        ---
        {resume_text}
        ---
        """
        
        try:
            return self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=JobMatchResult,
                system_prompt="You are a recruiting matching algorithm evaluating resume correlation with target role requirements."
            )
        except Exception as e:
            print(f"Error in JobMatcher: {e}")
            return JobMatchResult(
                match_percentage=50,
                matching_skills=[],
                missing_skills=[],
                fit_explanation="Fallback match due to API error."
            )
