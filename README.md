# CreditScope — AI-Powered Credit Risk Scoring Platform

CreditScope is a production-style credit risk scoring engine and monitoring platform designed for a fintech lending use case. It is positioned as an ML Engineering portfolio project, demonstrating correct underwriting methodologies, selection-bias correction, probability calibration, data drift tracking, and fairness auditing.

```text
                         CreditScope
                              |
              +---------------+---------------+
              |                               |
          Next.js                         FastAPI
           Vercel                         Render
              |                               |
       +------+------+              +---------+---------+
       |      |      |              |         |         |
     Score  Batch  Drift         Predict    Drift    Analytics
                                      |
                                  XGBoost
                                      |
                              +-------+-------+
                              |               |
                            TreeSHAP       Probability
                                           Calibration
                              |               |
                              +-------+-------+
                                      |
                                 LLM Analyst
```

## Tech Stack
* **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
* **Backend:** FastAPI (Python 3.11/3.14), SQLite (structured for PostgreSQL swapping), Uvicorn, pytest.
* **ML Stack:** XGBoost, scikit-learn, pandas, numpy.
* **Generative AI:** Google Gemini API (integrated with deterministic local text template fallback).
* **Deployment Target:** Frontend on Vercel, backend on Render (Docker-containerized).

---

## Local Development Setup

### 1. Model Training
Before starting the servers, you must run the offline model training pipeline to generate the synthetic data and model files:
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python scripts/train_pipeline.py
# On Linux/macOS:
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/train_pipeline.py
```
This generates the following files in `backend/models/`:
* `credit_model_v1.json` — Native XGBoost classifier.
* `calibrator_v1.pkl` — Isotonic probability calibrator wrapper.
* `model_metadata_v1.json` — Evaluated metrics and operating threshold.
* `feature_schema_v1.json` — Numeric features quantile boundaries and baseline distribution stats.

### 2. Backend API Setup
Start the FastAPI server:
```bash
# Set up environment variables if desired (optional)
# On Windows:
.venv\Scripts\python main.py
# On Linux/macOS:
.venv/bin/python main.py
```
The backend starts at `http://localhost:8000`. You can review the interactive OpenAPI documentation at `http://localhost:8000/docs`.

### 3. Frontend App Setup
Start the Next.js development server:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## Technical Architecture & Methodology

### 1. Selection Bias & Reject Inference
Lending systems suffer from **selection bias**: default outcomes (the target label) are only observable for applicants who were historically approved. If a model is trained only on approved cases, it will generalize poorly to the full applicant distribution.

CreditScope addresses this using **Fuzzy Augmentation**:
1. A borrower model is trained on the approved cohort (observed outcomes).
2. It scores the rejected cohort to estimate their probability of default: $p = P(Default | Rejected)$.
3. Rejected records are duplicated in the training set: once as `default = 1` with sample weight $p$, and once as `default = 0` with sample weight $1 - p$.
4. The final champion model is trained on this combined, weighted dataset, effectively reducing underwriting selection bias.

### 2. Probability Calibration
Rank-ordering algorithms (like raw XGBoost margins) do not output true default probabilities. For credit pricing, we require **calibrated probabilities** where a predicted probability of 15% means exactly 15% of that cohort default. We fit **Isotonic Regression** on the validation set to transform raw logits into calibrated probability outputs.

### 3. TreeSHAP Feature Explanations
Instead of compiling heavy third-party packages, we query XGBoost's native booster margin contributions (`pred_contribs=True`). This extracts the exact **TreeSHAP** attribution values for each feature in log-odds space, which are sorted to return the top 3 drivers of individual decisions.

### 4. LLM Underwriting Analyst
The Gemini API translates the structured model output (scores, decision, and SHAP factors) into a professional underwriting paragraph. Strong prompt constraints restrict the LLM to drafting summaries; it is **never** permitted to override the mathematical decision made by the ML model.

### 5. Population Stability Index (PSI) Drift Monitoring
Data drift is evaluated by comparing the distribution of incoming live scoring requests against the training baseline saved in `feature_schema_v1.json`. We bin live numerical features using training decile boundaries and compute:
$$\text{PSI} = \sum (\text{Actual}\% - \text{Expected}\%) \times \ln\left(\frac{\text{Actual}\%}{\text{Expected}\%}\right)$$
* $\text{PSI} < 0.10$ : Stable
* $0.10 \le \text{PSI} \le 0.25$ : Moderate Shift
* $\text{PSI} > 0.25$ : Significant Drift (Red Alert)

### 6. Fairness Auditing
Demographic parity and equal opportunity ratios are audited between demographic groups (represented synthetically by Salaried vs. Non-Salaried applicants). Disparities in approval rates and False Negative Rates are checked against the EEOC Four-Fifths (80%) rule to detect potential systemic bias.

---

## API Documentation

### `GET /health`
Exposes system uptime status, database connections, active model version, champion algorithm, and decision threshold.

### `POST /predict`
Accepts a JSON payload of borrower characteristics and returns:
```json
{
  "default_probability": 0.128,
  "risk_score": 13,
  "decision": "APPROVE",
  "decision_threshold": 0.188,
  "model_version": "1.0.0",
  "top_explanations": [
    "Zero past defaults record reduced predicted risk (effect: 4.8%)",
    "Substantial cash reserves reduced predicted risk (effect: 3.2%)"
  ],
  "underwriting_summary": "The applicant presents relatively low predicted default risk (Risk Score: 13/100). Underwriting factors indicate that zero past defaults and high savings balances mitigate secondary risks."
}
```

### `POST /predict/batch`
Accepts a CSV upload, parses features, logs predictions to SQLite, and returns a summary:
* `total_applications`
* `approval_rate`
* `avg_risk_score`
* `high_risk_count`
* List of scored rows containing `risk_score`, `decision`, and `top_factor`.

### `GET /drift`
Computes the current PSI values for all numerical features.

### `POST /drift/inject`
Clears local logs and populates the database with 200 heavily shifted applicant profiles to demonstrate real-time dashboard alerts.

### `GET /analytics/segments`
Exposes aggregate SQL queries logging applications and risk scores grouped by segment, alongside active fairness disparity ratios.

---

## Testing

Verify the system components using automated suites:
```bash
# Execute pytest on ML logic and API endpoints
cd backend
$env:PYTHONPATH="."; .venv\Scripts\pytest backend/
```

Verify the frontend compiles without typescript or configuration warnings:
```bash
cd frontend
npm run build
```

---

## Deployment Setup

* **Frontend:** Deployed to Vercel (imports `NEXT_PUBLIC_API_URL` to route requests to Render).
* **Backend:** Deployed to Render as a Web Service. The repository utilizes a `Dockerfile` compiling the Python environment.
* *Note on Render Free Tier:* Render spins down idle free instances. The first request after a period of inactivity may take up to 30 seconds to wake the service. The frontend includes a warning message to guide users during cold-starts.
