"""Per-answer evaluation: relevance, technical depth, behavioural & resume signals.

Used by interview_flow to track bad answers in real time. Returns:
    - relevance   : 0-100 (does answer address the question?)
    - resume_match: 0-100 (does answer reflect actual resume content?)
    - depth       : 0-100 (technical depth shown)
    - communication: 0-100 (clarity / structure)
    - off_topic   : bool  (nonsense / completely unrelated)
    - off_resume  : bool  (claims experience NOT in resume)
"""
import re


# Phrases that strongly indicate the candidate is bluffing about experience
_BLUFF_PHRASES = (
    r"\bi\s+have\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+of\b",
    r"\bi\s+worked\s+at\s+\w+\s+for\s+\d+\s+years?\b",
    r"\bi\s+have\s+a\s+(master'?s|phd|doctorate)\b",
)


class CandidateEvaluator:
    """Evaluates each candidate answer in real time during the interview."""

    def evaluate(self, question: str, answer: str, resume: str) -> dict:
        words = answer.split()
        word_count = len(words)
        return {
            "relevance":     self._score_relevance(question, answer, word_count),
            "resume_match":  self._score_resume_match(resume, answer),
            "depth":         min(95, 25 + word_count * 1.4),
            "communication": min(95, 20 + word_count * 1.6),
            "off_topic":     self._is_off_topic(question, answer, word_count),
            "off_resume":    self._is_off_resume(resume, answer),
            "word_count":    word_count,
        }

    # ----- relevance & topic -----

    def _score_relevance(self, question: str, answer: str, word_count: int) -> int:
        if not answer or word_count < 3:
            return 10
        # Pull content words from the question; how many appear in the answer
        q_words = self._content_words(question)
        a_words = set(self._content_words(answer))
        if not q_words:
            return 70
        overlap = sum(1 for w in q_words if w in a_words)
        return min(95, 50 + overlap * 8)

    def _is_off_topic(self, question: str, answer: str, word_count: int) -> bool:
        # Very short or empty = off-topic
        if word_count < 3:
            return True
        # Gibberish: long answer with almost no recognisable English words
        letters = sum(c.isalpha() for c in answer)
        if letters and (letters / max(1, len(answer))) < 0.45:
            return True
        # No content-word overlap AND no honest "I don't know"
        if not re.search(r"\b(i\s+don'?t\s+know|not\s+sure|no\s+idea)\b", answer.lower()):
            q_words = set(self._content_words(question))
            a_words = set(self._content_words(answer))
            if q_words and len(q_words & a_words) == 0 and word_count > 5:
                return True
        return False

    # ----- resume relevance -----

    def _score_resume_match(self, resume: str, answer: str) -> int:
        if not resume or not answer:
            return 0
        resume_terms = set(self._content_words(resume))
        answer_terms = set(self._content_words(answer))
        overlap = len(resume_terms & answer_terms)
        return min(95, 25 + overlap * 2)

    def _is_off_resume(self, resume: str, answer: str) -> bool:
        if not resume or len(answer.split()) < 5:
            return False
        # Bluff phrases — bold claims that should appear in the resume
        ans_lower = answer.lower()
        for pattern in _BLUFF_PHRASES:
            m = re.search(pattern, ans_lower)
            if m and m.group(0) not in resume.lower():
                return True
        # Heuristic: if NO content word from the answer appears in the resume, suspicious
        a_terms = self._content_words(answer)
        if not a_terms:
            return False
        r_terms = set(self._content_words(resume))
        unique_a = [w for w in a_terms if w not in r_terms]
        # If 90%+ of meaningful answer words are absent from the resume → likely off-resume
        if len(unique_a) / len(a_terms) > 0.9 and len(a_terms) > 8:
            return True
        return False

    # ----- helpers -----

    _STOP = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "i", "me", "my", "you", "your", "we", "our", "they", "their",
        "and", "or", "but", "if", "then", "so", "than", "as", "of", "to", "in",
        "on", "at", "by", "for", "with", "about", "from", "into", "that", "this",
        "these", "those", "have", "has", "had", "do", "does", "did", "will",
        "would", "can", "could", "should", "may", "might", "it", "its", "just",
        "also", "very", "really", "much", "many", "some", "any", "all", "no",
        "not", "more", "most", "less", "least", "what", "which", "who", "whom",
        "where", "when", "why", "how", "kind", "thing", "things", "stuff",
    }

    @classmethod
    def _content_words(cls, text: str) -> list[str]:
        tokens = re.findall(r"[A-Za-z][A-Za-z+#0-9]{2,}", (text or "").lower())
        return [t for t in tokens if t not in cls._STOP]
