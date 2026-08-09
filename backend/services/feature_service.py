import re

class FeatureService:
    @staticmethod
    def preprocess_notes(notes: str) -> dict:
        """
        Extract NLP features from unstructured employment notes.
        """
        notes_lower = (notes or "").lower()
        
        stable_kw = ["stable", "permanent", "full-time", "regular", "salaried", "senior", "certified", "officer"]
        has_stable_keywords = 1 if any(w in notes_lower for w in stable_kw) else 0
        
        unstable_kw = ["unstable", "temp", "temporary", "part-time", "gig", "fluctuating", "irregular", "contractor", "contract"]
        has_unstable_keywords = 1 if any(w in notes_lower for w in unstable_kw) else 0
        
        self_emp_kw = ["self-employed", "freelance", "freelancer", "business owner", "independent", "owner"]
        is_self_employed = 1 if any(w in notes_lower for w in self_emp_kw) else 0
        
        text_risk_score = 0.5 * has_unstable_keywords + 0.3 * is_self_employed - 0.4 * has_stable_keywords
        
        return {
            "has_stable_keywords": has_stable_keywords,
            "has_unstable_keywords": has_unstable_keywords,
            "is_self_employed": is_self_employed,
            "text_risk_score": float(text_risk_score)
        }

    @staticmethod
    def validate_features_for_leakage(features_dict: dict):
        """
        Prevent target leakage by raising an error if any forbidden column exists in feature inputs.
        """
        forbidden_keys = [
            'default', 'observed_default', 'approved', 'historical_approved', 
            'default_target', 'target', 'repayment_status', 'repaid_amount'
        ]
        leaked = [k for k in features_dict.keys() if k in forbidden_keys]
        if leaked:
            raise ValueError(f"Target leakage detected! Input features contain forbidden keys: {leaked}")
