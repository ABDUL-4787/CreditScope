import os
import json
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb
from backend.services.feature_service import FeatureService

class ModelService:
    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        models_dir = os.path.join(backend_dir, 'models')
        
        # Paths
        self.model_path = os.path.join(models_dir, 'credit_model_v1.json')
        self.calibrator_path = os.path.join(models_dir, 'calibrator_v1.pkl')
        self.metadata_path = os.path.join(models_dir, 'model_metadata_v1.json')
        self.schema_path = os.path.join(models_dir, 'feature_schema_v1.json')
        
        # Load metadata
        with open(self.metadata_path, 'r') as f:
            self.metadata = json.load(f)
            
        # Load schema
        with open(self.schema_path, 'r') as f:
            self.schema = json.load(f)
            
        self.features = self.schema['features']
        self.decision_threshold = self.metadata['decision_threshold']
        self.model_version = self.metadata['model_version']
        
        # Load native XGBoost model for SHAP calculations
        self.booster = xgb.Booster()
        self.booster.load_model(self.model_path)
        
        # Load calibrator
        with open(self.calibrator_path, 'rb') as f:
            self.calibrator = pickle.load(f)
            
        # Feature names dictionary for human readable SHAP descriptions
        self.feature_labels = {
            'income': 'Income level',
            'loan_amount': 'Loan amount requested',
            'employment_length': 'Length of employment',
            'existing_debt': 'Existing debt load',
            'credit_history_length': 'Length of credit history',
            'prior_defaults': 'Number of prior defaults',
            'monthly_expenses': 'Monthly expenses',
            'savings_balance': 'Savings balance',
            'credit_utilization': 'Credit utilization',
            'transaction_activity': 'Account transaction activity',
            'has_stable_keywords': 'Stable job signs in employment notes',
            'has_unstable_keywords': 'Unstable job signs in employment notes',
            'is_self_employed': 'Self-employed indicator',
            'text_risk_score': 'Employment notes risk profile'
        }

    def predict(self, applicant_data: dict) -> dict:
        """
        Validate input, preprocess text, execute prediction, calibrate, and explain.
        """
        # Protect against target leakage
        FeatureService.validate_features_for_leakage(applicant_data)
        
        # Extract NLP features from employment notes if present
        notes = applicant_data.get('employment_notes', '')
        nlp_features = FeatureService.preprocess_notes(notes)
        
        # Prepare full payload
        full_data = applicant_data.copy()
        full_data.update(nlp_features)
        
        # Construct DataFrame in the exact training schema order
        df = pd.DataFrame([full_data])
        df = df[self.features]
        
        # Predict probability using calibrator
        # Calibrator wraps the champion model and outputs calibrated probability
        calibrated_prob = float(self.calibrator.predict_proba(df)[0, 1])
        
        # Calculate risk score (UI scale: 0 to 100)
        risk_score = round(calibrated_prob * 100)
        
        # Make decision based on threshold
        decision = "DECLINE" if calibrated_prob >= self.decision_threshold else "APPROVE"
        
        # Calculate TreeSHAP values using XGBoost
        dmat = xgb.DMatrix(df)
        # predict(pred_contribs=True) returns [contribs_feature_1, ..., contribs_feature_k, bias]
        shap_values = self.booster.predict(dmat, pred_contribs=True)[0]
        feature_shap = shap_values[:-1] # Exclude bias term
        
        # Formulate factors
        factors = []
        for i, val in enumerate(feature_shap):
            feat_name = self.features[i]
            val_float = float(val)
            factors.append({
                "feature": feat_name,
                "label": self.feature_labels.get(feat_name, feat_name),
                "shap_value": val_float
            })
            
        # Sort factors by magnitude
        factors_sorted = sorted(factors, key=lambda x: abs(x['shap_value']), reverse=True)
        top_factors = factors_sorted[:3]
        
        # Plain English explanations for top 3 contributors
        explanations = []
        for f in top_factors:
            feat_name = f['feature']
            val = f['shap_value']
            val_abs = abs(val)
            
            # Formulate description depending on positive/negative impact
            impact = "increased" if val > 0 else "reduced"
            
            # Friendly detail
            val_percent = f"{val_abs * 100:.1f}%"
            
            if feat_name == 'income':
                detail = "higher income" if val < 0 else "lower income relative to standard"
            elif feat_name == 'loan_amount':
                detail = "larger loan size" if val > 0 else "smaller loan request"
            elif feat_name == 'employment_length':
                detail = "longer career history" if val < 0 else "short employment tenure"
            elif feat_name == 'prior_defaults':
                detail = "existence of past default records" if val > 0 else "zero past defaults record"
            elif feat_name == 'credit_utilization':
                detail = "high credit card balances" if val > 0 else "low credit utilization profile"
            elif feat_name == 'existing_debt':
                detail = "large amount of existing debt" if val > 0 else "low outstanding leverage"
            elif feat_name == 'savings_balance':
                detail = "substantial cash reserves" if val < 0 else "minimal savings buffer"
            elif feat_name == 'text_risk_score':
                detail = "negative/unstable remarks in job description" if val > 0 else "stable job keywords in remarks"
            else:
                detail = f.get('label', feat_name).lower()
                
            explanations.append(f"{detail.capitalize()} {impact} predicted risk (effect: {val_percent})")
            
        snapshot = df.iloc[0].to_dict()
        snapshot['employment_type'] = str(applicant_data.get('employment_type', 'Salaried'))
        snapshot['employment_notes'] = str(applicant_data.get('employment_notes', ''))

        return {
            "default_probability": calibrated_prob,
            "risk_score": risk_score,
            "decision": decision,
            "decision_threshold": self.decision_threshold,
            "model_version": self.model_version,
            "top_factors": factors_sorted,
            "top_explanations": explanations,
            "feature_snapshot": snapshot
        }
