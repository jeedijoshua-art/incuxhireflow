import os
import sys
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SERVICES_DIR = os.path.join(BASE_DIR, "api", "services")
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

RESUME_ANALYZER_DIR = os.path.join(BASE_DIR, "resume-analyzer")

# Ensure correct module loading by prioritizing this directory
if RESUME_ANALYZER_DIR in sys.path:
    sys.path.remove(RESUME_ANALYZER_DIR)
sys.path.insert(0, RESUME_ANALYZER_DIR)

# Remove conflicting modules from sys.modules to force a fresh import

from main import run_resume_analysis

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "resume-analyzer"}

@router.post("/analyze")
async def analyze_resume(file: UploadFile = File(...), target_role: str = Form("Software Engineer")):
    if not run_resume_analysis:
        raise HTTPException(status_code=500, detail="Resume Analyzer module not loaded properly.")
        
    # Save the uploaded file to a temporary file
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Run the analysis
        results = run_resume_analysis(resume_path=tmp_path, target_role=target_role)
        
        # Clean up the temporary file
        os.remove(tmp_path)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
