import os
from typing import List
from pydantic import BaseModel
from ai_helper import AIHelper

class SkillExtractionResult(BaseModel):
    skills: List[str]

class SkillExtractor:
    """
    Extracts technical, soft, and domain-specific skills from resume text.
    """
    def __init__(self):
        self.ai = AIHelper()

    def extract_skills(self, resume_text: str) -> List[str]:
        if not resume_text:
            return []
        
        prompt = f"""
        Analyze the following resume text and extract all relevant professional skills.
        Include programming languages, frameworks, libraries, developer tools, soft skills, and core domain methodologies.
        Output a clean list of skills as defined in the response schema.

        Resume Content:
        ---
        {resume_text}
        ---
        """
        
        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=SkillExtractionResult,
                system_prompt="You are an expert recruitment system parsing skills from resume documents."
            )
            return result.skills
        except Exception as e:
            print(f"Error in SkillExtractor: {e}")
            return []
