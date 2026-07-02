import os
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class QuestionResult(BaseModel):
    answer_quality: int = Field(description="Score for overall correctness, relevance, completeness and logical flow (0-100)")
    keyword_coverage: int = Field(description="Score representing percentage of expected keywords matched (0-100)")
    concept_coverage: int = Field(description="Score representing percentage of expected concepts understood (0-100)")
    communication: int = Field(description="Score for communication clarity, explanation, grammar, structure, confidence (0-100)")
    technical_depth: str = Field(description="One of: Beginner, Intermediate, Advanced, Expert")
    knowledge_gaps: List[str] = Field(description="Intelligent knowledge gaps inferred. E.g. 'State Management', 'Lifecycle', NOT just missing keywords.")
    strengths: List[str] = Field(description="Candidate's strengths in this answer.")
    needs_improvement: List[str] = Field(description="Areas where the candidate needs improvement in this answer.")
    confidence: int = Field(default=75, description="Confidence score fallback")
    keyword_match: int = Field(default=75, description="Legacy field mapped from keyword_coverage")
    concept_match: int = Field(default=75, description="Legacy field mapped from concept_coverage")
    explanation: str = Field(default="", description="Legacy field")

class CandidateEvaluator:
    """
    Evaluates candidate answers in real-time, providing scores for communication, technical accuracy, and confidence.
    """
    def __init__(self):
        self.ai = AIHelper()

    def evaluate_answer(self, question: str, answer: str, metadata: dict, target_role: str = "Candidate") -> QuestionResult:
        if not question or not answer:
            return QuestionResult(
                answer_quality=0, keyword_coverage=0, concept_coverage=0, communication=0, 
                technical_depth="Beginner", knowledge_gaps=["Empty answer"], strengths=[], needs_improvement=["Provide an answer"]
            )
        
        expected_keywords = metadata.get("expected_keywords", [])
        expected_concepts = metadata.get("expected_concepts", [])
        ideal_answer = metadata.get("ideal_answer", "")
        
        prompt = f"""
        Evaluate the candidate's answer to the following interview question for a target role of: "{target_role}".
        Score the answer based on:
        1. Answer Quality: Correctness, relevance, completeness, and logical flow (0-100).
        2. Keyword Coverage: Percentage of expected keywords matched (0-100).
        3. Concept Understanding: Percentage of expected concepts understood via semantic meaning, not just exact keywords (0-100).
        4. Knowledge Gap Detection: Infer missing conceptual gaps (e.g. 'State Management', 'Referential Integrity'), not just missing words.
        5. Communication: Clarity, explanation, grammar, structure, and confidence (0-100).
        6. Technical Depth: Beginner, Intermediate, Advanced, Expert.
        7. Strengths & Needs Improvement: Provide brief bullet points.
        
        Question:
        {question}

        Expected Keywords: {expected_keywords}
        Expected Concepts: {expected_concepts}
        Ideal Answer context: {ideal_answer}

        Candidate Answer:
        {answer}
        """
        
        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=QuestionResult,
                system_prompt="You are a senior technical evaluator grading mock interview responses."
            )
            result.keyword_match = result.keyword_coverage
            result.concept_match = result.concept_coverage
            result.confidence = result.communication
            # We add explanation as a dynamic attribute to not break validation, or since it's missing from schema it might fail if we don't add it.
            # Actually, QuestionResult schema should have explanation! I will patch the schema.
            return result
        except Exception as e:
            print(f"Error in CandidateEvaluator: {e}")
            fallback = QuestionResult(
                answer_quality=75,
                keyword_coverage=75,
                concept_coverage=75,
                communication=75,
                technical_depth="Intermediate",
                knowledge_gaps=[],
                strengths=["Responded to question"],
                needs_improvement=["API fallback triggered"]
            )
            fallback.keyword_match = 75
            fallback.concept_match = 75
            fallback.confidence = 75
            fallback.explanation = "Fallback score due to API error."
            return fallback

