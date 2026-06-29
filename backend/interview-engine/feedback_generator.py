import os
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from ai_helper import AIHelper

class QuestionTurnResult(BaseModel):
    question: str
    expected_answer: str
    candidate_answer: str
    evaluation: Optional[Dict]

class FinalFeedbackReport(BaseModel):
    overall_score: int = Field(description="Overall cumulative score out of 100")
    communication_avg: int = Field(description="Overall average communication score (0-100)")
    technical_accuracy_avg: int = Field(description="Overall average technical accuracy score (0-100)")
    confidence_avg: int = Field(description="Overall average confidence score (0-100)")
    strengths: List[str] = Field(description="Key strengths demonstrated during the interview")
    areas_to_improve: List[str] = Field(description="Constructive and actionable areas for improvement")
    summary: str = Field(description="Comprehensive summary feedback of candidate's mock interview performance")
    answer_mismatches: List[str] = Field(description="Specific list of questions where the candidate's answer did not match the expected answer, with details on what was missing or incorrect")
    question_turns: List[QuestionTurnResult] = Field(description="Full list of question turns with expected answers and evaluations")

class FeedbackGenerator:
    """
    Generates a comprehensive final evaluation report after completing the interview session.
    """
    def __init__(self):
        self.ai = AIHelper()
    
    def _rule_based_generate_feedback(
        self, 
        target_role: str, 
        chat_history: List[Dict[str, str]], 
        evaluations: List[Dict],
        question_turns: List[Dict]
    ) -> FinalFeedbackReport:
        # Pre-calculate averages
        comm_sum = sum(e.get("communication", 0) for e in evaluations)
        tech_sum = sum(e.get("technical_accuracy", 0) for e in evaluations)
        conf_sum = sum(e.get("confidence", 0) for e in evaluations)
        count = max(len(evaluations), 1)

        comm_avg = round(comm_sum / count)
        tech_avg = round(tech_sum / count)
        conf_avg = round(conf_sum / count)
        overall = round((comm_avg + tech_avg + conf_avg) / 3)
        
        # Generate strengths
        strengths = []
        if comm_avg >= 70:
            strengths.append("Good communication skills")
        if tech_avg >= 70:
            strengths.append("Strong technical knowledge")
        if conf_avg >= 70:
            strengths.append("Confident demeanor")
        if not strengths:
            strengths.append("Completed the interview")
        
        # Generate areas to improve
        areas = []
        if comm_avg < 70:
            areas.append("Work on clearer communication")
        if tech_avg < 70:
            areas.append("Improve technical knowledge and accuracy")
        if conf_avg < 70:
            areas.append("Practice speaking more confidently")
        if not areas:
            areas.append("Keep up the good work!")
        
        # Generate summary
        summary = f"Overall performance score: {overall}%. "
        if overall >= 80:
            summary += "Excellent job! You demonstrated strong interview skills."
        elif overall >= 60:
            summary += "Good effort! There are some areas you can improve."
        else:
            summary += "Needs improvement. Focus on the areas listed below."
        
        # Collect answer mismatches
        answer_mismatches = []
        for i, (eval_item, qt) in enumerate(zip(evaluations, question_turns)):
            candidate_answer = (qt.get("candidate_answer") or "").strip()
            explanation = (eval_item.get("explanation") or "").lower()
            if not candidate_answer or "skipped" in explanation or "not attempted" in explanation:
                answer_mismatches.append(f"Question {i + 1}: Not attempted")
                continue

            mismatch = eval_item.get("expected_answer_match", "")
            if mismatch and mismatch != "Not attempted":
                answer_mismatches.append(f"Question {i + 1}: {mismatch}")
        
        if not answer_mismatches:
            answer_mismatches = ["No significant mismatches found"]
            
        # Prepare question turns
        q_turns = []
        for qt in question_turns:
            q_turns.append(QuestionTurnResult(
                question=qt.get("question", ""),
                expected_answer=qt.get("expected_answer", ""),
                candidate_answer=qt.get("candidate_answer", ""),
                evaluation=qt.get("evaluation")
            ))
        
        return FinalFeedbackReport(
            overall_score=overall,
            communication_avg=comm_avg,
            technical_accuracy_avg=tech_avg,
            confidence_avg=conf_avg,
            strengths=strengths,
            areas_to_improve=areas,
            summary=summary,
            answer_mismatches=answer_mismatches,
            question_turns=q_turns
        )

    def generate_feedback(
        self, 
        target_role: str, 
        chat_history: List[Dict[str, str]], 
        evaluations: List[Dict],
        question_turns: List[Dict]
    ) -> FinalFeedbackReport:
        if not chat_history:
            return FinalFeedbackReport(
                overall_score=0,
                communication_avg=0,
                technical_accuracy_avg=0,
                confidence_avg=0,
                strengths=["Did not complete any questions."],
                areas_to_improve=["Participate in the interview session."],
                summary="No interview data provided.",
                answer_mismatches=[],
                question_turns=[]
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
        Be completely honest and direct - no sugarcoating. If the candidate performed poorly, say so clearly.
        
        CRITICAL INSTRUCTION FOR ANSWER MISMATCHES:
        For `answer_mismatches`, create a bulleted list of mismatches for EACH question.
        HOWEVER, if the candidate completely skipped or did not attempt a question (e.g., candidate_answer is empty, or explanation says 'Question was skipped', or it was padded as unattempted), the `answer_mismatches` entry for that specific question MUST be EXACTLY: "Question [X]: Not attempted". Do not write any other text like "missing points" or "did not cover" for that question.
        
        Calculated Averages (use these as reference or fill them in the output schema):
        - Communication Average: {comm_avg}
        - Technical Accuracy Average: {tech_avg}
        - Confidence Average: {conf_avg}
        - Calculated Overall Score: {overall}

        Full Interview Transcript:
        ---
        {history_formatted}
        ---

        Detailed Evaluations per question (including expected answer comparisons):
        {evaluations}
        
        Question Turns (with expected answers):
        {question_turns}
        """
        
        # Prepare question turns for output
        q_turns = []
        for qt in question_turns:
            q_turns.append(QuestionTurnResult(
                question=qt.get("question", ""),
                expected_answer=qt.get("expected_answer", ""),
                candidate_answer=qt.get("candidate_answer", ""),
                evaluation=qt.get("evaluation")
            ))

        try:
            report = self.ai.generate_structured_output(
                prompt=prompt,
                schema_class=FinalFeedbackReport,
                system_prompt="You are a strict, honest professional HR director assessing complete mock interview transcripts. Provide direct, critical feedback when answers don't meet expectations. Do not give fake praise."
            )
            report.question_turns = q_turns
            return report
        except Exception as e:
            print(f"Error in FeedbackGenerator (using fallback): {e}")
            return self._rule_based_generate_feedback(target_role, chat_history, evaluations, question_turns)
