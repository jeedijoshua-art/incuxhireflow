import os
import json
from typing import List
from pydantic import BaseModel, Field
from ai_helper import AIHelper
from skill_extractor import SkillExtractor
from experience_analyzer import ExperienceAnalyzer


class GeneratedQuestion(BaseModel):
    question_text: str = Field(description="The interview question")
    difficulty: str = Field(description="Difficulty level (e.g. Easy, Medium, Hard)")
    category: str = Field(default="Technical", description="Question category, e.g., HR, Technical, Behavioral.")
    expected_keywords: List[str] = Field(default_factory=list, description="Keywords expected in a strong answer")
    expected_concepts: List[str] = Field(default_factory=list, description="Core concepts the candidate should demonstrate understanding of")
    ideal_answer: str = Field(default="", description="A concise ideal answer for this question")
    skills: List[str] = Field(default_factory=list, description="Target skills tested by this question")
    weight: float = Field(default=1.0, description="Relative weight of this question for overall scoring")
    
    # Legacy fields
    detected_skill: str = Field(default="")
    detected_technology: str = Field(default="")
    role: str = Field(default="")
    topic: str = Field(default="")


class QuestionGenerationResult(BaseModel):
    questions: List[GeneratedQuestion] = Field(description="List of custom generated questions")

class QuestionGenerator:
    """
    Generates customized, resume-anchored interview questions based on the candidate's resume and target role.
    """
    def __init__(self):
        self.ai = AIHelper()
        self.question_bank = [
            "Tell me about yourself. Please cover your name, education, specialization, current projects, technical skills, achievements, career goals, and why you are interested in this role.",
            "Can you walk me through one project you are most proud of and explain your contribution to it?",
            "Tell me about a challenging problem you faced during a project and how you solved it.",
            "What is the difference between a Primary Key and a Foreign Key?",
            "What is the difference between a Compiler and an Interpreter?",
            "What is the difference between Method Overloading and Method Overriding?",
            "What programming language are you most comfortable with and why?",
            "Describe a situation where you had to learn a new technology quickly to complete a task or project.",
            "How would you approach solving a problem if you do not know the answer immediately?",
            "Why should we hire you for this role?"
        ]

    def generate_question(self, question_index: int) -> str:
        """
        Return the question for the current index (1-indexed) for recruiter mode.
        """
        print(f"[CURRENT_QUESTION_INDEX] {question_index}")
        if 1 <= question_index <= len(self.question_bank):
            question = self.question_bank[question_index - 1]
            print(f"[CURRENT_QUESTION] {question}")
            return question
        return "Thank you for answering those questions. We are done."

    def generate_questions(self, resume_text: str, target_role: str, skills: list = None, experience_years: int = 0):
        print("[RESUME_AI] Resume analysis completed.")
        if not resume_text:
            raise Exception("Unable to generate personalized Resume AI interview questions.")
            
        skills = skills or []
        
        prompt = f"""
You are conducting a {target_role} interview.

Generate exactly 10 interview questions based ONLY on the candidate's uploaded resume.
Your questions must feel like a real interviewer.

Strict Question Order and Rules:
- Question 1 MUST be exactly: "Tell me about yourself."
- Question 2 MUST be: "Tell me about your best project." (You MUST reference a specific project found inside the uploaded resume).
- Questions 3 through 9 MUST be generated dynamically based on the resume. Ask about their specific skills, projects, languages, frameworks, and experience. Adapt completely to their technologies (e.g., if the resume contains React, ask a React question). Never ask generic or unrelated questions.
- Question 10 MUST be exactly: "Why should we hire you?"

Return ONLY valid JSON.
No markdown. No explanations. No code fences.
Return ONLY:
{{
  "questions":[
    {{
      "question_text":"...",
      "difficulty":"Medium",
      "detected_skill": "React",
      "detected_technology": "React.js",
      "expected_keywords": ["hooks", "state", "props"],
      "expected_concepts": ["Component Lifecycle", "State Management"],
      "role": "Frontend Developer",
      "topic": "React Hooks"
    }}
  ]
}}

Target Role: {target_role}
Skills: {skills}
Experience Years: {experience_years}

Resume Content:
---
{resume_text}
---
"""
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            print(f"[QUESTION_GENERATOR] Generation Attempt {attempt}")
            raw_text = ""
            try:
                # Use generate_text so we can capture the raw response for logging
                raw_text = self.ai.generate_text(
                    prompt=prompt,
                    system_prompt="You are a Senior Technical Interviewer."
                )
                
                # Clean up potential markdown code blocks if the LLM ignores instructions
                clean_text = raw_text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                parsed_json = json.loads(clean_text)
                result = QuestionGenerationResult.model_validate(parsed_json)
                
                print("[QUESTION_GENERATOR] Successfully Parsed")
                
                # Validation
                if not result.questions:
                    raise ValueError("No questions generated.")
                    
                if len(result.questions) != 10:
                    raise ValueError(f"Expected 10 questions, got {len(result.questions)}")
                
                q_texts = [q.question_text.strip() for q in result.questions]
                q_texts_lower = [q.lower() for q in q_texts]
                
                if any(not q for q in q_texts):
                    raise ValueError("Contains empty questions.")
                
                if len(set(q_texts_lower)) != len(q_texts_lower):
                    raise ValueError("Contains duplicate questions.")
                
                print("[QUESTION_GENERATOR] Validation Passed")
                print(f"[QUESTION_GENERATOR] 10 tailored questions generated.")
                print("[INTERVIEW_MODE] resume-ai")
                print("[QUESTION_SOURCE] Resume AI")
                
                return result.questions
                
            except Exception as e:
                print(f"[QUESTION_GENERATOR] Parsing or Validation Failed: {e}")
                print(f"[QUESTION_GENERATOR] Raw LLM Response:\n{raw_text}")
                if attempt == max_retries:
                    print("[QUESTION_GENERATOR] Falling back to default resume AI question bank due to AI generation failure.")
                    return [
                        GeneratedQuestion(
                            question_text=q,
                            difficulty="Medium",
                            category="Technical" if idx > 1 and idx < 9 else "HR",
                            expected_keywords=["clarity", "structure"],
                            expected_concepts=["communication", "reasoning"],
                            ideal_answer="Provide a clear, structured response with examples and relevant experience.",
                            skills=["communication"],
                            weight=1.0,
                            detected_skill="General",
                            detected_technology=target_role,
                            role=target_role,
                            topic="Interview Question"
                        )
                        for idx, q in enumerate(self.question_bank, start=1)
                    ]

