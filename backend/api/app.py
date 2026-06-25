import sys
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add directories to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_DIR = os.path.join(BASE_DIR, "expression-tracker")
INTERVIEW_ENGINE_DIR = os.path.join(BASE_DIR, "interview-engine")
RESUME_ANALYZER_DIR = os.path.join(BASE_DIR, "resume-analyzer")

for directory in [TRACKER_DIR, INTERVIEW_ENGINE_DIR, RESUME_ANALYZER_DIR]:
    if directory not in sys.path:
        sys.path.insert(0, directory)

# Import routes
from routes.resume_analyzer import router as resume_analyzer_router
from routes.interview_engine import router as interview_engine_router
from routes.expression_tracker import router as expression_tracker_router

app = FastAPI(
    title="HireFlow API",
    description="Gateway API for HireFlow services",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("[CORS_ENABLED] Allowed origins: http://localhost:5173")
    logger.info("HireFlow API is starting up...")
    logger.info("Registered Modules:")
    logger.info(" - Resume Analyzer")
    logger.info(" - Interview Engine")
    logger.info(" - Expression Tracker")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc)},
    )

@app.get("/")
def read_root():
    return {"status": "HireFlow API Gateway Running"}

@app.get("/health")
def overall_health():
    return {"status": "ok", "service": "hireflow-gateway"}

# Include Routers
app.include_router(
    expression_tracker_router,
    tags=["Expression Tracker"]
)

app.include_router(
    resume_analyzer_router,
    prefix="/resume",
    tags=["Resume Analyzer"]
)

app.include_router(
    interview_engine_router,
    prefix="/interview",
    tags=["Interview Engine"]
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
