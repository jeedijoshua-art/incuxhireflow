import os
from typing import List, Dict
from ai_helper import AIHelper

class StaticQuestionGenerator:
    """
    Provides interview questions from a fixed question bank.
    """
    def __init__(self):
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
        print("[QUESTION_BANK_LOADED] Static question bank successfully loaded.")
        print(f"[TOTAL_QUESTIONS] {len(self.question_bank)}")

    def generate_question(
        self, 
        question_index: int,
    ) -> str:
        """
        Return the question for the current index (1-indexed).
        """
        print(f"[CURRENT_QUESTION_INDEX] {question_index}")
        if 1 <= question_index <= len(self.question_bank):
            question = self.question_bank[question_index - 1]
            print(f"[CURRENT_QUESTION] {question}")
            return question
        return "Thank you for answering those questions. We are done."
