'use client';

import { useState } from 'react';
import { api, ApplicantData, PredictResponse } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Info } from 'lucide-react';

export default function DemoPage() {
  const [formData, setFormData] = useState<ApplicantData>({
    income: 75000,
    loan_amount: 15000,
    employment_length: 5,
    existing_debt: 8000,
    credit_history_length: 8,
    prior_defaults: 0,
    monthly_expenses: 1500,
    savings_balance: 10000,
    credit_utilization: 0.35,
    transaction_activity: 35,
    employment_type: 'Salaried',
    employment_notes: 'Full-time salaried software developer at stable tech firm.'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'employment_type' || name === 'employment_notes' ? value : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.predictSingle(formData);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'An error occurred during risk evaluation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between border-b border-gray-200 pb-5 mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl tracking-tight">
            Applicant Risk Scoring Demo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit applicant profile parameters to calculate calibrated default risks, underwriting summaries, and attribution values.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Panel (Left) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-6">
            Applicant Profile Data
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Annual Income ($)</label>
                <input
                  type="number"
                  name="income"
                  value={formData.income}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Loan Amount Requested ($)</label>
                <input
                  type="number"
                  name="loan_amount"
                  value={formData.loan_amount}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Employment Length (Years)</label>
                <input
                  type="number"
                  name="employment_length"
                  value={formData.employment_length}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Existing Debt ($)</label>
                <input
                  type="number"
                  name="existing_debt"
                  value={formData.existing_debt}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Credit History Length (Years)</label>
                <input
                  type="number"
                  name="credit_history_length"
                  value={formData.credit_history_length}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Prior Defaults (Count)</label>
                <input
                  type="number"
                  name="prior_defaults"
                  value={formData.prior_defaults}
                  onChange={handleInputChange}
                  min="0"
                  max="10"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Monthly Expenses ($)</label>
                <input
                  type="number"
                  name="monthly_expenses"
                  value={formData.monthly_expenses}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Savings Account Balance ($)</label>
                <input
                  type="number"
                  name="savings_balance"
                  value={formData.savings_balance}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Credit Utilization Rate</label>
                <input
                  type="number"
                  name="credit_utilization"
                  value={formData.credit_utilization}
                  onChange={handleInputChange}
                  min="0"
                  max="2"
                  step="0.01"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Employment Type</label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none bg-white"
                  required
                >
                  <option value="Salaried">Salaried</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Monthly Transactions (Volume)</label>
                <input
                  type="number"
                  name="transaction_activity"
                  value={formData.transaction_activity}
                  onChange={handleInputChange}
                  min="0"
                  max="200"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Employment Remarks (Unstructured notes for NLP)</label>
                <textarea
                  name="employment_notes"
                  value={formData.employment_notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                  placeholder="E.g., Stable salary payments, permanent employee since 3 years..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Evaluating Credit Default Probability...
                </>
              ) : (
                'Run Risk Evaluation'
              )}
            </button>

            {loading && (
              <div className="flex gap-2 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 items-start">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Cold-start note:</strong> If the model is warm, this request finishes in under 1 second. Since Render's free tier spins down idle servers, the first API request of the session may take up to 30 seconds to wake.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Results Panel (Right) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 text-red-900 p-4 rounded-lg border border-red-200 shadow-sm flex gap-3 items-start">
              <XCircle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Evaluation Failed</h3>
                <p className="text-xs mt-1 leading-normal">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg min-h-[300px]">
              <Info className="h-10 w-10 text-gray-400 mb-4" />
              <h3 className="font-bold text-gray-900 text-sm">Waiting for Evaluation</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-normal">
                Enter parameters and click "Run Risk Evaluation" to view the credit score, approve/decline decision, and model explanations.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border border-gray-200 rounded-lg shadow-sm min-h-[300px]">
              <RefreshCw className="h-8 w-8 text-blue-900 animate-spin mb-4" />
              <h3 className="font-bold text-gray-900 text-sm">Processing Underwriting Factors...</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-normal">
                Connecting to backend API, parsing unstructured notes, calculating TreeSHAP values, and drafting underwriting narrative.
              </p>
            </div>
          )}

          {result && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6 flex-1">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                Risk Decision Output
              </h2>

              {/* Decision Badge & Calibration Info */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded border border-gray-100">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recommendation</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {result.decision === 'APPROVE' ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-bold text-green-700">APPROVE</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-lg font-bold text-red-700">DECLINE</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Default Probability</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">
                    {(result.default_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Gauge Meter */}
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center h-28 w-48 overflow-hidden">
                  {/* Gauge Arc Background */}
                  <div className="absolute top-0 left-0 right-0 bottom-0 rounded-t-full border-8 border-gray-100"></div>
                  {/* Gauge Color fill depending on score (green/yellow/red) */}
                  <div 
                    className={`absolute top-0 left-0 right-0 bottom-0 rounded-t-full border-8 transition-all duration-500`}
                    style={{
                      borderColor: result.risk_score > 60 ? '#B91C1C' : result.risk_score > result.decision_threshold * 100 ? '#D97706' : '#15803D',
                      clipPath: `polygon(0 100%, 100% 100%, 100% 0, 0 0)` // simple mask mapping
                    }}
                  ></div>
                  <div className="absolute bottom-0 flex flex-col items-center text-center">
                    <span className="text-3xl font-extrabold text-gray-900">{result.risk_score}</span>
                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Risk Score / 100</span>
                  </div>
                </div>
                <p className="text-2xs text-gray-400 mt-2">
                  Operating Threshold: {Math.round(result.decision_threshold * 100)} (Approved if score &lt; threshold)
                </p>
              </div>

              {/* SHAP Factors Horizontal Bar Chart */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Top Contributing Model Factors
                </h3>
                <div className="space-y-3">
                  {result.top_factors.slice(0, 3).map((factor) => {
                    const value = factor.shap_value;
                    const valPercent = Math.abs(value) * 100;
                    const isPositive = value > 0;
                    
                    return (
                      <div key={factor.feature} className="text-xs">
                        <div className="flex justify-between text-gray-600 mb-1">
                          <span className="font-medium">{factor.label}</span>
                          <span className={isPositive ? 'text-red-700 font-semibold' : 'text-green-700 font-semibold'}>
                            {isPositive ? '+' : '-'}{valPercent.toFixed(1)}%
                          </span>
                        </div>
                        {/* Bar Visualizer */}
                        <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${isPositive ? 'bg-red-600' : 'bg-green-600'}`}
                            style={{ width: `${Math.min(valPercent * 3, 100)}%` }} // Boost size slightly for display visibility
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Underwriting Narrative */}
              <div className="border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded border border-gray-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900 mb-2">
                  AI Underwriting Analyst Summary
                </h3>
                <p className="text-xs text-gray-700 leading-relaxed font-serif italic">
                  "{result.underwriting_summary}"
                </p>
              </div>

              <div className="text-2xs text-gray-400 text-center">
                Model version: {result.model_version} • Diagnostics evaluated using calibrated logistic coefficients.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
