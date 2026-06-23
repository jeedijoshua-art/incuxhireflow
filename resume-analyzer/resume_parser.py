"""Resume file → plain text. Routes to format-specific parsers."""
from parsers.pdf_parser import parse_pdf
from parsers.docx_parser import parse_docx


def parse_resume(raw_bytes: bytes, filename: str = "") -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return parse_pdf(raw_bytes)
    if name.endswith(".docx"):
        return parse_docx(raw_bytes)
    # Plain text fallback
    try:
        return raw_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""
