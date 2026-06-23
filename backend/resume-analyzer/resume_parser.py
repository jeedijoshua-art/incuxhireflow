import os
import pypdf

class ResumeParser:
    """
    Parses resume files (PDF, TXT) and extracts raw text.
    """
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        text = []
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
        return "\n".join(text).strip()

    @staticmethod
    def parse_txt(file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()

    @classmethod
    def parse(cls, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return cls.parse_pdf(file_path)
        elif ext in (".txt", ".md"):
            return cls.parse_txt(file_path)
        else:
            # For other formats, we try reading as text or raise exception
            try:
                return cls.parse_txt(file_path)
            except Exception:
                raise ValueError(f"Unsupported file format '{ext}'. Only PDF and TXT are supported.")
