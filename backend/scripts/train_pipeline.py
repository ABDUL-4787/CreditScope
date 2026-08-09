import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV, FrozenEstimator
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss, precision_score, recall_score, f1_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import xgboost as xgb

# Set random seed for determinism
np.random.seed(42)

def generate_synthetic_data(n_samples=6000) -> pd.DataFrame:
    """
    Phase 1: Deterministic synthetic dataset generator with realistic financial relationships.
    Generates borrower records with financial attributes and true default risk.
    """
    # Reset seed for strict function-level determinism
    np.random.seed(42)
    print(f"Generating {n_samples} synthetic borrower records...")
    
    # Financial variables (mostly log-normal or normal distributions)
    income = np.random.lognormal(mean=11.0, sigma=0.5, size=n_samples) # Mean ~$70k, range $20k-$300k
    income = np.clip(income, 15000, 350000)
    
    # Loan amount depends partly on income (higher income gets larger loans)
    loan_amount = income * np.random.uniform(0.15, 0.45, size=n_samples)
    loan_amount = np.clip(loan_amount, 3000, 100000)
    
    # Employment length correlated with income (higher income -> typically longer employment)
    emp_length_base = np.random.uniform(0, 35, size=n_samples)
    employment_length = np.clip(emp_length_base + (income / 50000.0) - 2.0, 0, 40)
    
    # Existing debt (higher income -> higher debt capacity, but wide variance)
    existing_debt = income * np.random.exponential(scale=0.15, size=n_samples)
    existing_debt = np.clip(existing_debt, 0, 150000)
    
    # Credit history length depends on employment length & age
    credit_history_length = np.clip(employment_length + np.random.uniform(2, 10, size=n_samples), 1, 35)
    
    # Prior defaults: mostly 0 defaults
    prior_defaults_probs = [0.85, 0.10, 0.03, 0.015, 0.005]
    prior_defaults = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=prior_defaults_probs)
    
    # Monthly expenses (housing, utilities, etc. correlated with income)
    monthly_expenses = (income * 0.25 / 12) + np.random.uniform(500, 2000, size=n_samples)
    
    # Savings / Balance (higher income, longer employment -> higher savings)
    savings_base = np.random.exponential(scale=10000, size=n_samples)
    savings_balance = savings_base * (income / 60000.0) * (1.0 + (employment_length / 10.0))
    savings_balance = np.clip(savings_balance, 0, 500000)
    
    # Credit Utilization: 0.0 to 1.2
    credit_utilization = np.random.beta(a=2, b=5, size=n_samples) * 1.2
    credit_utilization = np.clip(credit_utilization, 0.0, 1.2)
    
    # Monthly transaction activity (number of transactions)
    transaction_activity = np.random.poisson(lam=30, size=n_samples)
    transaction_activity = np.clip(transaction_activity, 2, 150)
    
    # Employment Type
    emp_types = ['Salaried', 'Self-employed', 'Unemployed']
    emp_type_probs = [0.80, 0.16, 0.04]
    employment_type = np.random.choice(emp_types, size=n_samples, p=emp_type_probs)
    
    # Unstructured text simulation
    employment_notes = []
    stable_notes = [
        "Regular full-time software developer at stable tech firm",
        "Permanent school teacher with regular monthly salary",
        "Senior manager at multinational finance company, stable income",
        "Certified nurse at state hospital, long employment record",
        "Government officer, highly stable salaried income stream"
    ]
    unstable_notes = [
        "Contract worker in logistics, unstable hours week to week",
        "Temporary construction worker, work depends on season",
        "Part-time retail assistant, searching for full-time work",
        "Self-employed freelance writer, highly unstable cash flow",
        "Gig worker doing delivery services, fluctuating income"
    ]
    self_emp_notes = [
        "Self-employed painter running local business",
        "Independent freelance programmer, stable contracts",
        "Business owner of small local cafe, self-employed",
        "Self-employed photographer doing wedding gigs",
        "Freelance consulting business owner, irregular cash flows"
    ]
    unemployed_notes = [
        "Currently unemployed, seeking full-time position",
        "Out of work, looking for immediate stable role",
        "Unemployed, part-time temp worker, seeking stable role",
    ]
    
    for i in range(n_samples):
        etype = employment_type[i]
        # Introduce notes that align with employment type and stability
        if etype == 'Salaried':
            if np.random.rand() < 0.85:
                employment_notes.append(np.random.choice(stable_notes))
            else:
                employment_notes.append(np.random.choice(unstable_notes))
        elif etype == 'Self-employed':
            employment_notes.append(np.random.choice(self_emp_notes))
        else:
            employment_notes.append(np.random.choice(unemployed_notes))
            
    df = pd.DataFrame({
        'income': income,
        'loan_amount': loan_amount,
        'employment_length': employment_length,
        'existing_debt': existing_debt,
        'credit_history_length': credit_history_length,
        'prior_defaults': prior_defaults,
        'monthly_expenses': monthly_expenses,
        'savings_balance': savings_balance,
        'credit_utilization': credit_utilization,
        'transaction_activity': transaction_activity,
        'employment_type': employment_type,
        'employment_notes': employment_notes
    })
    
    return df

def extract_nlp_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Phase 2: Extract NLP-derived features from unstructured text notes.
    """
    print("Extracting NLP features from employment notes...")
    
    # Stable keywords flag
    stable_kw = ["stable", "permanent", "full-time", "regular", "salaried", "senior", "certified", "officer"]
    df['has_stable_keywords'] = df['employment_notes'].str.lower().apply(
        lambda text: 1 if any(w in text for w in stable_kw) else 0
    )
    
    # Unstable keywords flag
    unstable_kw = ["unstable", "temp", "temporary", "part-time", "gig", "fluctuating", "irregular", "contractor", "contract"]
    df['has_unstable_keywords'] = df['employment_notes'].str.lower().apply(
        lambda text: 1 if any(w in text for w in unstable_kw) else 0
    )
    
    # Self-employed keywords flag
    self_emp_kw = ["self-employed", "freelance", "freelancer", "business owner", "independent", "owner"]
    df['is_self_employed'] = df['employment_notes'].str.lower().apply(
        lambda text: 1 if any(w in text for w in self_emp_kw) else 0
    )
    
    # Text risk score (simple sentiment/stability risk proxy)
    df['text_risk_score'] = 0.5 * df['has_unstable_keywords'] + 0.3 * df['is_self_employed'] - 0.4 * df['has_stable_keywords']
    df['text_risk_score'] = df['text_risk_score'].astype(float)
    
    return df

def check_target_leakage(df: pd.DataFrame, features: list):
    """
    Phase 3: Verify the feature set against target leakage.
    Fails the training pipeline if target-leakage-prone columns are detected.
    """
    print("Verifying target leakage prevention...")
    forbidden_columns = [
        'default', 'observed_default', 'approved', 'historical_approved', 
        'default_target', 'target', 'repayment_status', 'repaid_amount'
    ]
    leaked = [col for col in features if col in forbidden_columns]
    if leaked:
        raise ValueError(f"CRITICAL: Target leakage detected! Forbidden columns in features: {leaked}")
    print("Target leakage check passed.")

def simulate_approvals_and_defaults(df: pd.DataFrame) -> pd.DataFrame:
    """
    Phase 4: Simulate selection bias (60% historical approval rate).
    True defaults are generated, but only observed for the approved cohort.
    """
    print("Simulating historical loan approvals and observed default outcomes...")
    
    # Standardize scale for risk scoring simulation
    debt_to_income = df['existing_debt'] / df['income']
    loan_to_income = df['loan_amount'] / df['income']
    
    # Underwriting scoring formula (lower value means higher default probability)
    # Approved applicants historically had better scores
    uw_score = (
        0.5 * np.log(df['income']) 
        - 0.4 * np.log(df['loan_amount']) 
        + 0.15 * df['employment_length'] 
        - 1.2 * df['prior_defaults'] 
        - 0.6 * debt_to_income
        + 0.1 * np.log(df['savings_balance'] + 1) 
        - 0.5 * df['credit_utilization']
    )
    
    # Determine threshold for 60% approval rate
    threshold_idx = int(len(df) * 0.40) # Reject bottom 40%
    sorted_uw = np.sort(uw_score)
    approval_threshold = sorted_uw[threshold_idx]
    
    df['historical_approved'] = (uw_score >= approval_threshold).astype(int)
    
    # True default risk (probability) - applies to all applicants in reality
    # Underwriter features + text risk score + noise
    noise = np.random.normal(0, 0.5, size=len(df))
    p_default_true = 1 / (1 + np.exp(-(
        1.5 * loan_to_income
        + 0.8 * df['prior_defaults']
        - 0.08 * df['employment_length']
        + 1.2 * df['credit_utilization']
        + 0.4 * df['text_risk_score']
        - 0.02 * df['credit_history_length']
        - 0.1 * np.log(df['savings_balance'] + 1)
        + noise
    )))
    
    # Draw default target label from default probability
    df['default_target'] = (p_default_true > np.random.uniform(0.1, 0.9, size=len(df))).astype(int)
    
    # Observed default: target is only known if applicant was historically approved
    df['observed_default'] = df['default_target'].copy()
    df.loc[df['historical_approved'] == 0, 'observed_default'] = np.nan
    
    approval_rate = df['historical_approved'].mean()
    print(f"Historical approval rate: {approval_rate * 100:.2f}%")
    print(f"Defaults in approved cohort: {df[df['historical_approved'] == 1]['observed_default'].sum()} "
          f"({df[df['historical_approved'] == 1]['observed_default'].mean() * 100:.2f}%)")
    
    return df

def run_reject_inference(train_df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
    """
    Phase 4: Fuzzy Augmentation Reject Inference.
    Trains a borrower default model on approved cases, predicts default risk for rejected cases,
    and replicates rejected observations with fractional weights to correct selection bias.
    """
    print("Running Reject Inference (Fuzzy Augmentation) on training set...")
    
    # Split training set into approved and rejected
    approved_train = train_df[train_df['historical_approved'] == 1].copy()
    rejected_train = train_df[train_df['historical_approved'] == 0].copy()
    
    # 1. Train borrower model on approved cases where target is observed
    X_app = approved_train[feature_cols]
    y_app = approved_train['observed_default']
    
    # Use Random Forest as the borrower model to predict default probabilities
    # Handle edge case where there is only one class (e.g. 0 defaults in small test datasets)
    X_rej = rejected_train[feature_cols]
    if len(np.unique(y_app)) < 2:
        print("Warning: Only one class found in approved training dataset. Setting default probability for rejected to zero.")
        p_default_rej = np.zeros(len(X_rej))
    else:
        borrower_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8)
        borrower_model.fit(X_app, y_app)
        p_default_rej = borrower_model.predict_proba(X_rej)[:, 1]
    
    # 3. Augment dataset
    # Approved records keep weight 1.0
    approved_train['weight'] = 1.0
    approved_train['target'] = approved_train['observed_default']
    
    # Rejected records are duplicated into target=1 and target=0 with fractional weights
    rejected_default_1 = rejected_train.copy()
    rejected_default_1['target'] = 1.0
    rejected_default_1['weight'] = p_default_rej
    
    rejected_default_0 = rejected_train.copy()
    rejected_default_0['target'] = 0.0
    rejected_default_0['weight'] = 1.0 - p_default_rej
    
    # Combine everything back
    augmented_train = pd.concat([approved_train, rejected_default_1, rejected_default_0], ignore_index=True)
    
    print(f"Original Train shape: {train_df.shape}")
    print(f"Augmented Train shape: {augmented_train.shape}")
    print(f"Sum of training weights: {augmented_train['weight'].sum():.2f}")
    
    return augmented_train

def evaluate_model(model, X_train, y_train, w_train, X_val, y_val, model_name: str) -> dict:
    """
    Helper to evaluate a trained model.
    """
    # Fit model (accept sample weights if provided)
    if w_train is not None:
        if isinstance(model, xgb.XGBClassifier):
            model.fit(X_train, y_train, sample_weight=w_train)
        elif isinstance(model, Pipeline) and 'model' in model.named_steps:
            model.fit(X_train, y_train, model__sample_weight=w_train)
        else:
            model.fit(X_train, y_train, sample_weight=w_train)
    else:
        model.fit(X_train, y_train)
        
    # Validation predictions
    probs = model.predict_proba(X_val)[:, 1]
    
    # Metrics
    roc_auc = roc_auc_score(y_val, probs)
    precision_vals, recall_vals, _ = precision_recall_curve(y_val, probs)
    pr_auc = auc(recall_vals, precision_vals)
    gini = 2 * roc_auc - 1
    
    # At default threshold of 0.5
    preds = (probs >= 0.5).astype(int)
    prec = precision_score(y_val, preds, zero_division=0)
    rec = recall_score(y_val, preds, zero_division=0)
    f1 = f1_score(y_val, preds, zero_division=0)
    brier = brier_score_loss(y_val, probs)
    
    return {
        'model_name': model_name,
        'roc_auc': roc_auc,
        'pr_auc': pr_auc,
        'gini': gini,
        'precision': prec,
        'recall': rec,
        'f1': f1,
        'brier': brier,
        'model': model
    }

def main():
    # Setup paths
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(backend_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    # Phase 1 & 2: Generate and Feature Engineer Synthetic Data
    raw_df = generate_synthetic_data(n_samples=6000)
    df = extract_nlp_features(raw_df)
    
    # Phase 4: Underwriting Selection Simulation
    df = simulate_approvals_and_defaults(df)
    
    # Feature columns
    feature_cols = [
        'income', 'loan_amount', 'employment_length', 'existing_debt',
        'credit_history_length', 'prior_defaults', 'monthly_expenses',
        'savings_balance', 'credit_utilization', 'transaction_activity',
        'has_stable_keywords', 'has_unstable_keywords', 'is_self_employed',
        'text_risk_score'
    ]
    
    # Phase 3: Validate Target Leakage
    check_target_leakage(df, feature_cols)
    
    # Split dataset: 70% Train, 15% Val, 15% Test
    # Stratify by historical approval indicator to ensure identical approval rates in splits
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=42, stratify=df['historical_approved'])
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df['historical_approved'])
    
    print(f"Data splits - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    # Phase 4: Apply Reject Inference strictly on the training set
    augmented_train = run_reject_inference(train_df, feature_cols)
    
    # Prepare features and targets for model selection
    X_train = augmented_train[feature_cols]
    y_train = augmented_train['target']
    w_train = augmented_train['weight']
    
    # Evaluate models on VALIDATION set (evaluating against true defaults to assess reject inference success)
    X_val = val_df[feature_cols]
    y_val = val_df['default_target'] # Evaluating on validation true default status
    
    # Phase 5: Model Comparison
    print("Training and comparing candidate models...")
    
    # Model 1: Logistic Regression Pipeline (scaling is necessary for LR)
    lr_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', LogisticRegression(random_state=42, max_iter=1000))
    ])
    lr_results = evaluate_model(lr_pipeline, X_train, y_train, w_train, X_val, y_val, "Logistic Regression")
    
    # Model 2: Random Forest
    rf = RandomForestClassifier(n_estimators=200, random_state=42, max_depth=10)
    rf_results = evaluate_model(rf, X_train, y_train, w_train, X_val, y_val, "Random Forest")
    
    # Model 3: XGBoost
    xgb_clf = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        random_state=42,
        eval_metric='logloss'
    )
    xgb_results = evaluate_model(xgb_clf, X_train, y_train, w_train, X_val, y_val, "XGBoost")
    
    # Display comparison
    results_list = [lr_results, rf_results, xgb_results]
    print("\nModel Evaluation Comparison on Validation Set:")
    print(f"{'Model':<25} | {'ROC-AUC':<8} | {'PR-AUC':<8} | {'Gini':<8} | {'Brier':<8} | {'F1':<5}")
    print("-" * 75)
    for r in results_list:
        print(f"{r['model_name']:<25} | {r['roc_auc']:.4f}   | {r['pr_auc']:.4f}   | {r['gini']:.4f} | {r['brier']:.4f} | {r['f1']:.4f}")
    print("-" * 75)
    
    # Champion selection based on Validation ROC-AUC
    champion_r = max(results_list, key=lambda x: x['roc_auc'])
    print(f"\nChampion Model Selected: {champion_r['model_name']} with Validation ROC-AUC = {champion_r['roc_auc']:.4f}")
    champion_model = champion_r['model']
    
    # Phase 6: Probability Calibration on Validation Set
    print("Performing probability calibration for the champion model...")
    # Calibrated Classifier fits on Val set using FrozenEstimator wrapper for already-trained champion model
    calibrator = CalibratedClassifierCV(estimator=FrozenEstimator(champion_model), method='isotonic')
    calibrator.fit(X_val, y_val)
    
    # Evaluate calibration quality
    raw_probs = champion_model.predict_proba(X_val)[:, 1]
    calibrated_probs = calibrator.predict_proba(X_val)[:, 1]
    
    raw_brier = brier_score_loss(y_val, raw_probs)
    calibrated_brier = brier_score_loss(y_val, calibrated_probs)
    print(f"Brier Score - Uncalibrated: {raw_brier:.5f}, Calibrated: {calibrated_brier:.5f}")
    
    # Phase 7: Decision Threshold tuning on Validation Set
    # We find threshold that balances approval vs default rate on Val set
    # A standard choice is maximizing F1 score
    thresholds = np.linspace(0.01, 0.99, 100)
    best_threshold = 0.5
    best_f1 = 0
    for t in thresholds:
        preds = (calibrated_probs >= t).astype(int)
        f1 = f1_score(y_val, preds, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = t
            
    print(f"Optimal Decision Threshold selected: {best_threshold:.4f} (maximizing F1: {best_f1:.4f})")
    
    # Final evaluation on the untouched TEST set
    X_test = test_df[feature_cols]
    y_test = test_df['default_target']
    
    test_probs = calibrator.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= best_threshold).astype(int)
    
    test_roc = roc_auc_score(y_test, test_probs)
    test_gini = 2 * test_roc - 1
    test_brier = brier_score_loss(y_test, test_probs)
    test_prec = precision_score(y_test, test_preds, zero_division=0)
    test_rec = recall_score(y_test, test_preds, zero_division=0)
    test_f1 = f1_score(y_test, test_preds, zero_division=0)
    
    print("\nFinal Performance on Untouched Test Set:")
    print(f"Test ROC-AUC: {test_roc:.4f}")
    print(f"Test Gini:    {test_gini:.4f}")
    print(f"Test Brier:   {test_brier:.4f}")
    print(f"Test F1-score:{test_f1:.4f} (Precision: {test_prec:.4f}, Recall: {test_rec:.4f})")
    
    # Export baseline distribution statistics for drift monitoring (PSI)
    # We calculate distribution stats of training feature set
    feature_schema = {
        "features": feature_cols,
        "baselines": {}
    }
    
    # We split training distribution of features into deciles to get expected bucket percentages
    for col in feature_cols:
        series = train_df[col]
        # Get 10 quantiles to create bin boundaries
        percentiles = np.percentile(series, np.linspace(0, 100, 11))
        # Ensure unique boundaries to prevent binning errors
        percentiles = np.unique(percentiles)
        if len(percentiles) < 2:
            percentiles = np.array([series.min() - 1, series.max() + 1])
            
        # Count values in training set in each bin
        counts, _ = np.histogram(series, bins=percentiles)
        pcts = counts / len(series)
        
        feature_schema["baselines"][col] = {
            "bins": percentiles.tolist(),
            "expected_pct": pcts.tolist(),
            "mean": float(series.mean()),
            "std": float(series.std())
        }
        
    # Phase 7: Save model and preprocessor metadata
    # Save XGBoost booster model or pipeline
    # To keep XGBoost clean and allow native TreeSHAP predict(pred_contribs=True) we save the XGBoost model itself
    # If the champion is XGBoost, we extract and save it. If not, we still train/save XGBoost as our primary production model
    # as XGBoost is required for SHAP visualization, but in this case we'll ensure we extract the booster
    # Let's save the XGBoost model object specifically
    if champion_r['model_name'] == "XGBoost":
        champion_xgb = champion_r['model']
    else:
        # Re-train standard XGBoost to serve as champion if LR/RF was marginally better, but XGBoost is our target
        print("Re-training default XGBoost to serve as the explainable production Champion...")
        champion_xgb = xgb_clf
        champion_xgb.fit(X_train, y_train, sample_weight=w_train)
        
    model_path = os.path.join(models_dir, 'credit_model_v1.json')
    # Save native XGBoost representation
    champion_xgb.save_model(model_path)
    
    # In order to support Isotonic Calibration outside, we'll save calibrator parameters
    # Isotonic Regression has 'y_min_', 'y_max_', 'X_', 'y_' attributes
    # We can write a simple custom calibrator save or serialize using pickle for the python backend
    import pickle
    calibrator_path = os.path.join(models_dir, 'calibrator_v1.pkl')
    with open(calibrator_path, 'wb') as f:
        pickle.dump(calibrator, f)
        
    # Save model metadata
    metadata = {
        "model_version": "1.0.0",
        "algorithm": champion_r['model_name'],
        "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "feature_count": len(feature_cols),
        "decision_threshold": float(best_threshold),
        "validation_metrics": {
            "roc_auc": float(champion_r['roc_auc']),
            "pr_auc": float(champion_r['pr_auc']),
            "gini": float(champion_r['gini']),
            "brier_score": float(champion_r['brier'])
        },
        "test_metrics": {
            "roc_auc": float(test_roc),
            "gini": float(test_gini),
            "brier_score": float(test_brier),
            "precision": float(test_prec),
            "recall": float(test_rec),
            "f1": float(test_f1)
        },
        "model_comparison": [
            {"model": lr_results['model_name'], "roc_auc": float(lr_results['roc_auc']), "gini": float(lr_results['gini']), "brier": float(lr_results['brier'])},
            {"model": rf_results['model_name'], "roc_auc": float(rf_results['roc_auc']), "gini": float(rf_results['gini']), "brier": float(rf_results['brier'])},
            {"model": xgb_results['model_name'], "roc_auc": float(xgb_results['roc_auc']), "gini": float(xgb_results['gini']), "brier": float(xgb_results['brier'])}
        ]
    }
    
    metadata_path = os.path.join(models_dir, 'model_metadata_v1.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
        
    schema_path = os.path.join(models_dir, 'feature_schema_v1.json')
    with open(schema_path, 'w') as f:
        json.dump(feature_schema, f, indent=2)
        
    # Save a small sample test CSV for batch scoring validation
    data_dir = os.path.join(backend_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)
    sample_test_csv = test_df.sample(50, random_state=42).copy()
    
    # Save with applicant_id and actual columns
    sample_test_csv.insert(0, 'applicant_id', [f"APP-{1000+i}" for i in range(len(sample_test_csv))])
    # Keep raw columns (before extraction) so we test CSV extraction pipeline
    sample_cols = ['applicant_id', 'income', 'loan_amount', 'employment_length', 'existing_debt',
                   'credit_history_length', 'prior_defaults', 'monthly_expenses', 'savings_balance',
                   'credit_utilization', 'transaction_activity', 'employment_type', 'employment_notes']
    sample_test_csv[sample_cols].to_csv(os.path.join(data_dir, 'sample_applicants.csv'), index=False)
    
    print("\nTraining Pipeline Completed Successfully.")
    print(f"Model saved to:      {model_path}")
    print(f"Calibrator saved to: {calibrator_path}")
    print(f"Metadata saved to:   {metadata_path}")
    print(f"Feature schema to:   {schema_path}")
    print(f"Sample CSV saved to: {os.path.join(data_dir, 'sample_applicants.csv')}")

if __name__ == '__main__':
    main()
