import os
import sys
import json
import numpy as np
import pandas as pd
import streamlit as st
import datetime

# Fix import paths so we can resolve backend packages
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.model_service import ModelService
from services.db_service import DBService
from services.drift_service import DriftService
from services.fairness_service import FairnessService
from services.llm_service import LLMService

# Page configuration
st.set_page_config(
    page_title="CreditScope — AI Risk Engine",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom styling for clean fintech aesthetic (strictly light background, no dark overrides)
st.markdown("""
<style>
    .reportview-container {
        background: #FFFFFF;
    }
    .main .block-container {
        padding-top: 2rem;
        max-width: 1200px;
    }
    h1, h2, h3 {
        color: #1E3A8A !important;
        font-family: 'Inter', sans-serif;
    }
    .metric-card {
        background-color: #FAFAFA;
        border: 1px solid #E5E7EB;
        padding: 1.25rem;
        border-radius: 0.375rem;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .badge-approve {
        background-color: #ECFDF5;
        color: #065F46;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        font-weight: bold;
        border: 1px solid #A7F3D0;
    }
    .badge-decline {
        background-color: #FEF2F2;
        color: #991B1B;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        font-weight: bold;
        border: 1px solid #FCA5A5;
    }
</style>
""", unsafe_allow_html=True)

# Cache services for instant startup and page navigation
@st.cache_resource
def load_services():
    db = DBService()
    model = ModelService()
    drift = DriftService(db)
    llm = LLMService()
    
    # Pre-populate database with normal traffic baseline if empty
    try:
        drift.populate_normal_traffic(model, count=50)
    except Exception as e:
        pass
        
    return db, model, drift, llm

db_svc, model_svc, drift_svc, llm_svc = load_services()

# Sidebar navigation
st.sidebar.title("🛡️ CreditScope Navigation")
st.sidebar.markdown("AI-Powered Credit Risk Platform")
page = st.sidebar.radio(
    "Select Dashboard View:",
    ["Landing Page", "Scoring Demo", "Batch CSV Scoring", "Drift Monitoring", "SQL Analytics & Bias", "System Model Card"]
)

st.sidebar.markdown("---")
st.sidebar.markdown(f"**Model Version:** `1.0.0`  \n**Operating Threshold:** `{model_svc.decision_threshold:.4f}`")

# 1. Landing Page View
if page == "Landing Page":
    st.title("AI-Powered Credit Risk Scoring for Modern Lending")
    st.write(
        "A production-style machine learning system built to score applicant default risk, "
        "correct historical selection bias using reject inference, and serve explainable predictions "
        "accompanied by natural language underwriting summaries."
    )
    
    st.markdown("### End-to-End Decision Workflow")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("""
        <div class="metric-card">
            <h4>1. Input Characteristics</h4>
            <p style='font-size: 0.85rem; color: #4B5563;'>
                Financial indicators such as income, existing debt, savings balances, prior defaults, 
                and unstructured notes are parsed and validated for target leakage.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        st.markdown("""
        <div class="metric-card">
            <h4>2. Calibrated ML Model</h4>
            <p style='font-size: 0.85rem; color: #4B5563;'>
                A calibrated champion model, corrected for historical selection bias via reject inference, 
                generates a probability of default and scales it to a 0–100 risk score.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
    with col3:
        st.markdown("""
        <div class="metric-card">
            <h4>3. Explainable Decision</h4>
            <p style='font-size: 0.85rem; color: #4B5563;'>
                TreeSHAP contributions reveal the exact drivers behind the risk assessment, 
                which are summarized by the LLM underwriting analyst into narrative statements.
            </p>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("### ML Engineering Highlights")
    st.write(
        "* **Reject Inference**: Corrects for underwriting selection bias (missing outcomes on unapproved applicants) using Fuzzy Augmentation.\n"
        "* **Probability Calibration**: Uses Isotonic Regression on validation splits to align default probabilities with observed frequencies.\n"
        "* **Drift Monitoring**: Computes Population Stability Index (PSI) to track covariate shift on incoming live scoring profiles.\n"
        "* **TreeSHAP Attributions**: Pulls native booster margin projections from XGBoost to extract individual feature contributions."
    )

# 2. Scoring Demo View
elif page == "Scoring Demo":
    st.title("Applicant Risk Scoring Demo")
    st.write("Submit applicant parameters to calculate calibrated default risks, underwriting summaries, and attribution values.")
    
    col_form, col_res = st.columns([7, 5])
    
    with col_form:
        st.markdown("### Applicant Profile Data")
        with st.form("single_predict_form"):
            col_in1, col_in2 = st.columns(2)
            with col_in1:
                income = st.number_input("Annual Income ($)", min_value=0.0, value=75000.0, step=1000.0)
                loan_amount = st.number_input("Loan Amount Requested ($)", min_value=0.0, value=15000.0, step=500.0)
                employment_length = st.number_input("Employment Length (Years)", min_value=0, max_value=50, value=5)
                existing_debt = st.number_input("Existing Debt ($)", min_value=0.0, value=8000.0, step=500.0)
                credit_history_length = st.number_input("Credit History Length (Years)", min_value=0, max_value=50, value=8)
            with col_in2:
                prior_defaults = st.number_input("Prior Defaults (Count)", min_value=0, max_value=10, value=0)
                monthly_expenses = st.number_input("Monthly Expenses ($)", min_value=0.0, value=1500.0, step=100.0)
                savings_balance = st.number_input("Savings Account Balance ($)", min_value=0.0, value=10000.0, step=500.0)
                credit_utilization = st.number_input("Credit Utilization Rate", min_value=0.0, max_value=2.0, value=0.35, step=0.05)
                employment_type = st.selectbox("Employment Type", ["Salaried", "Self-employed", "Unemployed"])
                
            transaction_activity = st.number_input("Monthly Transaction Volume", min_value=0, max_value=200, value=35)
            employment_notes = st.text_area("Employment Remarks (NLP Notes)", value="Full-time salaried software developer at stable tech firm.")
            
            submit = st.form_submit_button("Run Risk Evaluation")
            
    with col_res:
        st.markdown("### Risk Decision Output")
        if submit:
            applicant = {
                "income": income,
                "loan_amount": loan_amount,
                "employment_length": employment_length,
                "existing_debt": existing_debt,
                "credit_history_length": credit_history_length,
                "prior_defaults": prior_defaults,
                "monthly_expenses": monthly_expenses,
                "savings_balance": savings_balance,
                "credit_utilization": credit_utilization,
                "transaction_activity": transaction_activity,
                "employment_type": employment_type,
                "employment_notes": employment_notes
            }
            
            with st.spinner("Processing underwriting factors..."):
                try:
                    # Run predictions
                    result = model_svc.predict(applicant)
                    
                    # Log prediction to local DB
                    db_svc.log_prediction(applicant, result)
                    
                    # 1. Decision Badge
                    decision = result["decision"]
                    if decision == "APPROVE":
                        st.markdown("<span class='badge-approve'>APPROVE</span>", unsafe_allow_html=True)
                    else:
                        st.markdown("<span class='badge-decline'>DECLINE</span>", unsafe_allow_html=True)
                        
                    # 2. Probability and Score
                    col_m1, col_m2 = st.columns(2)
                    col_m1.metric("Risk Score", f"{result['risk_score']} / 100")
                    col_m2.metric("Calibrated Default Prob", f"{result['default_probability']*100:.1f}%")
                    
                    # 3. Top factors bar chart
                    st.markdown("#### Top Contributing Model Factors")
                    factors_df = pd.DataFrame(result["top_factors"])
                    # map shap value to percentage format
                    factors_df['Percentage Impact (%)'] = factors_df['shap_value'] * 100
                    st.bar_chart(factors_df, x='label', y='Percentage Impact (%)', horizontal=True)
                    
                    # 4. Underwriting summary
                    st.markdown("#### AI Underwriting Analyst Summary")
                    st.markdown(f"*{result['underwriting_summary']}*")
                    
                except Exception as e:
                    st.error(f"Prediction failed: {e}")
        else:
            st.info("Submit applicant parameters in the left panel to execute predictions.")

# 3. Batch Scoring View
elif page == "Batch CSV Scoring":
    st.title("Batch Credit Scoring")
    st.write("Upload a raw CSV spreadsheet containing applicant profiles to run evaluations across multiple records.")
    
    uploaded_file = st.file_uploader("Upload Applicant CSV", type=["csv"])
    
    if uploaded_file is not None:
        try:
            input_df = pd.read_csv(uploaded_file)
            st.write("Uploaded Columns:", list(input_df.columns))
            
            if st.button("Execute Batch Prediction"):
                with st.spinner("Processing batch records..."):
                    # Process and log predictions
                    predictions = []
                    for idx, row in input_df.iterrows():
                        row_dict = row.to_dict()
                        # Clean fields
                        for k, v in row_dict.items():
                            if k not in ['employment_type', 'employment_notes'] and isinstance(v, (int, float, np.integer, np.floating)):
                                row_dict[k] = float(v)
                        
                        pred = model_svc.predict(row_dict)
                        # Log to DB
                        db_svc.log_prediction(row_dict, pred)
                        
                        predictions.append({
                            "applicant_id": row_dict.get("applicant_id", f"APP-{1000+idx}"),
                            "risk_score": pred["risk_score"],
                            "default_probability": pred["default_probability"],
                            "decision": pred["decision"],
                            "top_factor": pred["top_factors"][0]["label"] if pred["top_factors"] else "N/A"
                        })
                        
                    res_df = pd.DataFrame(predictions)
                    
                    # Summary metrics
                    col_b1, col_b2, col_b3, col_b4 = st.columns(4)
                    total_apps = len(res_df)
                    approval_rate = (res_df["decision"] == "APPROVE").mean()
                    avg_score = res_df["risk_score"].mean()
                    high_risk = (res_df["risk_score"] > 60).sum()
                    
                    col_b1.metric("Total Applications", total_apps)
                    col_b2.metric("Approval Rate", f"{approval_rate*100:.0f}%")
                    col_b3.metric("Avg Risk Score", f"{avg_score:.1f}")
                    col_b4.metric("High Risk Count", high_risk)
                    
                    # Display results table
                    st.markdown("### Scored Applications Output")
                    st.dataframe(res_df, use_container_width=True)
        except Exception as e:
            st.error(f"Failed to process CSV file: {e}")
    else:
        st.info("Upload a CSV file containing applicant profiles to get started. You can use the template inside `backend/data/sample_applicants.csv` for testing.")

# 4. Drift Monitoring View
elif page == "Drift Monitoring":
    st.title("Population Stability Index (PSI) Drift Monitoring")
    st.write("Real-time tracking of Population Stability Index (PSI) to detect feature distribution shifts between live traffic and training baselines.")
    
    # Simulate drift triggers
    st.markdown("### Simulate Live Data Drift")
    col_dr1, col_dr2, col_dr3 = st.columns([4, 4, 4])
    with col_dr1:
        if st.button("Simulate Mild Drift"):
            with st.spinner("Injecting mild drift traffic..."):
                drift_svc.inject_drift(severity='moderate')
                st.success("Mild drift dataset injected!")
    with col_dr2:
        if st.button("Simulate Significant Drift"):
            with st.spinner("Injecting high drift traffic..."):
                drift_svc.inject_drift(severity='significant')
                st.warning("Significant drift dataset injected!")
                
    st.write("---")
    
    # Calculate and display current drift status
    with st.spinner("Calculating current PSI metrics..."):
        drift_data = drift_svc.calculate_drift()
        
    if drift_data["status"] == "SUCCESS":
        overall = drift_data["overall_status"]
        if overall == "stable":
            st.success("API Traffic Status: STABLE TRAFFIC")
        elif overall == "moderate":
            st.warning("API Traffic Status: MODERATE DRIFT SHIFT")
        else:
            st.error("API Traffic Status: SIGNIFICANT DRIFT DETECTED - RE-TRAINING RECOMMENDED")
            
        # Draw Bar Chart of PSI
        psi_dict = drift_data["feature_psi"]
        psi_chart_data = pd.DataFrame([
            {"Feature": f.replace("_", " ").title(), "PSI": item["psi"]}
            for f, item in psi_dict.items()
        ])
        
        st.markdown("### Feature PSI Stability Metrics")
        st.bar_chart(psi_chart_data, x="Feature", y="PSI")
        
        # Details table
        st.markdown("### Feature Distribution Breakdowns")
        st.dataframe(pd.DataFrame(psi_dict).T[["psi", "severity", "mean_baseline", "mean_live"]], use_container_width=True)
    else:
        st.info("Inject drift traffic or run several evaluations to compute stability indices.")

# 5. SQL Analytics & Bias Auditing
elif page == "SQL Analytics & Bias":
    st.title("SQL Analytics & Fairness Auditing")
    st.write("Real-time aggregates calculated using SQL queries over production logs alongside demographic bias audits.")
    
    # Run SQL analytic aggregates
    analytics = db_svc.get_segment_analytics()
    predictions_log = db_svc.get_all_predictions()
    
    col_ch1, col_ch2 = st.columns(2)
    
    with col_ch1:
        st.markdown("#### Approval Rate by Segment (SQL Grouping)")
        seg_df = pd.DataFrame(analytics)
        if not seg_df.empty:
            seg_df['Approval Rate (%)'] = seg_df['approval_rate'] * 100
            st.bar_chart(seg_df, x="employment_type", y="Approval Rate (%)")
        else:
            st.write("No predictions logged yet.")
            
    with col_ch2:
        st.markdown("#### Average Risk Score by Segment")
        if not seg_df.empty:
            st.bar_chart(seg_df, x="employment_type", y="avg_risk")
            
    st.write("---")
    
    st.markdown("### Demographic Parity & Fairness Audit")
    st.warning(
        "Regulatory Notice: Fairness metrics are included strictly for portfolio demonstration "
        "and do not establish regulatory suitability (such as ECOA or Regulation B compliance) for real lending decisions."
    )
    
    fairness = FairnessService.calculate_fairness_metrics(predictions_log)
    if fairness["status"] == "SUCCESS":
        metrics = fairness["metrics"]
        
        col_fa1, col_fa2 = st.columns(2)
        with col_fa1:
            st.markdown("#### Disparity Audit Verdicts")
            st.metric("Demographic Parity Ratio", f"{metrics['disparity_ratio']:.2f}")
            st.metric("Equal Opportunity Difference (FNR Delta)", f"{metrics['equal_opportunity_difference']:.2f}")
            
            four_fifths = metrics["four_fifths_rule_passed"]
            if four_fifths:
                st.success("Four-Fifths Rule: PASSED (Ratio > 0.8)")
            else:
                st.warning("Four-Fifths Rule: DISPARATE IMPACT WARNING (Ratio < 0.8)")
                
        with col_fa2:
            st.markdown("#### Group Outcomes Breakdown")
            st.write(f"**{metrics['group_a']['name']}** (Sample Size: {metrics['group_a']['size']})")
            st.write(f"- Approval Rate: `{metrics['group_a']['approval_rate']*100:.1f}%` | FNR: `{metrics['group_a']['fnr']*100:.1f}%`")
            st.write(f"**{metrics['group_b']['name']}** (Sample Size: {metrics['group_b']['size']})")
            st.write(f"- Approval Rate: `{metrics['group_b']['approval_rate']*100:.1f}%` | FNR: `{metrics['group_b']['fnr']*100:.1f}%`")
    else:
        st.info("Log more prediction records to calculate fairness disparity ratios.")

# 6. Model Card About View
elif page == "System Model Card":
    st.title("Model Card — CreditScope v1.0.0")
    st.write("Technical specifications, underwriting bias correction details, and methodology summaries.")
    
    st.markdown("""
    <div class="metric-card">
        <h4>Model Details & Objective</h4>
        <p style='font-size: 0.85rem; color: #4B5563;'>
            Predicts the probability of default within a 12-month window for consumer lending. 
            Calibrated on a programmatic synthetic dataset containing 6,000 observations.
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("### Underwriting selection bias (Reject Inference)")
    st.write(
        "Credit models are subject to **selection bias** because repayment outcomes are only observed for historically "
        "approved applicants. We implement **Fuzzy Augmentation** to correct this:\n"
        "1. Train a model on the approved cohort (observed outcomes).\n"
        "2. Score the rejected cohort to estimate their probability of default.\n"
        "3. Augment the training dataset by adding the rejected cohort twice (once as default=1 with weight p_default, "
        "and once as default=0 with weight 1-p_default) in the final training loop."
    )
    
    st.markdown("### Probability Calibration")
    st.write(
        "Many classifiers optimize for ranking order (AUC-ROC) rather than accurate absolute probabilities. "
        "We fit **Isotonic Regression** on validation splits to translate raw XGBoost logits into true empirical frequencies, "
        "improving credit pricing decisions and Brier scores."
    )
