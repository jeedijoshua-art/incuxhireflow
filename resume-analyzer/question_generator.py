"""Suggests resume-specific interview questions for the interviewer to use."""


def suggest_questions(resume_text: str, skills: dict, experience: dict) -> list[str]:
    questions = []
    # Skill-anchored
    for category, items in (skills or {}).items():
        for skill in items[:2]:
            questions.append(f"Tell me about a project where you used {skill}.")
    # Experience-anchored
    if experience and experience.get("internships", 0) > 0:
        questions.append("Walk me through the most impactful project from your internship.")
    if experience and experience.get("projects", 0) > 0:
        questions.append("Pick the project you're most proud of and explain it end-to-end.")
    # General resume probe
    questions.append("Where do you see yourself professionally in 2-3 years?")
    return questions[:15]
