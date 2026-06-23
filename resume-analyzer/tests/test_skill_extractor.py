"""Tests for skill_extractor."""
from skill_extractor import extract_skills


def test_extracts_python_and_react():
    text = "I'm proficient in Python and React, also worked with PostgreSQL."
    out = extract_skills(text)
    assert "python" in out.get("languages", [])
    assert "react" in out.get("frameworks", [])
    assert "postgresql" in out.get("databases", [])


def test_empty_returns_empty():
    assert extract_skills("") == {}
