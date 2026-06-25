import os
import sys
import argparse
import uuid
import json
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from speech_to_text import SpeechToText
from question_generator import StaticQuestionGenerator
from interview_flow import InterviewFlowManager, InterviewSessionState

def run_interview_simulation(resume_text: str, target_role: str, interactive: bool = False, max_questions: int = 10):
    # 1. Initialize State
    print("[*] Initializing Interview Flow...")
    session_id = str(uuid.uuid4())
    state = InterviewSessionState(
        session_id=session_id,
        target_role=target_role,
        resume_text=resume_text,
        total_questions=max_questions
    )
    flow = InterviewFlowManager(state)
    generator = StaticQuestionGenerator()
    stt = SpeechToText()

    # 2. Main Interview Loop
    while not flow.is_complete():
        q_idx = flow.state.current_question_index
        category = flow.get_current_category()
        
        # Generate question
        question = generator.generate_question(q_idx)
        
        flow.add_interviewer_question(question)
        
        print("\n" + "="*50)
        print(f"Question {q_idx}/{max_questions} [{category}]:")
        print("="*50)
        print(question)

        # Get Candidate Answer
        if interactive:
            print("\nCandidate Answer (type your response, or press Enter to record voice):")
            answer = input("> ").strip()
            if not answer:
                # Simulated voice capture
                print("[!] Voice mode requires audio file input. Enter text instead:")
                answer = input("> ").strip()
        else:
            # Automated simulation answers based on index
            simulated_answers = [
                "I am a Senior Software Engineer with 5 years of experience in Python, Django, and React. I specialize in cloud infrastructure.",
                "In my last project, I built a microservices pipeline using FastAPI and AWS Lambda. We reduced processing latency by 40% using Redis caching.",
                "My greatest strength is system design, but I am always trying to improve my knowledge of Kubernetes orchestration and container security."
            ]
            answer = simulated_answers[(q_idx - 1) % len(simulated_answers)]
            print(f"\nCandidate Answer (Simulated):\n{answer}")

        flow.add_candidate_answer(answer)

        # Advance Flow
        flow.advance_turn()

    # 3. Final Report Generation
    print("\n" + "="*50)
    print("GENERATING FINAL FEEDBACK REPORT...")
    print("="*50)
    report = {"status": "done"}
    print(json.dumps(report, indent=2))
    return report

def main():
    parser = argparse.ArgumentParser(description="HireFlow Interview Engine CLI Simulation")
    parser.add_argument("--interactive", action="store_true", help="Run interactive interview in console")
    parser.add_argument("--questions", type=int, default=3, help="Number of questions for this test session")
    parser.add_argument("--audio", type=str, default=None, help="Path to an audio file to transcribe via Whisper")
    parser.add_argument("--role", type=str, default="Senior AI Engineer", help="Target role")
    args = parser.parse_args()

    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

    # If audio transcription is requested specifically
    if args.audio:
        print(f"[*] Transcribing audio file: {args.audio}")
        try:
            stt = SpeechToText()
            text = stt.transcribe(args.audio)
            print("\nTranscription Result:")
            print("="*50)
            print(text)
            print("="*50)
        except Exception as e:
            print(f"Audio transcription failed: {e}")
        return

    # Sample resume text for context
    sample_resume = """
    John Doe
    Email: john.doe@example.com
    Role: Senior Software Engineer
    
    Skills: Python, Go, Kubernetes, AWS, FastAPI, PostgreSQL, System Design
    
    Experience:
    - Tech Lead at CloudScale (2022 - Present)
      Led a team of 4 engineers to migrate monolith architecture to FastAPI microservices.
      Designed and implemented scalable databases handling 10k requests per second.
    - Software Engineer at DevCorp (2020 - 2022)
      Developed rest APIs using Go and PostgreSQL.
    """

    try:
        run_interview_simulation(
            resume_text=sample_resume,
            target_role=args.role,
            interactive=args.interactive,
            max_questions=args.questions
        )
    except Exception as e:
        print(f"\n[!] Error during interview run: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
