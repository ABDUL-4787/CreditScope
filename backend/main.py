import os
import sys
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Resolve import paths dynamically for both local dev and container environments
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

try:
    import backend
except ModuleNotFoundError:
    # Inside Docker/Render, the folder is cloned and run flat from /app (no 'backend' parent directory).
    # We dynamically mock the 'backend' namespace to map imports directly to /app subfolders.
    import types
    backend_mock = types.ModuleType('backend')
    backend_mock.__path__ = [current_dir]
    sys.modules['backend'] = backend_mock

from backend.routers import predict, drift, analytics, explain
from backend.services.db_service import DBService
from backend.services.model_service import ModelService

app = FastAPI(
    title="CreditScope API",
    description="Production-style credit risk scoring engine with Reject Inference, Calibration, SHAP explanations, SQL logging, PSI drift tracking, and LLM analyst narrative generation.",
    version="1.0.0"
)

# CORS configuration
cors_origins_raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["http://localhost:3000", "*"], # Allow local frontend development and wildcard fallbacks for staging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
db_service = DBService()
model_service = ModelService()

# Pre-populate normal baseline predictions if empty
try:
    from backend.services.drift_service import DriftService
    drift_service = DriftService(db_service)
    drift_service.populate_normal_traffic(model_service, count=50)
except Exception as e:
    print(f"Error pre-populating database on startup: {e}")

# Register Routers
app.include_router(predict.router)
app.include_router(drift.router)
app.include_router(analytics.router)
app.include_router(explain.router)

@app.get("/health")
def health_check():
    """
    GET /health
    Uptime check. Exposes the active model version, champion algorithm, and decision threshold.
    """
    try:
        # Check SQLite connectivity
        conn = db_service.get_connection()
        conn.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        
    return {
        "status": "healthy",
        "timestamp": os.environ.get("CURRENT_TIME", "2026-08-09T18:49:24+05:30"),
        "model_version": model_service.model_version,
        "algorithm": model_service.metadata.get("algorithm", "XGBoost"),
        "decision_threshold": model_service.decision_threshold,
        "database": db_status
    }

# General error handler to return clean JSON errors instead of stack traces
@app.exception_handler(Exception)
def validation_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
