import { FormEvent, useState } from 'react';
import { ModelResponse, Prediction, Reference, getModels, getReference, postPrediction } from '../../services/backendApi';
import { percent, pretty, modelLabel } from '../../lib/format';
import { Card, EmptyState, ErrorState, Field, InlineAlert, LoadingState, PageHeader, RiskBadge, useAsync } from '../../ui';

type FormState = Record<string, string>;
const initial: FormState = {
  ApplicantAge: '30', Gender: 'Male', EmploymentStatus: 'Salaried', NumberDependents: '0', LoanType: 'Personal Loan', PurposeOfLoan: 'Education',
  LoanAmountRequested: '500000', LoanTenureMonths: '36', InterestRateOffered: '12', MonthlyIncome: '50000', ExistingEMIs: '10000', PropertyOwnershipStatus: 'Rented', model_name: '',
};
const NUMERIC: { key: string; label: string; min: number; max?: number; hint?: string }[] = [
  { key: 'ApplicantAge', label: 'Applicant age', min: 18, max: 100 },
  { key: 'NumberDependents', label: 'Dependents', min: 0, max: 10 },
  { key: 'MonthlyIncome', label: 'Monthly income (₹)', min: 1 },
  { key: 'ExistingEMIs', label: 'Existing EMIs per month (₹)', min: 0 },
  { key: 'LoanAmountRequested', label: 'Loan amount (₹)', min: 1 },
  { key: 'InterestRateOffered', label: 'Interest rate (% p.a.)', min: 0, max: 40 },
];

export function FraudCheckerPage() {
  const setup = useAsync(() => Promise.all([getReference(), getModels()]), []);
  return (
    <>
      <PageHeader title="Fraud Checker" description="Score a single application with a saved model pipeline. Nothing is stored — use this for what-if checks." />
      {setup.error ? (
        <Card><ErrorState title="Unable to load the fraud checker" message={setup.error} onRetry={setup.reload} /></Card>
      ) : !setup.data ? (
        <Card><LoadingState /></Card>
      ) : (
        <Checker reference={setup.data[0]} models={setup.data[1]} />
      )}
    </>
  );
}

function Checker({ reference, models }: { reference: Reference; models: ModelResponse }) {
  const defaultModel = models.selectedModel && models.availableModels.includes(models.selectedModel) ? models.selectedModel : models.availableModels[0] ?? '';
  const [form, setForm] = useState<FormState>({ ...initial, model_name: defaultModel });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
  };
  const dti = Number(form.MonthlyIncome) > 0 ? (Number(form.ExistingEMIs) / Number(form.MonthlyIncome)) * 100 : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    for (const field of NUMERIC) {
      const raw = form[field.key];
      const value = Number(raw);
      if (raw.trim() === '' || Number.isNaN(value)) next[field.key] = 'Enter a number.';
      else if (value < field.min) next[field.key] = `Must be at least ${field.min}.`;
      else if (field.max !== undefined && value > field.max) next[field.key] = `Must be at most ${field.max}.`;
    }
    if (!form.model_name) next.model_name = 'No trained model is available.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, string | number> = { ...form, LoanTenureMonths: Number(form.LoanTenureMonths) };
      for (const field of NUMERIC) payload[field.key] = Number(form[field.key]);
      setResult(await postPrediction(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed.');
    } finally {
      setBusy(false);
    }
  };

  const choice = (key: string, label: string, options: (string | number)[], format?: (value: string | number) => string) => (
    <Field label={label} required htmlFor={`fc-${key}`}>
      <select id={`fc-${key}`} value={form[key]} onChange={(event) => set(key, event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{format ? format(option) : option}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="detail-grid">
      <Card title="Application details">
        <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
          <div className="form-grid">
            {NUMERIC.map((field) => (
              <Field key={field.key} label={field.label} required error={errors[field.key]} htmlFor={`fc-${field.key}`}>
                <input id={`fc-${field.key}`} type="number" inputMode="decimal" value={form[field.key]} onChange={(event) => set(field.key, event.target.value)} />
              </Field>
            ))}
            {choice('Gender', 'Gender', reference.genders)}
            {choice('EmploymentStatus', 'Employment', reference.employment)}
            {choice('LoanType', 'Loan type', reference.loanTypes)}
            {choice('PurposeOfLoan', 'Purpose', reference.purposes)}
            {choice('LoanTenureMonths', 'Tenure', reference.tenures, (value) => `${value} months`)}
            {choice('PropertyOwnershipStatus', 'Property ownership', reference.propertyOwnership)}
            <Field label="Model" required error={errors.model_name} htmlFor="fc-model">
              <select id="fc-model" value={form.model_name} onChange={(event) => set('model_name', event.target.value)}>
                {models.availableModels.map((name) => <option key={name} value={name}>{modelLabel(name)}{name === models.selectedModel ? ' (selected)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Debt-to-income ratio" hint="Calculated from existing EMIs ÷ monthly income.">
              <input value={dti === null ? '—' : `${dti.toFixed(2)}%`} readOnly aria-readonly="true" />
            </Field>
          </div>
          {error && <InlineAlert>{error}</InlineAlert>}
          <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Scoring…' : 'Run fraud check'}</button></div>
        </form>
      </Card>
      <Card title="Result">
        {result ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <span className="muted small">Fraud probability</span>
              <div className="prob"><strong>{percent(result.fraudProbability, 2)}</strong><RiskBadge level={result.riskLevel} /></div>
              <div className={`meter ${result.riskLevel.toLowerCase()}`}><i style={{ width: `${Math.max(1, result.fraudProbability * 100)}%` }} /></div>
            </div>
            <dl className="dl" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><dt>Classification</dt><dd>{result.classification}</dd></div>
              <div><dt>Model</dt><dd>{modelLabel(result.model)}</dd></div>
            </dl>
            <InlineAlert tone="info">Risk explanation is currently unavailable. The model's global feature importances are shown instead.</InlineAlert>
            <div className="factor-list">
              {result.featureImportance.map((factor) => (
                <div className="factor" key={factor.feature}>
                  <span>{pretty(factor.feature)}</span>
                  <div className="bar"><i style={{ width: `${Math.max(3, (factor.importance / Math.max(...result.featureImportance.map((f) => f.importance), 0.0001)) * 100)}%` }} /></div>
                  <b>{factor.importance.toFixed(3)}</b>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No result yet" message="Fill in the application details and run the fraud check." />
        )}
      </Card>
    </div>
  );
}
