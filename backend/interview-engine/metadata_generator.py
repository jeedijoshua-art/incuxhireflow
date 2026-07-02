import asyncio
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class QuestionMetadata(BaseModel):
    expected_keywords: List[str] = Field(description="Keywords expected in a strong answer.")
    expected_concepts: List[str] = Field(description="Core concepts the candidate should demonstrate understanding of.")
    ideal_answer: str = Field(description="A concise ideal answer for this question.")
    category: str = Field(description="Question category, e.g., HR, Technical, Behavioral.")
    difficulty: str = Field(description="Difficulty level: Easy, Medium, Hard.")
    skills: List[str] = Field(description="Target skills tested by this question (e.g., Python, React, Communication).")
    weight: float = Field(default=1.0, description="Relative weight of this question for overall scoring.")

class QuestionMetadataGenerator:
    """
    Generates structured metadata for recruiter questions to ensure the same evaluation engine
    can be used consistently across both Resume AI and Recruiter modes.
    """
    def __init__(self):
        self.ai = AIHelper()
        
    def generate_metadata(self, question: str) -> dict:
        prompt = f"""
        Analyze the following interview question and generate structured metadata for it.
        This metadata will be used by an automated AI interviewer to evaluate candidate responses.
        
        Question: "{question}"
        
        Please provide:
        - expected_keywords
        - expected_concepts
        - ideal_answer
        - category (HR, Technical, or Behavioral)
        - difficulty (Easy, Medium, or Hard)
        - skills
        - weight (1.0 default)
        """
        
        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=QuestionMetadata,
                system_prompt="You are a senior technical recruiter structuring question metadata."
            )
            return result.model_dump()
        except Exception as e:
            print(f"[METADATA_GENERATOR] Error generating metadata for question '{question}': {e}")
            return {
                "expected_keywords": ["communication", "experience"],
                "expected_concepts": ["Clear articulation", "Relevance to role"],
                "ideal_answer": "Candidate gives a clear, relevant, and well-structured answer.",
                "category": "Technical",
                "difficulty": "Medium",
                "skills": ["General"],
                "weight": 1.0
            }

    async def generate_metadata_async(self, question: str) -> dict:
        """Run the metadata generation in a background thread."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.generate_metadata, question)

