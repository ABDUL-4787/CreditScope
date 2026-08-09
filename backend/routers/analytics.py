from fastapi import APIRouter, HTTPException
from backend.services.db_service import DBService
from backend.services.fairness_service import FairnessService
from backend.services.model_service import ModelService

router = APIRouter(prefix="/analytics", tags=["analytics"])

db_service = DBService()
model_service = ModelService()

@router.get("/segments")
def get_segments_and_fairness():
    """
    GET /analytics/segments
    Runs group analytics on logged predictions and checks equal opportunity/approval disparities.
    Also returns champion model metadata comparison.
    """
    try:
        # Populate normal traffic if DB is empty to ensure charts render on first load
        from backend.services.drift_service import DriftService
        drift_service = DriftService(db_service)
        drift_service.populate_normal_traffic(model_service)
        
        # SQL-driven aggregate segments query
        segments_data = db_service.get_segment_analytics()
        
        # Pull recent logs to run fairness diagnostic calculations
        logs = db_service.get_recent_predictions(limit=1000)
        fairness_data = FairnessService.calculate_fairness_metrics(logs)
        
        return {
            "segments": segments_data,
            "fairness": fairness_data,
            "model_metadata": model_service.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics query failure: {str(e)}")
