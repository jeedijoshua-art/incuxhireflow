import os
from typing import List, Dict
from ai_helper import AIHelper
from pydantic import BaseModel, Field

class QuestionWithExpectedAnswer(BaseModel):
    question: str = Field(description="The interview question")
    expected_answer: str = Field(description="The expected or ideal answer to the question")

class StaticQuestionGenerator:
    """
    Provides interview questions from a fixed question bank with expected answers.
    """
    def __init__(self):
        self.ai = AIHelper()
        self.question_bank = [
            {
                "question": "Tell me about yourself. Please cover your name, education, specialization, current projects, technical skills, achievements, career goals, and why you are interested in this role.",
                "expected_answer": "Candidate should clearly introduce themselves, covering educational background, relevant specialization, ongoing or recent projects, key technical skills (programming languages, frameworks, tools), notable achievements (academic, professional, or personal projects), career aspirations, and genuine interest in the role/company."
            },
            {
                "question": "Can you walk me through one project you are most proud of and explain your contribution to it?",
                "expected_answer": "Candidate should use a structured approach (e.g., STAR method: Situation, Task, Action, Result) to describe the project context, their specific responsibilities and contributions, technical challenges overcome, and measurable outcomes or impacts of the project."
            },
            {
                "question": "Tell me about a challenging problem you faced during a project and how you solved it.",
                "expected_answer": "Candidate should describe a specific technical or non-technical challenge, explain their problem-solving approach, steps taken to resolve it, what they learned, and how they applied that learning to future work."
            },
            {
                "question": "What is the difference between a Primary Key and a Foreign Key?",
                "expected_answer": "A Primary Key is a unique identifier for each record in a table, ensures no duplicate or null values, and identifies records within the same table. A Foreign Key is a field in one table that references the Primary Key of another table, establishes relationships between tables, and can have duplicates or null values (depending on constraints)."
            },
            {
                "question": "What is the difference between a Compiler and an Interpreter?",
                "expected_answer": "A Compiler translates entire source code into machine code (or intermediate code) before execution, resulting in faster execution but requires compilation time. An Interpreter translates and executes code line by line, is more flexible for debugging, but generally has slower execution speed compared to compiled code."
            },
            {
                "question": "What is the difference between Method Overloading and Method Overriding?",
                "expected_answer": "Method Overloading occurs in the same class with multiple methods having the same name but different parameters (signature). Method Overriding occurs in a subclass where a method has the same name, parameters, and return type as a method in its superclass, allowing the subclass to provide a specific implementation."
            },
            {
                "question": "What programming language are you most comfortable with and why?",
                "expected_answer": "Candidate should name a specific language, explain their experience with it, key features they appreciate, use cases where they've applied it, and why it's suitable for their work or projects."
            },
            {
                "question": "Describe a situation where you had to learn a new technology quickly to complete a task or project.",
                "expected_answer": "Candidate should describe the technology, the time constraint, their learning strategy (resources used, practice approach), how they applied it to the task, and the outcome of their efforts."
            },
            {
                "question": "How would you approach solving a problem if you do not know the answer immediately?",
                "expected_answer": "Candidate should demonstrate problem-solving skills: clarify requirements, break down the problem, research/seek information, consider multiple approaches, test solutions incrementally, ask for help when needed, and reflect on the process."
            },
            {
                "question": "Why should we hire you for this role?",
                "expected_answer": "Candidate should align their skills, experience, and strengths with the role requirements, show enthusiasm for the company, and highlight what makes them a unique and valuable addition to the team."
            }
        ]
        print("[QUESTION_BANK_LOADED] Static question bank with expected answers successfully loaded.")
        print(f"[TOTAL_QUESTIONS] {len(self.question_bank)}")

    def generate_question(
        self, 
        question_index: int,
    ) -> QuestionWithExpectedAnswer:
        """
        Return the question and expected answer for the current index (1-indexed).
        """
        print(f"[CURRENT_QUESTION_INDEX] {question_index}")
        if 1 <= question_index <= len(self.question_bank):
            item = self.question_bank[question_index - 1]
            question = item["question"]
            expected_answer = item["expected_answer"]
            print(f"[CURRENT_QUESTION] {question}")
            return QuestionWithExpectedAnswer(question=question, expected_answer=expected_answer)
        return QuestionWithExpectedAnswer(
            question="Thank you for answering those questions. We are done.",
            expected_answer=""
        )
