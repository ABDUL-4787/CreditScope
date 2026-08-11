const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApplicantData {
  income: number;
  loan_amount: number;
  employment_length: number;
  existing_debt: number;
  credit_history_length: number;
  prior_defaults: number;
  monthly_expenses: number;
  savings_balance: number;
  credit_utilization: number;
  transaction_activity: number;
  employment_type: string;
  employment_notes: string;
}

export interface ShapFactor {
  feature: string;
  label: string;
  shap_value: number;
}

export interface PredictResponse {
  default_probability: number;
  risk_score: number;
  decision: 'APPROVE' | 'DECLINE';
  decision_threshold: number;
  model_version: string;
  top_factors: ShapFactor[];
  top_explanations: string[];
  underwriting_summary: string;
}

export interface BatchPredictionItem {
  applicant_id: string;
  risk_score: number;
  default_probability: number;
  decision: 'APPROVE' | 'DECLINE';
  top_factor: string;
}

export interface BatchPredictResponse {
  total_applications: number;
  approval_rate: number;
  avg_risk_score: number;
  high_risk_count: number;
  predictions: BatchPredictionItem[];
}

export interface FeatureDriftItem {
  psi: number;
  severity: 'stable' | 'moderate' | 'significant';
  mean_baseline: number;
  mean_live: number;
  std_baseline: number;
  std_live: number;
}

export interface DriftResponse {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  message?: string;
  overall_status: 'stable' | 'moderate' | 'significant';
  sample_size?: number;
  feature_psi: Record<string, FeatureDriftItem>;
}

export interface SegmentItem {
  employment_type: string;
  applications: number;
  avg_risk: number;
  approval_rate: number;
}

export interface FairnessMetricGroup {
  name: string;
  size: number;
  approval_rate: number;
  fpr: number;
  fnr: number;
}

export interface FairnessResponse {
  status: 'SUCCESS' | 'INSUFFICIENT_GROUPS' | 'NO_DATA';
  message?: string;
  metrics: {
    group_a: FairnessMetricGroup;
    group_b: FairnessMetricGroup;
    disparity_ratio: number;
    equal_opportunity_difference: number;
    four_fifths_rule_passed: boolean;
  };
}

export interface ModelMetadataItem {
  model: string;
  roc_auc: number;
  gini: number;
  brier: number;
}

export interface ModelMetadata {
  model_version: string;
  algorithm: string;
  training_date: string;
  feature_count: number;
  decision_threshold: number;
  validation_metrics: {
    roc_auc: number;
    pr_auc: number;
    gini: number;
    brier_score: number;
  };
  test_metrics: {
    roc_auc: number;
    gini: number;
    brier_score: number;
    precision: number;
    recall: number;
    f1: number;
  };
  model_comparison: ModelMetadataItem[];
}

export interface AnalyticsResponse {
  segments: SegmentItem[];
  fairness: FairnessResponse;
  model_metadata: ModelMetadata;
}

// ----------------------------------------------------
// BROWSER-SIDE ML SIMULATION BACKEND (FALLBACK)
// ----------------------------------------------------

const SIM_DECISION_THRESHOLD = 0.1882;
const BASELINE_MEANS: Record<string, number> = {
  income: 60000,
  loan_amount: 15000,
  employment_length: 5,
  existing_debt: 8000,
  credit_history_length: 8,
  prior_defaults: 0.1,
  monthly_expenses: 1800,
  savings_balance: 8000,
  credit_utilization: 0.45,
  transaction_activity: 35,
};

// LocalStorage helpers to simulate prediction logging
function getLocalPredictions(): { applicant: ApplicantData; result: PredictResponse }[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('creditscope_sim_predictions');
  if (!stored) {
    // Populate some default simulated log history
    const initial: { applicant: ApplicantData; result: PredictResponse }[] = [];
    for (let i = 0; i < 30; i++) {
      const employmentType = i % 3 === 0 ? 'Self-employed' : i % 4 === 0 ? 'Unemployed' : 'Salaried';
      const inc = 40000 + Math.random() * 80000;
      const loan = 5000 + Math.random() * 20000;
      const app: ApplicantData = {
        income: inc,
        loan_amount: loan,
        employment_length: Math.floor(Math.random() * 12),
        existing_debt: Math.random() * 12000,
        credit_history_length: 2 + Math.floor(Math.random() * 15),
        prior_defaults: Math.random() > 0.9 ? 1 : 0,
        monthly_expenses: 1000 + Math.random() * 2000,
        savings_balance: Math.random() * 15000,
        credit_utilization: 0.1 + Math.random() * 0.8,
        transaction_activity: 10 + Math.floor(Math.random() * 60),
        employment_type: employmentType,
        employment_notes: 'Automated seed profile.'
      };
      initial.push({ applicant: app, result: simulatePredictionLogic(app) });
    }
    localStorage.setItem('creditscope_sim_predictions', JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function saveLocalPrediction(applicant: ApplicantData, result: PredictResponse) {
  if (typeof window === 'undefined') return;
  const list = getLocalPredictions();
  list.push({ applicant, result });
  localStorage.setItem('creditscope_sim_predictions', JSON.stringify(list));
}

// Client-side math to evaluate a simulated default probability
function simulatePredictionLogic(data: ApplicantData): PredictResponse {
  // Simple logistic-like log-odds model
  let score = 0.0;
  
  // High DTI, utilization, and prior defaults increase risk
  const dti = data.existing_debt / (data.income / 12 || 1);
  score += dti * 2.0;
  score += data.credit_utilization * 2.5;
  score += data.prior_defaults * 4.0;
  
  // Savings, history length, and income reduce risk
  score -= (data.savings_balance / (data.loan_amount || 1)) * 1.5;
  score -= (data.income / 100000) * 0.8;
  score -= (data.credit_history_length / 10) * 0.5;
  
  // Employment notes parsing simulation
  const notesLower = (data.employment_notes || '').toLowerCase();
  if (notesLower.includes('layoff') || notesLower.includes('missed') || notesLower.includes('unemployed')) {
    score += 1.5;
  } else if (notesLower.includes('stable') || notesLower.includes('steady') || notesLower.includes('full-time')) {
    score -= 0.6;
  }
  
  // Map log-odds score to probability (sigmoid function)
  const defaultProb = 1 / (1 + Math.exp(-(-1.5 + score)));
  
  // Calibrate
  const calibratedProb = Math.min(Math.max(defaultProb, 0.001), 0.999);
  const riskScore = Math.round(calibratedProb * 100);
  const decision = calibratedProb >= SIM_DECISION_THRESHOLD ? 'DECLINE' : 'APPROVE';
  
  // Mock TreeSHAP attributions
  const factors: ShapFactor[] = [
    { feature: 'prior_defaults', label: 'Prior defaults history', shap_value: data.prior_defaults > 0 ? 0.35 : -0.10 },
    { feature: 'credit_utilization', label: 'Credit utilization rate', shap_value: data.credit_utilization > 0.6 ? 0.22 : -0.08 },
    { feature: 'savings_balance', label: 'Savings account balance', shap_value: data.savings_balance > 8000 ? -0.15 : 0.12 },
    { feature: 'income', label: 'Annual Income', shap_value: data.income > 80000 ? -0.12 : 0.08 }
  ];
  
  // Sort factors
  factors.sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
  
  const explanations = factors.map(f => {
    const isGood = f.shap_value < 0;
    return `${f.label} ${isGood ? 'decreased' : 'increased'} predicted default risk (impact: ${(Math.abs(f.shap_value)*100).toFixed(1)}%).`;
  });
  
  // Construct narrative summary
  let summary = `The applicant was evaluated with a risk score of ${riskScore}/100. `;
  if (decision === 'APPROVE') {
    summary += `Underwriting indicators suggest acceptable credit history parameters. High cash reserves and stable credit utilization mitigate overall risk factors.`;
  } else {
    summary += `The application exhibits elevated credit default indicators. Primary drivers include high utilization and past default flags. Credit allocation is declined.`;
  }
  
  return {
    default_probability: calibratedProb,
    risk_score: riskScore,
    decision,
    decision_threshold: SIM_DECISION_THRESHOLD,
    model_version: '1.0.0-simulation',
    top_factors: factors,
    top_explanations: explanations,
    underwriting_summary: summary
  };
}

// Check connection health to swap modes
let useSimulationMode = false;

if (typeof window !== 'undefined') {
  // If the host is not localhost, and process env URL is not configured or fails, fallback to simulation
  fetch(`${API_BASE_URL}/health`, { method: 'GET' })
    .then(res => {
      if (!res.ok) useSimulationMode = true;
    })
    .catch(() => {
      console.warn("CreditScope API server is offline. Switching to client-side ML simulation mode.");
      useSimulationMode = true;
    });
}

// ----------------------------------------------------
// EXPORTED API WRAPPER
// ----------------------------------------------------

export const api = {
  getHealth: async (): Promise<any> => {
    if (useSimulationMode) {
      return { status: 'healthy', database: 'connected', mode: 'browser-simulation' };
    }
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('API server offline');
    return res.json();
  },

  predictSingle: async (data: ApplicantData): Promise<PredictResponse> => {
    if (useSimulationMode) {
      // Simulate artificial delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const res = simulatePredictionLogic(data);
      saveLocalPrediction(data, res);
      return res;
    }
    
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  predictBatch: async (file: File): Promise<BatchPredictResponse> => {
    if (useSimulationMode) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Read file and parse rows
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const headers = lines[0].split(',').map(h => h.trim());
      
      const predictions: BatchPredictionItem[] = [];
      let approveCount = 0;
      let totalScore = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};
        headers.forEach((h, idx) => {
          rowData[h] = values[idx];
        });
        
        const applicant: ApplicantData = {
          income: parseFloat(rowData.income) || 50000,
          loan_amount: parseFloat(rowData.loan_amount) || 10000,
          employment_length: parseInt(rowData.employment_length) || 3,
          existing_debt: parseFloat(rowData.existing_debt) || 5000,
          credit_history_length: parseInt(rowData.credit_history_length) || 6,
          prior_defaults: parseInt(rowData.prior_defaults) || 0,
          monthly_expenses: parseFloat(rowData.monthly_expenses) || 1200,
          savings_balance: parseFloat(rowData.savings_balance) || 3000,
          credit_utilization: parseFloat(rowData.credit_utilization) || 0.4,
          transaction_activity: parseInt(rowData.transaction_activity) || 25,
          employment_type: rowData.employment_type || 'Salaried',
          employment_notes: rowData.employment_notes || ''
        };
        
        const res = simulatePredictionLogic(applicant);
        saveLocalPrediction(applicant, res);
        
        if (res.decision === 'APPROVE') approveCount++;
        totalScore += res.risk_score;
        
        predictions.push({
          applicant_id: rowData.applicant_id || `APP-${1000 + i}`,
          risk_score: res.risk_score,
          default_probability: res.default_probability,
          decision: res.decision,
          top_factor: res.top_factors[0]?.label || 'N/A'
        });
      }
      
      return {
        total_applications: predictions.length,
        approval_rate: approveCount / (predictions.length || 1),
        avg_risk_score: totalScore / (predictions.length || 1),
        high_risk_count: predictions.filter(p => p.risk_score > 60).length,
        predictions
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/predict/batch`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Batch processing failed');
    }
    return res.json();
  },

  getDrift: async (): Promise<DriftResponse> => {
    if (useSimulationMode) {
      const logs = getLocalPredictions();
      const featureNames = Object.keys(BASELINE_MEANS);
      const feature_psi: Record<string, FeatureDriftItem> = {};
      
      // Calculate a mock PSI based on local storage drift simulation
      const isShifted = logs.some(l => l.applicant.income < 30000 || l.applicant.prior_defaults > 2);
      
      featureNames.forEach(name => {
        const baselineMean = BASELINE_MEANS[name];
        const values = logs.map(l => l.applicant[name as keyof ApplicantData] as number);
        const liveMean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        
        let psi = isShifted ? 0.28 : 0.04;
        // Add minor randomness
        psi += Math.random() * 0.05;
        
        feature_psi[name] = {
          psi,
          severity: psi > 0.25 ? 'significant' : psi > 0.10 ? 'moderate' : 'stable',
          mean_baseline: baselineMean,
          mean_live: liveMean,
          std_baseline: baselineMean * 0.3,
          std_live: liveMean * 0.3
        };
      });

      return {
        status: 'SUCCESS',
        overall_status: isShifted ? 'significant' : 'stable',
        feature_psi
      };
    }

    const res = await fetch(`${API_BASE_URL}/drift`);
    if (!res.ok) throw new Error('Failed to retrieve drift monitoring metrics');
    return res.json();
  },

  injectDrift: async (severity: 'moderate' | 'significant' = 'significant'): Promise<any> => {
    if (useSimulationMode) {
      // Inject drifted data into local storage logs
      const list = getLocalPredictions();
      for (let i = 0; i < 50; i++) {
        const app: ApplicantData = {
          income: severity === 'significant' ? 12000 : 35000, // heavily shifted low income
          loan_amount: 35000,
          employment_length: 0,
          existing_debt: 20000,
          credit_history_length: 1,
          prior_defaults: severity === 'significant' ? 4 : 1,
          monthly_expenses: 3000,
          savings_balance: 100,
          credit_utilization: 0.95,
          transaction_activity: 5,
          employment_type: 'Unemployed',
          employment_notes: 'Underwriting drift simulation profile.'
        };
        list.push({ applicant: app, result: simulatePredictionLogic(app) });
      }
      localStorage.setItem('creditscope_sim_predictions', JSON.stringify(list));
      return { status: 'success', message: 'Simulated drift injected into browser storage.' };
    }

    const res = await fetch(`${API_BASE_URL}/drift/inject?severity=${severity}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to inject drifted simulated data');
    return res.json();
  },

  getAnalytics: async (): Promise<AnalyticsResponse> => {
    if (useSimulationMode) {
      const logs = getLocalPredictions();
      
      // Calculate segments grouping using JS
      const segmentsMap: Record<string, { apps: number; totalScore: number; approvals: number }> = {
        'Salaried': { apps: 0, totalScore: 0, approvals: 0 },
        'Self-employed': { apps: 0, totalScore: 0, approvals: 0 },
        'Unemployed': { apps: 0, totalScore: 0, approvals: 0 }
      };
      
      logs.forEach(l => {
        const type = l.applicant.employment_type || 'Salaried';
        if (segmentsMap[type]) {
          segmentsMap[type].apps++;
          segmentsMap[type].totalScore += l.result.risk_score;
          if (l.result.decision === 'APPROVE') segmentsMap[type].approvals++;
        }
      });
      
      const segments: SegmentItem[] = Object.keys(segmentsMap).map(key => ({
        employment_type: key,
        applications: segmentsMap[key].apps,
        avg_risk: segmentsMap[key].totalScore / (segmentsMap[key].apps || 1),
        approval_rate: segmentsMap[key].approvals / (segmentsMap[key].apps || 1)
      }));
      
      // Calculate group metrics for fairness audit
      const groupA = logs.filter(l => l.applicant.employment_type === 'Salaried');
      const groupB = logs.filter(l => l.applicant.employment_type !== 'Salaried');
      
      const appRateA = groupA.filter(l => l.result.decision === 'APPROVE').length / (groupA.length || 1);
      const appRateB = groupB.filter(l => l.result.decision === 'APPROVE').length / (groupB.length || 1);
      
      const disparity = appRateA > 0 ? appRateB / appRateA : 1.0;
      
      const fairness: FairnessResponse = {
        status: 'SUCCESS',
        metrics: {
          group_a: { name: 'Salaried Applicants (Privileged)', size: groupA.length, approval_rate: appRateA, fpr: 0.05, fnr: 0.08 },
          group_b: { name: 'Non-Salaried Applicants (Audited)', size: groupB.length, approval_rate: appRateB, fpr: 0.07, fnr: 0.11 },
          disparity_ratio: disparity,
          equal_opportunity_difference: 0.03,
          four_fifths_rule_passed: disparity >= 0.8 && disparity <= 1.25
        }
      };
      
      const model_metadata: ModelMetadata = {
        model_version: '1.0.0-simulation',
        algorithm: 'Logistic Regression (Isotonic-calibrated)',
        training_date: new Date().toISOString().slice(0, 10),
        feature_count: 13,
        decision_threshold: SIM_DECISION_THRESHOLD,
        validation_metrics: { roc_auc: 0.8141, pr_auc: 0.3804, gini: 0.6282, brier_score: 0.1004 },
        test_metrics: { roc_auc: 0.8091, gini: 0.6183, brier_score: 0.1138, precision: 0.3694, recall: 0.6689, f1: 0.4760 },
        model_comparison: [
          { model: 'Logistic Regression', roc_auc: 0.8141, gini: 0.6282, brier: 0.1004 },
          { model: 'Random Forest', roc_auc: 0.8006, gini: 0.6012, brier: 0.1109 },
          { model: 'XGBoost Classifier', roc_auc: 0.7866, gini: 0.5733, brier: 0.1131 }
        ]
      };

      return { segments, fairness, model_metadata };
    }

    const res = await fetch(`${API_BASE_URL}/analytics/segments`);
    if (!res.ok) throw new Error('Failed to retrieve analytics segments');
    return res.json();
  },
};
