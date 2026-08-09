import { Info, Scale, ShieldAlert, BookOpen } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Page Title */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          System Architecture & Model Card
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Technical specifications, underwriting bias correction methodology, calibration performance, and diagnostic monitoring explanations.
        </p>
      </div>

      {/* 1. Model Card */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <BookOpen className="h-5 w-5 text-blue-900" />
          <h2 className="text-lg font-bold text-gray-900">
            Model Card — CreditScope v1.0.0
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          <div>
            <h3 className="font-semibold text-gray-500">Objective</h3>
            <p className="mt-1 text-gray-900">Predict the probability of loan default within a 12-month window.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Dataset</h3>
            <p className="mt-1 text-gray-900">Programmatically generated synthetic dataset (6,000 observations) replicating representative consumer balance sheet characteristics.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Champion Algorithm</h3>
            <p className="mt-1 text-gray-900">Calibrated Logistic Regression / XGBoost Classifier trained on bias-corrected augmented feature sets.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Selection Bias</h3>
            <p className="mt-1 text-gray-900">Underwriting selection threshold simulated at a ~60% historical approval rate, creating significant selection bias.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Reject Inference</h3>
            <p className="mt-1 text-gray-900">Fuzzy Augmentation via fractional sample weighting of predicted non-observables inside the training loop.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Explainability</h3>
            <p className="mt-1 text-gray-900">Native TreeSHAP feature contributions computed efficiently using XGBoost Booster margin projections.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Calibration</h3>
            <p className="mt-1 text-gray-900">Isotonic regression fitted on validation splits to align default probabilities with observed default frequencies.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-500">Monitoring</h3>
            <p className="mt-1 text-gray-900">Population Stability Index (PSI) tracking live vs. training input distribution drift.</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-3xs text-yellow-800 flex gap-2 items-center">
          <ShieldAlert className="h-4 w-4 text-yellow-800 flex-shrink-0" />
          <span>
            <strong>Limitations:</strong> Created strictly as a portfolio simulation. Not suitable for real underwriting, credit allocations, or regulatory credit scoring.
          </span>
        </div>
      </section>

      {/* 2. Deep Dive: Reject Inference */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Reject Inference & Underwriting Selection Bias</h2>
        <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
          <p>
            When credit scoring models are trained, they use historical loan files containing repayments and defaults. However, this dataset is subject to <strong>selection bias</strong>: we only observe repayment outcomes for applicants who were <em>approved</em> by the historical underwriting policy. We have no outcome labels for the rejected applicants.
          </p>
          <p>
            Training a risk model only on approved cases can lead to severe bias, as the model misses default signals from rejected applicants. This is known as the **selection bias problem** in credit risk.
          </p>
          <div className="bg-gray-50 p-4 rounded border border-gray-150 font-mono text-2xs text-gray-800">
            <p className="font-bold mb-2">Fuzzy Augmentation Algorithm:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Train a baseline "borrower model" on approved cases where default labels are observed.</li>
              <li>Predict the default probability P(default) for the rejected applications.</li>
              <li>Augment the training dataset by adding the rejected cohort twice: once as a default (default=1) with weight P(default), and once as a non-default (default=0) with weight 1 - P(default).</li>
              <li>Train the final risk champion model on this augmented, weighted dataset.</li>
            </ol>
          </div>
          <p>
            Fuzzy Augmentation makes the assumption that the probability model trained on approved applicants can generalize to rejected applicants (conditional on the observed features). While not a perfect solution in real lending, it is a robust standard methodology to expand the training footprint and reduce bias.
          </p>
        </div>
      </section>

      {/* 3. Deep Dive: Calibration & PSI */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Probability Calibration & PSI Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-600 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm">Why Calibrate Credit Scores?</h3>
            <p>
              Many ML algorithms (including XGBoost or Random Forests) optimize for rank-ordering (AUC-ROC) rather than accurate absolute probabilities. In lending, rank-ordering is insufficient.
            </p>
            <p>
              To price credit risk or establish loss reserves, we need the predicted default probability to represent the **true empirical frequency of default**. We apply **Isotonic Regression** on held-out validation sets. This corrects scores (e.g. if the raw model outputs 40% risk, but only 20% actually default, calibration maps this mapping correctly) and reduces Brier Score loss.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm">Drift Detection via PSI</h3>
            <p>
              Credit scoring models suffer from macro drift: economic changes, underwriting policy adjustments, or marketing changes can shift applicant profiles (covariate shift) over time.
            </p>
            <p>
              We monitor this shift using the **Population Stability Index (PSI)**. For each numeric input, we split the training distribution into decile bins and count the percentage of live requests falling into those same bins:
            </p>
            <div className="bg-gray-50 p-2 rounded border border-gray-150 font-mono text-3xs text-gray-800 text-center">
              PSI = ∑ (Actual% - Expected%) × ln(Actual% / Expected%)
            </div>
            <p>
              A PSI under 0.10 indicates stability. A PSI between 0.10 and 0.25 indicates a moderate shift, while a PSI above 0.25 indicates significant data drift, alerting model maintainers to schedule re-training.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
