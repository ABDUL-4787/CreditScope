from fastapi import APIRouter, HTTPException
from backend.schemas.predict import ApplicantRequest
from backend.services.model_service import ModelService

router = APIRouter(prefix="/explain", tags=["explainability"])
model_service = ModelService()

@router.post("")
def get_prediction_explanations(payload: ApplicantRequest):
    """
    POST /explain
    Accepts applicant attributes and returns detailed TreeSHAP mathematical factors and risk score details.
    """
    try:
        applicant_data = payload.model_dump()
        predictions = model_service.predict(applicant_data)
        
        return {
            "default_probability": predictions["default_probability"],
            "risk_score": predictions["risk_score"],
            "decision": predictions["decision"],
            "top_factors": predictions["top_factors"],
            "top_explanations": predictions["top_explanations"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability audit failure: {str(e)}")
