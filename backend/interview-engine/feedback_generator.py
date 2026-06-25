import os
from typing import List, Dict
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class FinalFeedbackReport(BaseModel):
    overall_score: int = Field(description="Overall cumulative score out of 100")
    communication_avg: int = Field(description="Overall average communication score (0-100)")
    technical_accuracy_avg: int = Field(description="Overall average technical accuracy score (0-100)")
    confidence_avg: int = Field(description="Overall average confidence score (0-100)")
    strengths: List[str] = Field(description="Key strengths demonstrated during the interview")
    areas_to_improve: List[str] = Field(description="Constructive and actionable areas for improvement")
    summary: str = Field(description="Comprehensive summary feedback of candidate's mock interview performance")

class FeedbackGenerator:
    """
    Generates a comprehensive final evaluation report after completing the interview session.
    """
    def __init__(self):
        self.ai = AIHelper()

    def generate_feedback(
        self, 
        target_role: str, 
        chat_history: List[Dict[str, str]], 
        evaluations: List[Dict[str, int]]
    ) -> FinalFeedbackReport:
        if not chat_history:
            return FinalFeedbackReport(
                overall_score=0,
                communication_avg=0,
                technical_accuracy_avg=0,
                confidence_avg=0,
                strengths=["Did not complete any questions."],
                areas_to_improve=["Participate in the interview session."],
                summary="No interview data provided."
            )

        # Pre-calculate averages to supply to the LLM
        comm_sum = sum(e.get("communication", 0) for e in evaluations)
        tech_sum = sum(e.get("technical_accuracy", 0) for e in evaluations)
        conf_sum = sum(e.get("confidence", 0) for e in evaluations)
        count = max(len(evaluations), 1)

        comm_avg = round(comm_sum / count)
        tech_avg = round(tech_sum / count)
        conf_avg = round(conf_sum / count)
        overall = round((comm_avg + tech_avg + conf_avg) / 3)

        # Format history for LLM context
        history_formatted = ""
        for turn in chat_history:
            role_label = "Interviewer" if turn.get("role") == "interviewer" else "Candidate"
            history_formatted += f"{role_label}: {turn.get('text')}\n"

        prompt = f"""
        Analyze the full transcript and question-by-question scoring of this mock interview for the "{target_role}" position.
        Generate structured, constructive final feedback.
        
        Calculated Averages (use these as reference or fill them in the output schema):
        - Communication Average: {comm_avg}
        - Technical Accuracy Average: {tech_avg}
        - Confidence Average: {conf_avg}
        - Calculated Overall Score: {overall}

        Full Interview Transcript:
        ---
        {history_formatted}
        ---

        Detailed Evaluations per question:
        {evaluations}
        """

        try:
            return self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=FinalFeedbackReport,
                system_prompt="You are a professional HR director assessing complete mock interview transcripts."
            )
        except Exception as e:
            print(f"Error in FeedbackGenerator: {e}")
            return FinalFeedbackReport(
                overall_score=overall,
                communication_avg=comm_avg,
                technical_accuracy_avg=tech_avg,
                confidence_avg=conf_avg,
                strengths=["Resilient interview presence"],
                areas_to_improve=["Provide deeper code-level examples"],
                summary="Fallback feedback report generated due to API issue."
            )
