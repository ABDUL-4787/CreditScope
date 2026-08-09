import Link from 'next/link';
import { ArrowRight, ShieldCheck, Cpu, MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-50 border-b border-gray-100 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              AI-Powered Credit Risk Scoring for Modern Lending
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              A production-style machine learning system built to score applicant default risk, correct historical selection bias using reject inference, and serve explainable predictions with natural language underwriting summaries.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/demo"
                className="rounded bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 transition-colors flex items-center gap-2"
              >
                Try the Live Scoring Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/about" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-900 transition-colors">
                Read the Methodology <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow: How it works (3-Step Diagram) */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              End-to-End Decision Workflow
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              How CreditScope processes financial applications from input characteristics to calibrated recommendations.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24">
            <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-3 lg:gap-x-12 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg border border-gray-100 shadow-sm relative group hover:border-gray-300 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-900 text-white mb-6">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">1. Input characteristics</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Financial indicators such as income, existing debt levels, savings balances, prior default records, and unstructured notes are parsed and validated for target leakage.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg border border-gray-100 shadow-sm relative group hover:border-gray-300 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-900 text-white mb-6">
                  <Cpu className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">2. Calibrated ML Model</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  A calibrated champion model, corrected for historical selection bias via reject inference, generates a probability of default and scales it to a 0–100 risk score.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg border border-gray-100 shadow-sm relative group hover:border-gray-300 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-900 text-white mb-6">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">3. Explainable Decision</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  TreeSHAP contributions reveal the exact drivers behind the risk assessment, which are summarized by the LLM underwriting analyst into natural narrative statements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Highlights */}
      <section className="bg-gray-50 border-t border-gray-200 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                ML Engineering Highlights
              </h2>
            </div>
            <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <dt className="text-sm font-semibold leading-6 text-gray-600">Bias Correction</dt>
                <dd className="order-first text-xl font-bold tracking-tight text-blue-900">Reject Inference</dd>
                <dd className="mt-2 text-xs text-gray-500 leading-normal">
                  Corrects for underwriting selection bias (the fact that outcomes are only observed for historically approved applicants) using Fuzzy Augmentation.
                </dd>
              </div>
              <div className="flex flex-col bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <dt className="text-sm font-semibold leading-6 text-gray-600">Model Evaluation</dt>
                <dd className="order-first text-xl font-bold tracking-tight text-blue-900">Probability Calibration</dd>
                <dd className="mt-2 text-xs text-gray-500 leading-normal">
                  Ensures prediction probabilities match empirical default frequencies (calibrated via isotonic regression on validation subsets) for pricing accuracy.
                </dd>
              </div>
              <div className="flex flex-col bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <dt className="text-sm font-semibold leading-6 text-gray-600">Monitoring</dt>
                <dd className="order-first text-xl font-bold tracking-tight text-blue-900">Population Stability Index</dd>
                <dd className="mt-2 text-xs text-gray-500 leading-normal">
                  Calculates distribution shifts (PSI) per feature in production vs. training distributions, alerting for data and target drift.
                </dd>
              </div>
              <div className="flex flex-col bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <dt className="text-sm font-semibold leading-6 text-gray-600">Explainability</dt>
                <dd className="order-first text-xl font-bold tracking-tight text-blue-900">TreeSHAP Contributions</dd>
                <dd className="mt-2 text-xs text-gray-500 leading-normal">
                  Computes exact per-feature contributions to raw prediction margin using native XGBoost SHAP values, rejecting black-box decisions.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
