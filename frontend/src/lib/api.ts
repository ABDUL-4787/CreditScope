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

export const api = {
  getHealth: async (): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('API server is not responding');
    return res.json();
  },

  predictSingle: async (data: ApplicantData): Promise<PredictResponse> => {
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
    const res = await fetch(`${API_BASE_URL}/drift`);
    if (!res.ok) throw new Error('Failed to retrieve drift monitoring metrics');
    return res.json();
  },

  injectDrift: async (severity: 'moderate' | 'significant' = 'significant'): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/drift/inject?severity=${severity}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to inject drifted simulated data');
    return res.json();
  },

  getAnalytics: async (): Promise<AnalyticsResponse> => {
    const res = await fetch(`${API_BASE_URL}/analytics/segments`);
    if (!res.ok) throw new Error('Failed to retrieve analytics segments');
    return res.json();
  },
};
