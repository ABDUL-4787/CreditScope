'use client';

import { useState, useRef } from 'react';
import { api, BatchPredictResponse, BatchPredictionItem } from '@/lib/api';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, ArrowUpDown, RefreshCw, XCircle } from 'lucide-react';

export default function BatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchPredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof BatchPredictionItem>('risk_score');
  const [sortAsc, setSortAsc] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.predictBatch(file);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'CSV processing failed. Check file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Only CSV files are supported.');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Sorting logic
  const handleSort = (field: keyof BatchPredictionItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedPredictions = result
    ? [...result.predictions].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (typeof valA === 'string') {
          return sortAsc 
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        } else {
          return sortAsc
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-gray-200 pb-5 mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl tracking-tight">
            Batch Credit Scoring
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload raw CSV spreadsheets containing applicant profiles to run model evaluations across multiple records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Upload Panel (Left) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Upload Applicant CSV
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className="border-2 border-dashed border-gray-300 hover:border-blue-900 cursor-pointer rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors bg-gray-50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
                {file ? (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-900" />
                      {file.name}
                    </span>
                    <span className="text-2xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Drag & drop your CSV file here
                    </span>
                    <span className="text-2xs text-gray-500 mt-1 block">
                      or click to browse local files
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-900 p-3 rounded text-xs border border-red-100 flex gap-2 items-start">
                  <XCircle className="h-4 w-4 text-red-700 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full rounded bg-blue-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing spreadsheet...
                  </>
                ) : (
                  'Run Batch Scoring'
                )}
              </button>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-700">Schema Template Requirements:</h4>
                <p className="text-2xs text-gray-500 leading-relaxed">
                  Spreadsheets must include: <code>income</code>, <code>loan_amount</code>, <code>employment_length</code>, <code>existing_debt</code>, <code>credit_history_length</code>, <code>prior_defaults</code>, <code>monthly_expenses</code>, <code>savings_balance</code>, <code>credit_utilization</code>, <code>transaction_activity</code>, <code>employment_type</code>.
                </p>
                <div className="bg-blue-50 border border-blue-100 p-2 rounded text-2xs text-blue-800 leading-normal">
                  <p>
                    <strong>💡 Demo CSV file ready:</strong> You can find a generated compatible test CSV in: <br />
                    <code>backend/data/sample_applicants.csv</code>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Results Panel (Right) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Summary Statistics (only visible when results are ready) */}
          {result && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">Applications</div>
                <div className="mt-1 text-xl font-extrabold text-gray-900">{result.total_applications}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">Approval Rate</div>
                <div className="mt-1 text-xl font-extrabold text-green-700">
                  {(result.approval_rate * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">Avg Risk Score</div>
                <div className="mt-1 text-xl font-extrabold text-gray-900">
                  {result.avg_risk_score.toFixed(0)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">High Risk Count</div>
                <div className="mt-1 text-xl font-extrabold text-red-700">{result.high_risk_count}</div>
              </div>
            </div>
          )}

          {/* Results Table Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="border-b border-gray-100 p-4 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Batch Applications Output</h2>
            </div>

            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-900 text-sm">No Batch Scored Yet</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1 leading-normal">
                  Drop a client roster CSV file in the left panel to execute credit evaluation pipelines on all rows.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <RefreshCw className="h-8 w-8 text-blue-900 animate-spin mb-4" />
                <h3 className="font-bold text-gray-900 text-sm">Evaluating Applications...</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1 leading-normal">
                  Reading database, running pipeline logic, preventing target leakage, and saving predictions.
                </p>
              </div>
            )}

            {result && (
              <div className="overflow-x-auto flex-1 max-h-[500px]">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort('applicant_id')}>
                        <span className="flex items-center gap-1">
                          Applicant ID
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </span>
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 text-center" onClick={() => handleSort('risk_score')}>
                        <span className="flex items-center justify-center gap-1">
                          Risk Score
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </span>
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 text-center" onClick={() => handleSort('default_probability')}>
                        <span className="flex items-center justify-center gap-1">
                          Probability
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </span>
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 text-center" onClick={() => handleSort('decision')}>
                        <span className="flex items-center justify-center gap-1">
                          Recommendation
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </span>
                      </th>
                      <th className="px-4 py-3">Top Risk Factor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-gray-700">
                    {sortedPredictions.map((row) => (
                      <tr key={row.applicant_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.applicant_id}</td>
                        <td className="px-4 py-3 text-center font-bold">{row.risk_score}</td>
                        <td className="px-4 py-3 text-center">{(row.default_probability * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {row.decision === 'APPROVE' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 font-bold text-green-700 border border-green-200">
                              <CheckCircle className="h-3 w-3" />
                              APPROVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 font-bold text-red-700 border border-red-200">
                              <AlertTriangle className="h-3 w-3" />
                              DECLINE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={row.top_factor}>{row.top_factor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
