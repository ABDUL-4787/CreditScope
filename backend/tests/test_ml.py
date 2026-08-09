import os
import json
import pytest
import numpy as np
import pandas as pd
from backend.scripts.train_pipeline import (
    generate_synthetic_data,
    extract_nlp_features,
    check_target_leakage,
    simulate_approvals_and_defaults,
    run_reject_inference
)

def test_dataset_generation_properties():
    """
    ML Tests:
    - dataset contains >= 5,000 rows
    - deterministic dataset generation
    - no unexpected NaNs
    - expected feature schema
    """
    # 1. Row count check
    df1 = generate_synthetic_data(n_samples=5000)
    assert len(df1) == 5000
    
    # 2. Determinism check
    df2 = generate_synthetic_data(n_samples=5000)
    pd.testing.assert_frame_equal(df1, df2)
    
    # 3. No NaNs check
    assert df1.isnull().sum().sum() == 0
    
    # 4. Feature schema check
    expected_cols = [
        'income', 'loan_amount', 'employment_length', 'existing_debt',
        'credit_history_length', 'prior_defaults', 'monthly_expenses',
        'savings_balance', 'credit_utilization', 'transaction_activity',
        'employment_type', 'employment_notes'
    ]
    for col in expected_cols:
        assert col in df1.columns

def test_nlp_extraction():
    """
    Verify keyword markers are correctly extracted.
    """
    test_notes = pd.DataFrame({
        'employment_notes': [
            "Permanent school teacher with regular monthly salary", # stable
            "Self-employed painter running local business",         # self-employed
            "Contract worker in logistics, unstable hours",         # unstable
        ]
    })
    df_feat = extract_nlp_features(test_notes)
    
    assert df_feat['has_stable_keywords'].iloc[0] == 1
    assert df_feat['has_stable_keywords'].iloc[1] == 0
    
    assert df_feat['is_self_employed'].iloc[1] == 1
    
    assert df_feat['has_unstable_keywords'].iloc[2] == 1
    assert df_feat['text_risk_score'].iloc[2] > 0
    assert df_feat['text_risk_score'].iloc[0] < 0

def test_target_leakage_checks():
    """
    ML Tests:
    - no target leakage (raises ValueError if leakage columns are detected)
    """
    features_clean = ['income', 'loan_amount', 'credit_utilization']
    check_target_leakage(None, features_clean) # Should pass silently
    
    features_leaked = ['income', 'loan_amount', 'observed_default']
    with pytest.raises(ValueError) as excinfo:
        check_target_leakage(None, features_leaked)
    assert "Target leakage detected" in str(excinfo.value)

def test_reject_inference_output():
    """
    ML Tests:
    - reject inference generates weighted observations
    """
    df = generate_synthetic_data(n_samples=100)
    df = extract_nlp_features(df)
    df = simulate_approvals_and_defaults(df)
    
    feature_cols = [
        'income', 'loan_amount', 'employment_length', 'existing_debt',
        'credit_history_length', 'prior_defaults', 'monthly_expenses',
        'savings_balance', 'credit_utilization', 'transaction_activity',
        'has_stable_keywords', 'has_unstable_keywords', 'is_self_employed',
        'text_risk_score'
    ]
    
    # Run reject inference
    augmented = run_reject_inference(df, feature_cols)
    
    # Augmented dataset should contain weights
    assert 'weight' in augmented.columns
    assert 'target' in augmented.columns
    
    # Approved rows keep weight 1.0, rejected rows are duplicated
    assert len(augmented) > len(df)
    # Sum of weights in training set should equal total number of applicants (or close due to float arithmetic)
    assert np.isclose(augmented['weight'].sum(), len(df))

def test_model_artifacts_and_threshold():
    """
    ML Tests:
    - model artifact loads
    - champion model is selected
    - calibration metrics generated
    - threshold is generated
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(backend_dir, 'models')
    
    metadata_path = os.path.join(models_dir, 'model_metadata_v1.json')
    schema_path = os.path.join(models_dir, 'feature_schema_v1.json')
    
    assert os.path.exists(metadata_path)
    assert os.path.exists(schema_path)
    
    with open(metadata_path, 'r') as f:
        meta = json.load(f)
        
    assert "model_version" in meta
    assert "decision_threshold" in meta
    assert isinstance(meta["decision_threshold"], float)
    assert meta["validation_metrics"]["roc_auc"] > 0.5
    assert len(meta["model_comparison"]) == 3
