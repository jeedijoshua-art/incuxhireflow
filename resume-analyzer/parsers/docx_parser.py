"""DOCX parser using python-docx."""
import io


def parse_docx(raw_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(raw_bytes))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception:
        return ""
