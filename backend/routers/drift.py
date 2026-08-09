from fastapi import APIRouter, HTTPException, Query
from backend.services.drift_service import DriftService
from backend.services.db_service import DBService
from backend.services.model_service import ModelService

router = APIRouter(prefix="/drift", tags=["monitoring"])

# Initialize services
db_service = DBService()
model_service = ModelService()
drift_service = DriftService(db_service)

@router.get("")
def get_drift_metrics():
    """
    GET /drift
    Calculates current Population Stability Index (PSI) per feature.
    """
    try:
        # Pre-populate some baseline records on the fly if DB is completely empty,
        # ensuring the dashboard works instantly for demo users.
        drift_service.populate_normal_traffic(model_service)
        
        result = drift_service.evaluate_drift()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift evaluation failure: {str(e)}")

@router.post("/inject")
def inject_drift(severity: str = Query("significant", enum=["moderate", "significant"])):
    """
    POST /drift/inject
    Injects synthetic shifted distribution data to demonstrate real-time drift alerts.
    """
    try:
        injected_count = drift_service.inject_drift_data(model_service, drift_type=severity)
        return {
            "status": "SUCCESS",
            "message": f"Successfully injected {injected_count} records with '{severity}' drift.",
            "injected_count": injected_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift injection failure: {str(e)}")
