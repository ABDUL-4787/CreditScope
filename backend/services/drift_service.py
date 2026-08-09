import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from backend.services.db_service import DBService

class DriftService:
    def __init__(self, db_service: DBService):
        self.db_service = db_service
        
        # Load feature schema (contains expected training distributions and bins)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.schema_path = os.path.join(backend_dir, 'models', 'feature_schema_v1.json')
        
        with open(self.schema_path, 'r') as f:
            self.schema = json.load(f)
            
        self.features = self.schema['features']
        self.baselines = self.schema['baselines']

    def calculate_psi(self, expected_pct: list, actual_pct: list) -> float:
        """
        Compute PSI between expected and actual percentage arrays.
        """
        expected = np.array(expected_pct)
        actual = np.array(actual_pct)
        
        # Avoid zero percentages to prevent divide by zero / log of zero errors
        expected = np.where(expected == 0, 1e-4, expected)
        actual = np.where(actual == 0, 1e-4, actual)
        
        # Re-normalize to sum to 1
        expected = expected / np.sum(expected)
        actual = actual / np.sum(actual)
        
        # PSI formula
        psi_value = np.sum((actual - expected) * np.log(actual / expected))
        return float(psi_value)

    def evaluate_drift(self) -> dict:
        """
        Fetch recent live predictions from DB, calculate PSI per feature,
        determine severities, and log drift events if necessary.
        """
        # Fetch recent logged predictions (up to last 500)
        logs = self.db_service.get_recent_predictions(limit=500)
        
        if len(logs) < 30:
            # Not enough data for meaningful statistics
            return {
                "status": "INSUFFICIENT_DATA",
                "message": f"Need at least 30 predictions logged (currently: {len(logs)}) to calculate drift.",
                "feature_psi": {}
            }
            
        df_live = pd.DataFrame(logs)
        drift_results = {}
        
        for feat in self.features:
            if feat not in df_live.columns:
                continue
                
            live_values = df_live[feat].astype(float).values
            baseline = self.baselines[feat]
            bins = np.array(baseline['bins'])
            expected_pct = baseline['expected_pct']
            
            # Categorize actual values into the baseline bins
            # Use np.histogram with the baseline bin edges
            counts, _ = np.histogram(live_values, bins=bins)
            actual_pct = (counts / len(live_values)).tolist()
            
            # Compute PSI
            psi_val = self.calculate_psi(expected_pct, actual_pct)
            
            # Determine severity
            if psi_val < 0.10:
                severity = "stable"
            elif psi_val <= 0.25:
                severity = "moderate"
            else:
                severity = "significant"
                
            drift_results[feat] = {
                "psi": psi_val,
                "severity": severity,
                "mean_baseline": baseline['mean'],
                "mean_live": float(np.mean(live_values)),
                "std_baseline": baseline['std'],
                "std_live": float(np.std(live_values))
            }
            
            # Log to DB if we detect drift (moderate or significant)
            if severity != "stable":
                self.db_service.log_drift_event(feat, psi_val, severity)
                
        # Overall platform status
        max_psi = max([v['psi'] for v in drift_results.values()]) if drift_results else 0
        overall_status = "stable"
        if max_psi > 0.25:
            overall_status = "significant"
        elif max_psi >= 0.10:
            overall_status = "moderate"
            
        return {
            "status": "SUCCESS",
            "overall_status": overall_status,
            "sample_size": len(df_live),
            "feature_psi": drift_results
        }

    def inject_drift_data(self, model_service, drift_type: str = "significant") -> int:
        """
        Phase 13: Drift Simulation.
        Generates and logs predictions with intentionally shifted distributions to test monitoring systems.
        """
        print(f"Injecting simulated drifted data of severity: {drift_type}")
        
        # Generate 200 records
        from backend.scripts.train_pipeline import generate_synthetic_data
        df_drift = generate_synthetic_data(n_samples=200)
        
        # Induce feature shifts based on drift_type
        if drift_type == "significant":
            # Significant drift: severe financial strain
            df_drift['income'] = df_drift['income'] / 2.2 # Extreme drop in income
            df_drift['loan_amount'] = df_drift['loan_amount'] * 1.6 # Requesting much larger loans
            df_drift['existing_debt'] = df_drift['existing_debt'] * 2.5 # Huge increase in debt
            df_drift['credit_utilization'] = np.clip(df_drift['credit_utilization'] * 1.8, 0.0, 1.2)
            df_drift['prior_defaults'] = df_drift['prior_defaults'] + 1 # Higher defaults
        elif drift_type == "moderate":
            # Moderate drift: mild shift
            df_drift['income'] = df_drift['income'] / 1.35
            df_drift['loan_amount'] = df_drift['loan_amount'] * 1.25
            df_drift['existing_debt'] = df_drift['existing_debt'] * 1.4
            df_drift['credit_utilization'] = np.clip(df_drift['credit_utilization'] * 1.3, 0.0, 1.2)
            
        # Clear existing logs if requested or just add them.
        # To make drift visualization immediate and clean, we clear previous logs so the injected
        # cohort represents 100% of the active live window.
        self.db_service.clear_database_logs()
        
        # Run prediction on these drifted records and log them to DB
        logged_count = 0
        for _, row in df_drift.iterrows():
            applicant_dict = row.to_dict()
            try:
                # Predict (which pre-processes text notes, performs target leakage validation, etc.)
                outputs = model_service.predict(applicant_dict)
                # Log prediction to SQL
                self.db_service.log_prediction(
                    model_version=model_service.model_version,
                    inputs=applicant_dict,
                    outputs=outputs
                )
                logged_count += 1
            except Exception as e:
                print(f"Failed to log drifted applicant: {e}")
                
        print(f"Successfully injected {logged_count} drifted applicant records.")
        return logged_count

    def populate_normal_traffic(self, model_service, count: int = 150):
        """
        Populate DB with normal/stable traffic to give charts a baseline on first load.
        """
        logs = self.db_service.get_recent_predictions(limit=10)
        if len(logs) >= 30:
            return # Already has baseline logs
            
        print(f"Populating DB with {count} baseline normal records...")
        from backend.scripts.train_pipeline import generate_synthetic_data
        df_normal = generate_synthetic_data(n_samples=count)
        
        for _, row in df_normal.iterrows():
            applicant_dict = row.to_dict()
            try:
                outputs = model_service.predict(applicant_dict)
                self.db_service.log_prediction(
                    model_version=model_service.model_version,
                    inputs=applicant_dict,
                    outputs=outputs
                )
            except Exception as e:
                pass
        print("Database pre-populated with baseline normal traffic.")
