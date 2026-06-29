import os
import re
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class AnswerEvaluation(BaseModel):
    communication: int = Field(description="Score for communication clarity and articulation (0-100)")
    technical_accuracy: int = Field(description="Score for correctness, depth of knowledge, and technical validity (0-100)")
    confidence: int = Field(description="Score representing candidate confidence level (0-100)")
    explanation: str = Field(description="Brief assessment of what was good and what was lacking in this specific answer")
    expected_answer_match: str = Field(description="Specific feedback on how the candidate's answer compares to the expected answer, including any mismatches or missing points")
    expected_answer: str = Field(description="The expected answer that was used for comparison")

class CandidateEvaluator:
    """
    Evaluates candidate answers in real-time, providing scores for communication, technical accuracy, and confidence,
    and comparing against expected answers.
    """
    def __init__(self):
        self.ai = AIHelper()
    
    def _count_keywords(self, answer: str, keywords: list) -> int:
        answer_lower = answer.lower()
        count = 0
        for keyword in keywords:
            if keyword.lower() in answer_lower:
                count += 1
        return count
    
    def _rule_based_evaluate(self, question: str, answer: str, expected_answer: str) -> AnswerEvaluation:
        answer_lower = answer.lower()
        expected_lower = expected_answer.lower()
        
        # Calculate communication score based on length and punctuation
        word_count = len(answer.split())
        communication = min(100, max(10, word_count * 3))
        
        # Extract keywords from expected answer
        keywords = re.findall(r'\b[a-zA-Z]{3,}\b', expected_lower)
        keyword_matches = self._count_keywords(answer, keywords)
        
        # Technical accuracy based on keyword matches
        keyword_ratio = keyword_matches / max(1, len(keywords))
        technical_accuracy = int(keyword_ratio * 100)
        
        # Confidence based on answer length and presence of positive language
        confidence = min(100, max(20, word_count * 2 + (10 if "i" in answer_lower or "my" in answer_lower else 0)))
        
        # Generate explanation and expected answer match
        missing_points = []
        if keyword_ratio < 0.3:
            explanation = "Your answer is very short and doesn't address the key points of the question."
            missing_points.append("Answer is too brief")
        elif keyword_ratio < 0.6:
            explanation = "Your answer covers some basic points but misses important details."
        else:
            explanation = "Your answer covers most of the key points."
        
        # Find missing keywords
        for keyword in keywords[:10]:
            if keyword.lower() not in answer_lower:
                missing_points.append(f"Missing: {keyword}")
        
        expected_answer_match = ""
        if missing_points:
            expected_answer_match = f"Your answer did not cover these key points from the expected answer: {', '.join(missing_points)}. Expected answer includes: {expected_answer}"
        else:
            expected_answer_match = "Your answer covered most of the expected key points."
        
        return AnswerEvaluation(
            communication=communication,
            technical_accuracy=technical_accuracy,
            confidence=confidence,
            explanation=explanation,
            expected_answer_match=expected_answer_match,
            expected_answer=expected_answer
        )

    def evaluate_answer(
        self, 
        question: str, 
        answer: str, 
        expected_answer: str,
        target_role: str = "Candidate"
    ) -> AnswerEvaluation:
        if not question:
            return AnswerEvaluation(
                communication=0, 
                technical_accuracy=0, 
                confidence=0, 
                explanation="No question provided.",
                expected_answer_match="No question available.",
                expected_answer=expected_answer
            )
        if not answer or answer.strip() == "":
            return AnswerEvaluation(
                communication=0, 
                technical_accuracy=0, 
                confidence=0, 
                explanation="Did not answer this question.",
                expected_answer_match="Not attempted",
                expected_answer=expected_answer
            )
        
        prompt = f"""
        Evaluate the candidate's answer to the following interview question for a target role of: "{target_role}".
        Be completely honest and critical - do not give fake praise. If the answer is poor, say so clearly.
        
        Score the answer based on:
        1. Communication: how clearly, structured, and articulately they answered. (0-100)
        2. Technical Accuracy: correctness and validity of the information given. (0-100)
        3. Confidence: how self-assured, conversational, and direct the tone was. (0-100)
        
        Compare the candidate's answer DIRECTLY to the expected answer.
        - If the candidate's answer is missing key points from the expected answer, explicitly list what's missing.
        - If the candidate's answer contains incorrect information that contradicts the expected answer, point it out clearly.
        - If the answer matches or exceeds the expected answer, acknowledge that.
        
        Question:
        {question}

        Expected Answer:
        {expected_answer}

        Candidate Answer:
        {answer}
        """
        
        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=AnswerEvaluation,
                system_prompt="You are a strict, honest senior technical evaluator grading mock interview responses. Do not sugarcoat feedback - be direct and critical when answers don't meet expectations."
            )
            result.expected_answer = expected_answer
            return result
        except Exception as e:
            print(f"Error in CandidateEvaluator (using fallback): {e}")
            return self._rule_based_evaluate(question, answer, expected_answer)
