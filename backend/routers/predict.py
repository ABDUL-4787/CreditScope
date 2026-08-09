import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from typing import List, Dict
from pydantic import ValidationError
from backend.schemas.predict import ApplicantRequest, PredictResponse
from backend.services.model_service import ModelService
from backend.services.db_service import DBService
from backend.services.llm_service import LLMService
from backend.services.feature_service import FeatureService

router = APIRouter(prefix="/predict", tags=["prediction"])

# Shared services initialized globally
model_service = ModelService()
db_service = DBService()
llm_service = LLMService()

@router.post("", response_model=PredictResponse)
async def predict_single(request: Request):
    """
    Score a single applicant's credit default probability.
    Logs inputs and output to SQLite database.
    """
    try:
        # Parse raw json body to validate target leakage before Pydantic ignores extra parameters
        body = await request.json()
        FeatureService.validate_features_for_leakage(body)
        
        # Parse and validate with Pydantic
        payload = ApplicantRequest(**body)
        applicant_data = payload.model_dump()
        
        # Run XGBoost model & Calibrator scoring
        predictions = model_service.predict(applicant_data)
        
        # Call LLM or fallback for natural language explanation narrative
        summary = llm_service.generate_underwriting_summary(
            risk_score=predictions['risk_score'],
            decision=predictions['decision'],
            top_explanations=predictions['top_explanations']
        )
        
        predictions['underwriting_summary'] = summary
        
        # Log to local SQLite database for SQL audits and drift tracking
        db_service.log_prediction(
            model_version=predictions['model_version'],
            inputs=predictions['feature_snapshot'],
            outputs=predictions
        )
        
        return predictions
        
    except ValidationError as e:
        # Convert Pydantic validation errors to standard 422 HTTP exceptions
        raise HTTPException(status_code=422, detail=e.errors())
    except ValueError as e:
        # Catch target leakage warnings or invalid values
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        # Allow custom HTTP exceptions to pass through
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline error: {str(e)}")

@router.post("/batch")
def predict_batch(file: UploadFile = File(...)):
    """
    POST /predict/batch
    Upload a CSV file containing applicant records, returns predictions and summary statistics.
    Logs batch records to SQLite database.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = file.file.read()
        if not contents or len(contents.strip()) == 0:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
            
        df = pd.read_csv(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
            
        # Verify required columns exist
        required_cols = [
            'income', 'loan_amount', 'employment_length', 'existing_debt',
            'credit_history_length', 'prior_defaults', 'monthly_expenses',
            'savings_balance', 'credit_utilization', 'transaction_activity',
            'employment_type'
        ]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400, 
                detail=f"CSV is missing required input columns: {missing}"
            )
            
        # Optional applicant identifier
        id_col = 'applicant_id' if 'applicant_id' in df.columns else None
        
        results = []
        total_risk_score = 0
        approvals = 0
        high_risk_count = 0
        
        for idx, row in df.iterrows():
            # Construct row payload
            row_dict = row.to_dict()
            
            # Map default values for optional notes
            applicant_data = {
                "income": float(row_dict['income']),
                "loan_amount": float(row_dict['loan_amount']),
                "employment_length": float(row_dict['employment_length']),
                "existing_debt": float(row_dict['existing_debt']),
                "credit_history_length": float(row_dict['credit_history_length']),
                "prior_defaults": int(row_dict['prior_defaults']),
                "monthly_expenses": float(row_dict['monthly_expenses']),
                "savings_balance": float(row_dict['savings_balance']),
                "credit_utilization": float(row_dict['credit_utilization']),
                "transaction_activity": int(row_dict['transaction_activity']),
                "employment_type": str(row_dict['employment_type']),
                "employment_notes": str(row_dict.get('employment_notes', ''))
            }
            
            # Perform single prediction scoring (prevents target leakage and handles NLP mapping)
            pred = model_service.predict(applicant_data)
            
            # Use pre-generated simple text explanation for top factor
            top_factor_desc = pred['top_explanations'][0] if pred['top_explanations'] else "None"
            
            # Log prediction to SQL
            db_service.log_prediction(
                model_version=pred['model_version'],
                inputs=pred['feature_snapshot'],
                outputs=pred
            )
            
            # Stats updates
            total_risk_score += pred['risk_score']
            if pred['decision'] == "APPROVE":
                approvals += 1
            if pred['risk_score'] > 60:
                high_risk_count += 1
                
            results.append({
                "applicant_id": str(row_dict.get(id_col, f"ROW-{idx+1}")),
                "risk_score": pred['risk_score'],
                "default_probability": pred['default_probability'],
                "decision": pred['decision'],
                "top_factor": top_factor_desc
            })
            
        n_rows = len(df)
        summary = {
            "total_applications": n_rows,
            "approval_rate": approvals / n_rows if n_rows > 0 else 0.0,
            "avg_risk_score": total_risk_score / n_rows if n_rows > 0 else 0.0,
            "high_risk_count": high_risk_count,
            "predictions": results
        }
        
        return summary
        
    except HTTPException as e:
        raise e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Data parsing or leakage error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch execution failed: {str(e)}")
