'use client';

import { useState, useEffect } from 'react';
import { api, DriftResponse } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ShieldCheck, AlertTriangle, RefreshCw, Zap, AlertCircle } from 'lucide-react';

export default function DriftPage() {
  const [driftData, setDriftData] = useState<DriftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrift = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDrift();
      setDriftData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve population stability index.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  const handleInjectDrift = async (severity: 'moderate' | 'significant') => {
    setInjecting(true);
    setError(null);
    try {
      await api.injectDrift(severity);
      // Wait 1.5s for data writing and then re-fetch
      setTimeout(async () => {
        await fetchDrift();
        setInjecting(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to inject drifted simulation data.');
      setInjecting(false);
    }
  };

  // Convert Record<string, FeatureDriftItem> to chart array format
  const chartData = driftData && driftData.status === 'SUCCESS'
    ? Object.keys(driftData.feature_psi).map(key => ({
        name: key.replace(/_/g, ' '),
        PSI: parseFloat(driftData.feature_psi[key].psi.toFixed(3)),
        severity: driftData.feature_psi[key].severity
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-gray-200 pb-5 mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl tracking-tight">
            Production-style Drift Monitoring
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time tracking of Population Stability Index (PSI) to detect feature distribution shifts between live scoring traffic and training baselines.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
          <button
            type="button"
            onClick={fetchDrift}
            disabled={loading || injecting}
            className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Alert Warning Box explaining simulated traffic */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3 items-start text-xs text-blue-900 leading-normal">
        <AlertCircle className="h-5 w-5 text-blue-800 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">System Positioning & Limitation Note</p>
          <p className="mt-1">
            This dashboard displays <strong>production-style drift monitoring using simulated live traffic</strong>. In an actual enterprise setup, prediction requests are logged via streaming pipelines (e.g. Kafka to BigQuery) and drift metrics are calculated hourly or daily. For demonstration purposes, this page logs to a local SQLite window and provides a button to instantly inject drifted data.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-950 p-4 rounded-lg border border-red-200 text-xs">
          Error loading monitoring metrics: {error}
        </div>
      )}

      {driftData && (
        <div className="space-y-8">
          {/* Status Banner Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex gap-4 items-center">
              {driftData.overall_status === 'stable' ? (
                <div className="h-12 w-12 rounded bg-green-50 text-green-700 flex items-center justify-center border border-green-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              ) : (
                <div className={`h-12 w-12 rounded flex items-center justify-center border ${
                  driftData.overall_status === 'moderate' 
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Pipeline Status</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xl font-bold uppercase ${
                    driftData.overall_status === 'stable' 
                      ? 'text-green-700' 
                      : driftData.overall_status === 'moderate' 
                      ? 'text-yellow-700' 
                      : 'text-red-700'
                  }`}>
                    {driftData.overall_status === 'stable' 
                      ? 'Stable Traffic' 
                      : driftData.overall_status === 'moderate' 
                      ? 'Moderate Drift Shift' 
                      : 'Significant Drift Detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drift Simulation Injectors */}
            <div className="border-t border-gray-100 md:border-t-0 pt-4 md:pt-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleInjectDrift('moderate')}
                disabled={loading || injecting}
                className="inline-flex items-center justify-center gap-1.5 rounded bg-white border border-yellow-400 px-4 py-2.5 text-xs font-bold text-yellow-800 shadow-sm hover:bg-yellow-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Simulate Mild Drift
              </button>
              <button
                onClick={() => handleInjectDrift('significant')}
                disabled={loading || injecting}
                className="inline-flex items-center justify-center gap-1.5 rounded bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:bg-gray-300 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Simulate Significant Drift
              </button>
            </div>
          </div>

          {/* Recharts Chart Panel */}
          {driftData.status === 'SUCCESS' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Chart (Left) */}
              <div className="lg:col-span-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col h-[400px]">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
                  Population Stability Index (PSI) by Feature
                </h2>
                <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: '11px', borderRadius: '4px' }}
                        labelFormatter={(value) => `Feature: ${value}`}
                      />
                      {/* Standard Threshold reference lines */}
                      <ReferenceLine y={0.10} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'Moderate Shift (0.1)', position: 'right', fill: '#D97706', fontSize: 8 }} />
                      <ReferenceLine y={0.25} stroke="#B91C1C" strokeDasharray="3 3" label={{ value: 'Significant Drift (0.25)', position: 'right', fill: '#B91C1C', fontSize: 8 }} />
                      <Bar dataKey="PSI" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Details Table (Right) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Feature Stability Details
                </h2>
                <div className="overflow-y-auto flex-1 text-xs">
                  <div className="divide-y divide-gray-200">
                    {Object.keys(driftData.feature_psi).map((key) => {
                      const item = driftData.feature_psi[key];
                      return (
                        <div key={key} className="py-2.5 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-900 capitalize">{key.replace(/_/g, ' ')}</span>
                            <div className="text-2xs text-gray-400 mt-0.5">
                              Live mean: {item.mean_live.toFixed(2)} (vs {item.mean_baseline.toFixed(2)})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-800">{item.psi.toFixed(3)}</span>
                            <div className="mt-1">
                              {item.severity === 'stable' ? (
                                <span className="rounded bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 text-3xs uppercase font-bold">Stable</span>
                              ) : item.severity === 'moderate' ? (
                                <span className="rounded bg-yellow-50 border border-yellow-200 text-yellow-700 px-1.5 py-0.5 text-3xs uppercase font-bold">Moderate</span>
                              ) : (
                                <span className="rounded bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 text-3xs uppercase font-bold">Significant</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && !driftData && (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-gray-200 rounded-lg min-h-[300px]">
          <RefreshCw className="h-8 w-8 text-blue-900 animate-spin mb-4" />
          <h3 className="font-bold text-gray-900 text-sm font-sans">Calculating Population Stability Indices...</h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1">
            Analyzing SQLite logged history against the training baseline distributions.
          </p>
        </div>
      )}
    </div>
  );
}
