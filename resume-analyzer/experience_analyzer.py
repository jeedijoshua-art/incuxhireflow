"""Estimate years of experience and seniority level from resume text."""
import re


def analyze_experience(text: str) -> dict:
    """Heuristic: scan for date ranges like '2020-2023', '2022 - Present'.
    Returns estimated years + seniority label."""
    text = text or ""
    years = _estimate_years(text)
    return {
        "estimated_years": years,
        "seniority": _seniority_label(years),
        "internships": _count_internships(text),
        "projects": _count_projects(text),
    }


def _estimate_years(text: str) -> float:
    # Look for "X years of experience" first
    m = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience", text, re.I)
    if m:
        return float(m.group(1))
    # Sum date ranges
    ranges = re.findall(r"(\d{4})\s*[-–to]+\s*(\d{4}|present|current)", text, re.I)
    total = 0
    for start, end in ranges:
        s = int(start)
        e = 2026 if end.lower() in ("present", "current") else int(end)
        if 1990 < s <= 2026 and s <= e:
            total += e - s
    return float(total)


def _seniority_label(years: float) -> str:
    if years < 1: return "Fresher"
    if years < 3: return "Junior"
    if years < 6: return "Mid"
    if years < 10: return "Senior"
    return "Lead/Principal"


def _count_internships(text: str) -> int:
    return len(re.findall(r"\bintern(?:ship)?\b", text, re.I))


def _count_projects(text: str) -> int:
    return len(re.findall(r"\bproject\b", text, re.I))
