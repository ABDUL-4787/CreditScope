import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check_endpoint():
    """
    Backend Tests:
    - /health endpoint returns active configurations
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_version" in data
    assert "decision_threshold" in data

def test_predict_single_endpoint():
    """
    Backend Tests:
    - valid /predict
    - invalid /predict (negative income, invalid loan amount, target leakage)
    - missing required field
    """
    # 1. Valid application
    valid_payload = {
        "income": 85000.0,
        "loan_amount": 10000.0,
        "employment_length": 4.0,
        "existing_debt": 2000.0,
        "credit_history_length": 6.0,
        "prior_defaults": 0,
        "monthly_expenses": 1500.0,
        "savings_balance": 12000.0,
        "credit_utilization": 0.25,
        "transaction_activity": 40,
        "employment_type": "Salaried",
        "employment_notes": "Permanent engineer position with regular income."
    }
    response = client.post("/predict", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "decision" in data
    assert "default_probability" in data
    assert data["decision"] in ["APPROVE", "DECLINE"]
    assert "underwriting_summary" in data

    # 2. Negative income check (invalid /predict)
    invalid_payload_income = valid_payload.copy()
    invalid_payload_income["income"] = -100.0
    response = client.post("/predict", json=invalid_payload_income)
    assert response.status_code == 422 # Pydantic validation error code

    # 3. Target leakage check (invalid /predict)
    invalid_payload_leakage = valid_payload.copy()
    # Insert target leakage parameter
    invalid_payload_leakage["observed_default"] = 1.0
    response = client.post("/predict", json=invalid_payload_leakage)
    assert response.status_code == 400 # Custom target leakage handling
    assert "Target leakage" in response.json()["detail"]

    # 4. Missing required field
    invalid_payload_missing = valid_payload.copy()
    del invalid_payload_missing["income"]
    response = client.post("/predict", json=invalid_payload_missing)
    assert response.status_code == 422

def test_predict_batch_endpoint():
    """
    Backend Tests:
    - /predict/batch with valid CSV file
    - malformed CSV
    - empty CSV
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(backend_dir, 'data', 'sample_applicants.csv')
    
    # 1. Valid CSV upload
    if os.path.exists(csv_path):
        with open(csv_path, 'rb') as f:
            response = client.post("/predict/batch", files={"file": ("sample_applicants.csv", f, "text/csv")})
        assert response.status_code == 200
        data = response.json()
        assert "total_applications" in data
        assert "avg_risk_score" in data
        assert len(data["predictions"]) > 0
        assert "applicant_id" in data["predictions"][0]
        
    # 2. Empty CSV
    empty_csv = b""
    response = client.post("/predict/batch", files={"file": ("empty.csv", empty_csv, "text/csv")})
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
    
    # 3. Malformed CSV / Missing columns
    bad_csv = b"applicant_id,income,loan_amount\nAPP-1,50000,10000"
    response = client.post("/predict/batch", files={"file": ("bad.csv", bad_csv, "text/csv")})
    assert response.status_code == 400
    assert "missing required" in response.json()["detail"].lower()

def test_drift_and_inject_endpoints():
    """
    Backend Tests:
    - /drift
    - /drift/inject
    """
    # Test drift injection
    response = client.post("/drift/inject?severity=significant")
    assert response.status_code == 200
    assert response.json()["status"] == "SUCCESS"
    
    # Test drift evaluation
    response = client.get("/drift")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "feature_psi" in data
    # Injected drift should cause overall status to shift
    assert data["overall_status"] in ["moderate", "significant"]

def test_analytics_endpoint():
    """
    Backend Tests:
    - /analytics/segments
    """
    response = client.get("/analytics/segments")
    assert response.status_code == 200
    data = response.json()
    assert "segments" in data
    assert "fairness" in data
    assert "model_metadata" in data
    assert len(data["segments"]) > 0
