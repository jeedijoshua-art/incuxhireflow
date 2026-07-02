import os
from typing import List, Dict
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class FinalInterviewReport(BaseModel):
    overall_score: int = Field(description="Overall cumulative score out of 100")
    technical_knowledge: int = Field(description="Overall average technical knowledge score (0-100)")
    communication: int = Field(description="Overall average communication score (0-100)")
    confidence: int = Field(description="Overall average confidence score (0-100)")
    problem_solving: int = Field(description="Overall average problem solving score (0-100)")
    concept_understanding: int = Field(description="Overall average concept understanding score (0-100)")
    keyword_coverage: int = Field(description="Overall average keyword coverage score (0-100)")
    knowledge_gaps: List[str] = Field(description="Synthesized knowledge gaps across the whole interview")
    strong_areas: List[str] = Field(description="Key strengths demonstrated during the interview")
    weak_areas: List[str] = Field(description="Constructive and actionable areas for improvement")
    recommended_learning: List[str] = Field(description="Recommended topics/resources to study")
    hiring_recommendation: str = Field(description="Recommendation for hiring (e.g. Strong Hire, Hire, Weak Hire, No Hire)")
    
    # Backwards compatibility fields for the UI/PDF generator
    answer_quality_avg: int = Field(default=0)
    keyword_match_avg: int = Field(default=0)
    concept_match_avg: int = Field(default=0)
    communication_avg: int = Field(default=0)
    confidence_avg: int = Field(default=0)
    telemetry_score: int = Field(default=0)
    strengths: List[str] = Field(default_factory=list)
    areas_to_improve: List[str] = Field(default_factory=list)
    summary: str = Field(default="")

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
    ) -> FinalInterviewReport:
        if not chat_history:
            return FinalInterviewReport(
                overall_score=0, technical_knowledge=0, communication=0, confidence=0,
                problem_solving=0, concept_understanding=0, keyword_coverage=0,
                knowledge_gaps=[], strong_areas=[], weak_areas=[], recommended_learning=[],
                hiring_recommendation="No interview data provided."
            )

        # Pre-calculate averages to supply to the LLM
        ans_sum = sum(e.get("answer_quality", 0) for e in evaluations)
        key_sum = sum(e.get("keyword_coverage", e.get("keyword_match", 0)) for e in evaluations)
        con_sum = sum(e.get("concept_coverage", e.get("concept_match", 0)) for e in evaluations)
        comm_sum = sum(e.get("communication_score", e.get("communication", 0)) for e in evaluations)
        conf_sum = sum(e.get("confidence", 0) for e in evaluations)
        
        telemetry_score = evaluations[0].get("telemetry_score", 0) if evaluations else 0
        
        count = max(len(evaluations), 1)

        ans_avg = round(ans_sum / count)
        key_avg = round(key_sum / count)
        con_avg = round(con_sum / count)
        comm_avg = round(comm_sum / count)
        conf_avg = round(conf_sum / count)
        
        # Determine overall combining everything + telemetry
        overall = round((ans_avg + key_avg + con_avg + comm_avg + conf_avg + telemetry_score) / 6)

        # Format history for LLM context
        history_formatted = ""
        for turn in chat_history:
            role_label = "Interviewer" if turn.get("role") == "interviewer" else "Candidate"
            history_formatted += f"{role_label}: {turn.get('text')}\n"

        prompt = f"""
        Analyze the full transcript and question-by-question scoring of this mock interview for the "{target_role}" position.
        Generate structured, constructive final feedback.
        
        Calculated Averages (use these as reference or fill them in the output schema):
        - Answer Quality (Technical Knowledge): {ans_avg}
        - Keyword Coverage: {key_avg}
        - Concept Understanding: {con_avg}
        - Communication: {comm_avg}
        - Confidence: {conf_avg}
        - Telemetry Score: {telemetry_score}
        - Calculated Overall Score: {overall}

        Full Interview Transcript:
        ---
        {history_formatted}
        ---

        Detailed Evaluations per question:
        {evaluations}
        """

        try:
            result = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=FinalInterviewReport,
                system_prompt="You are a professional HR director assessing complete mock interview transcripts."
            )
            
            # Map legacy fields for UI compatibility
            result.answer_quality_avg = result.technical_knowledge
            result.keyword_match_avg = result.keyword_coverage
            result.concept_match_avg = result.concept_understanding
            result.communication_avg = result.communication
            result.confidence_avg = result.confidence
            result.telemetry_score = telemetry_score
            result.strengths = result.strong_areas
            result.areas_to_improve = result.weak_areas
            result.summary = result.hiring_recommendation
            return result
            
        except Exception as e:
            print(f"Error in FeedbackGenerator: {e}")
            fallback = FinalInterviewReport(
                overall_score=overall, technical_knowledge=ans_avg, communication=comm_avg,
                confidence=conf_avg, problem_solving=con_avg, concept_understanding=con_avg,
                keyword_coverage=key_avg, knowledge_gaps=[], strong_areas=[], weak_areas=[],
                recommended_learning=[], hiring_recommendation="Fallback report generated due to API issue."
            )
            fallback.answer_quality_avg = fallback.technical_knowledge
            fallback.keyword_match_avg = fallback.keyword_coverage
            fallback.concept_match_avg = fallback.concept_understanding
            fallback.communication_avg = fallback.communication
            fallback.confidence_avg = fallback.confidence
            fallback.telemetry_score = telemetry_score
            return fallback

