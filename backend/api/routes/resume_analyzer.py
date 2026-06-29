import os
import sys
import tempfile
import traceback
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

# Add the resume-analyzer directory to sys.path to allow importing its modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RESUME_ANALYZER_DIR = os.path.join(BASE_DIR, "resume-analyzer")

# Ensure correct module loading by prioritizing this directory
if RESUME_ANALYZER_DIR in sys.path:
    sys.path.remove(RESUME_ANALYZER_DIR)
sys.path.insert(0, RESUME_ANALYZER_DIR)

# Remove conflicting modules from sys.modules to force a fresh import
for mod in ['ai_helper', 'question_generator', 'main']:
    if mod in sys.modules:
        del sys.modules[mod]

from main import run_resume_analysis

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "resume-analyzer"}

@router.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    if not run_resume_analysis:
        raise HTTPException(status_code=500, detail="Resume Analyzer module not loaded properly.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    suffix = os.path.splitext(file.filename)[1].lower()
    if suffix not in (".pdf", ".txt", ".docx", ".md"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{suffix}'. Only PDF, TXT, and DOCX are supported."
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        results = run_resume_analysis(resume_path=tmp_path)
        return results
    except ValueError as e:
        # User-facing errors such as unreadable resume text
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
