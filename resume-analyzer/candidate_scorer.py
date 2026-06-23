"""Aggregates skills + experience + job match into a single candidate score."""


def score_candidate(skills: dict, experience: dict, match: dict | None) -> dict:
    skill_count = sum(len(v) for v in skills.values()) if skills else 0
    years = experience.get("estimated_years", 0) if experience else 0
    match_pct = match.get("match_percent", 0) if match else 0

    skill_score = min(100, skill_count * 4)
    exp_score = min(100, years * 12)
    final = round(0.40 * skill_score + 0.30 * exp_score + 0.30 * match_pct)
    return {
        "skill_score": skill_score,
        "experience_score": exp_score,
        "match_score": match_pct,
        "final_score": final,
        "verdict": _verdict(final),
    }


def _verdict(score: int) -> str:
    if score >= 80: return "Strong fit"
    if score >= 60: return "Good fit"
    if score >= 40: return "Possible fit"
    return "Weak fit"
