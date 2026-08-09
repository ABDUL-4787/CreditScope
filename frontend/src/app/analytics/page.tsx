'use client';

import { useState, useEffect } from 'react';
import { api, AnalyticsResponse } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, AlertTriangle, RefreshCw, Scale, BookOpen, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAnalytics();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analytics segments data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format segment charts data
  const segmentChartData = data
    ? data.segments.map(s => ({
        name: s.employment_type,
        'Risk Score': Math.round(s.avg_risk),
        'Approval Rate (%)': Math.round(s.approval_rate * 100)
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-gray-200 pb-5 mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl tracking-tight">
            SQL Analytics & Fairness Auditing
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time aggregates calculated using SQL queries over production logs alongside demographic bias audits.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-950 p-4 rounded-lg border border-red-200 text-xs">
          Error loading analytics dashboard: {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-gray-200 rounded-lg min-h-[300px]">
          <RefreshCw className="h-8 w-8 text-blue-900 animate-spin mb-4" />
          <h3 className="font-bold text-gray-900 text-sm">Running Analytical Aggregations...</h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1">
            Executing SQL GROUP BY queries and evaluating fairness ratios on the database logs.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Top segment charts (SQL results) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Segment chart 1: Approval rates */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col h-[320px]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Approval Rate by Segment (SQL Grouping)
              </h2>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Approval Rate (%)" fill="#0F766E" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segment chart 2: Average Risk scores */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col h-[320px]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Average Risk Score by Segment (SQL Grouping)
              </h2>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Risk Score" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Model Champion comparison section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Offline Champion Model Comparison (Validated Feature Pipeline)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Model Candidate</th>
                    <th className="px-4 py-3 text-center">ROC-AUC</th>
                    <th className="px-4 py-3 text-center">Gini Coefficient</th>
                    <th className="px-4 py-3 text-center">Brier Score</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-gray-700">
                  {data.model_metadata.model_comparison.map((row) => (
                    <tr 
                      key={row.model} 
                      className={row.model === data.model_metadata.algorithm ? 'bg-blue-50/50 font-medium' : ''}
                    >
                      <td className="px-4 py-3 text-gray-900 font-semibold">{row.model}</td>
                      <td className="px-4 py-3 text-center">{row.roc_auc.toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">{row.gini.toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">{row.brier.toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.model === data.model_metadata.algorithm ? (
                          <span className="inline-block rounded bg-blue-150 px-2 py-0.5 text-2xs font-bold text-blue-900 border border-blue-200">
                            CHAMPION
                          </span>
                        ) : (
                          <span className="text-gray-400">Challenger</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fairness Monitoring Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Scale className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-bold text-gray-900">
                Fairness Diagnostics Audit
              </h2>
            </div>

            {/* Warning Banner */}
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100 flex gap-3 items-start text-xs text-yellow-900 leading-normal">
              <AlertCircle className="h-5 w-5 text-yellow-800 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Regulatory Auditing Notice</p>
                <p className="mt-1">
                  Fairness metrics are included strictly for educational and portfolio demonstration purposes and do not establish regulatory suitability (such as ECOA or Regulation B compliance) for real-world credit lending decisions.
                </p>
              </div>
            </div>

            {data.fairness.status === 'SUCCESS' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                {/* Metrics Table */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Group Outcomes Disparity
                  </h3>
                  <div className="divide-y divide-gray-200 border-y border-gray-200">
                    {/* Group A */}
                    <div className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{data.fairness.metrics.group_a.name}</span>
                        <div className="text-2xs text-gray-500 mt-0.5">Sample Size: {data.fairness.metrics.group_a.size}</div>
                      </div>
                      <div className="text-right">
                        <div>Approval: <strong>{(data.fairness.metrics.group_a.approval_rate * 100).toFixed(1)}%</strong></div>
                        <div className="text-2xs text-gray-500 mt-0.5">FNR: {(data.fairness.metrics.group_a.fnr * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    {/* Group B */}
                    <div className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{data.fairness.metrics.group_b.name}</span>
                        <div className="text-2xs text-gray-500 mt-0.5">Sample Size: {data.fairness.metrics.group_b.size}</div>
                      </div>
                      <div className="text-right">
                        <div>Approval: <strong>{(data.fairness.metrics.group_b.approval_rate * 100).toFixed(1)}%</strong></div>
                        <div className="text-2xs text-gray-500 mt-0.5">FNR: {(data.fairness.metrics.group_b.fnr * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Verdicts */}
                <div className="space-y-4 bg-gray-50 p-4 rounded border border-gray-150">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Regulatory Audit Verdicts
                  </h3>
                  <div className="space-y-3 text-xs text-gray-700">
                    <div className="flex justify-between items-center">
                      <span>Demographic Parity Ratio (Impact Ratio):</span>
                      <strong className="text-sm text-gray-900">{data.fairness.metrics.disparity_ratio.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Equal Opportunity Difference (FNR Delta):</span>
                      <strong className="text-sm text-gray-900">{data.fairness.metrics.equal_opportunity_difference.toFixed(2)}</strong>
                    </div>

                    <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                      <span>Four-Fifths Rule Status:</span>
                      {data.fairness.metrics.four_fifths_rule_passed ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 font-bold uppercase tracking-wide">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Passed (Ratio &gt; 0.8)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-yellow-50 border border-yellow-250 text-yellow-700 px-2 py-0.5 font-bold uppercase tracking-wide">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Disparate Impact Warning
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-gray-500">
                {data.fairness.message || "Insufficient group representations to compute bias statistics."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
