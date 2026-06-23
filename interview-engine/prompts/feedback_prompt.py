"""System prompt builder for final feedback generation."""


def build_feedback_prompt(
    session: dict,
    early: bool = False,
    answered: int = 15,
    skipped: int = 0,
) -> str:
    early_note = ""
    if early:
        early_note = (
            f"\nThe interview ended early. The candidate answered {answered} of 15 "
            f"questions ({skipped} skipped).\n"
            f"Start the report with: **Interview Progress: {answered} of 15 questions answered · "
            f"{skipped} skipped**\n"
            f"For sections with too little data, write "
            f"\"Limited data — only {answered} questions answered.\"\n"
        )

    bad_answers = session.get("bad_answers") or []
    bad_section = ""
    if bad_answers:
        joined = "\n".join(f"  - {b}" for b in bad_answers)
        bad_section = (
            "\n\nTRACKED BAD-ANSWER INCIDENTS DURING THIS INTERVIEW "
            "(use these in Red Flags and Areas to Improve):\n" + joined + "\n"
        )

    return f"""Produce a comprehensive, HONEST, and SINCERE interview feedback report.
Do NOT inflate scores. If the candidate did poorly, say so directly.
Use this exact structure with markdown bold:
{early_note}
**Self-Introduction Coverage** — ✓ Covered / ✗ Missed for EACH of the 7 points
(use plain names: Name + education + specialization · Current work / projects · Key skills ·
Standout achievement · Target role · Why a good fit · Career direction)

**Behavioral Assessment** — calm vs tense, hesitation, pauses, filler words ("um", "uh"),
signs of nervousness or composure

**Answer Quality** — specific vs vague, use of STAR method, factual accuracy,
real depth vs surface-level

**Way of Speaking (Delivery)** — clarity, pacing, vocabulary, sentence structure,
professionalism

**Strengths** — 3-5 specific bullets citing actual moments from the interview

**Faults / Areas to Improve** — 3-5 specific bullets with concrete fix advice
(include any off-topic / off-resume / nonsense incidents)

**Red Flags** — list each off-topic / off-resume / bluffing / contradictory answer
observed during the interview. If none, write "None observed."

**Resume Alignment** — how well their answers matched what's on the resume,
and whether claims were credible

**Technical Depth** — assessment of depth shown on resume-listed technologies

**Communication & Confidence** — one-line summary of clarity + confidence level

**Hiring Recommendation** — exactly one of:
"Strong Hire" | "Hire" | "Maybe — needs more practice" | "Do not hire at this level"
+ a one-sentence justification.

**Overall Score: X/10**

Be brutally honest. A weak performance deserves 4-5/10, not 7+.{bad_section}
"""
