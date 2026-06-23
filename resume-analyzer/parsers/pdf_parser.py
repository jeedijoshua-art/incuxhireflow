"""PDF parser — uses pdfplumber as primary, pypdf as fallback."""
import io


def parse_pdf(raw_bytes: bytes) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                text_parts.append(t)
        text = "\n".join(text_parts).strip()
        if text:
            return text
    except Exception:
        pass

    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
        return "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    except Exception:
        return ""
