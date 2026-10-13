import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Reference, getReference, submitApplication } from '../../services/backendApi';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import { navigate, setNavigationGuard } from '../../lib/router';
import { Card, ConfirmDialog, ErrorState, Field, InlineAlert, LoadingState, PageHeader, useAsync, useToast } from '../../ui';

type Form = {
  applicantAge: string; gender: string; dependents: string; address: string; employment: string;
  monthlyIncome: string; existingEmis: string; propertyOwnership: string; cibilScore: string;
  loanType: string; purpose: string; loanAmount: string; tenureMonths: string; interestRate: string;
};
const EMPTY: Form = {
  applicantAge: '', gender: '', dependents: '0', address: '', employment: '', monthlyIncome: '', existingEmis: '0',
  propertyOwnership: '', cibilScore: '', loanType: '', purpose: '', loanAmount: '', tenureMonths: '', interestRate: '',
};
const STEPS = ['Personal Information', 'Employment', 'Financial Information', 'Loan Information', 'Review & Submit'];
const STEP_FIELDS: (keyof Form)[][] = [
  ['applicantAge', 'gender', 'dependents', 'address'],
  ['employment'],
  ['monthlyIncome', 'existingEmis', 'propertyOwnership', 'cibilScore'],
  ['loanType', 'purpose', 'loanAmount', 'tenureMonths', 'interestRate'],
  [],
];

const isInt = (value: string) => /^\d+$/.test(value.trim());
const isNum = (value: string) => value.trim() !== '' && !Number.isNaN(Number(value)) && Number.isFinite(Number(value));

function validateField(key: keyof Form, form: Form): string {
  const value = form[key].trim();
  switch (key) {
    case 'applicantAge':
      if (!value) return 'Enter your age.';
      if (!isInt(value)) return 'Enter age in whole years.';
      if (Number(value) < 21 || Number(value) > 65) return 'Applicants must be between 21 and 65 years old.';
      return '';
    case 'gender': return value ? '' : 'Select your gender.';
    case 'dependents':
      if (!isInt(value)) return 'Enter the number of dependents (0 or more).';
      if (Number(value) > 10) return 'Enter 10 or fewer dependents.';
      return '';
    case 'address':
      if (value.length < 10) return 'Enter your full residential address (at least 10 characters).';
      return '';
    case 'employment': return value ? '' : 'Select your employment status.';
    case 'monthlyIncome':
      if (!isNum(value)) return 'Enter your monthly income.';
      if (Number(value) <= 0) return 'Monthly income must be greater than 0.';
      return '';
    case 'existingEmis':
      if (!isNum(value)) return 'Enter your existing monthly EMIs (0 if none).';
      if (Number(value) < 0) return 'EMIs cannot be negative.';
      return '';
    case 'propertyOwnership': return value ? '' : 'Select your property ownership status.';
    case 'cibilScore':
      if (!value) return '';
      if (!isInt(value) || Number(value) < 300 || Number(value) > 900) return 'CIBIL score must be a whole number between 300 and 900.';
      return '';
    case 'loanType': return value ? '' : 'Select a loan type.';
    case 'purpose': return value ? '' : 'Select the purpose of the loan.';
    case 'loanAmount':
      if (!isNum(value)) return 'Enter the loan amount.';
      if (Number(value) < 10000) return 'Minimum loan amount is ₹10,000.';
      if (Number(value) > 50000000) return 'Maximum loan amount is ₹5,00,00,000.';
      return '';
    case 'tenureMonths': return value ? '' : 'Select a tenure.';
    case 'interestRate':
      if (!isNum(value)) return 'Enter the interest rate you were quoted.';
      if (Number(value) < 1 || Number(value) > 30) return 'Interest rate must be between 1% and 30%.';
      return '';
  }
  return '';
}

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ApplyPage() {
  const reference = useAsync(() => getReference(), []);
  return (
    <>
      <PageHeader title="Apply for a loan" description="Complete each section. You can review everything before you submit." />
      {reference.error ? (
        <Card><ErrorState title="Unable to load the application form" message={reference.error} onRetry={reference.reload} /></Card>
      ) : !reference.data ? (
        <Card><LoadingState label="Loading application form…" /></Card>
      ) : (
        <ApplicationForm reference={reference.data} />
      )}
    </>
  );
}

function ApplicationForm({ reference }: { reference: Reference }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState<(() => void) | null>(null);
  const idempotencyKey = useRef(newKey());
  const submitted = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const dirty = useMemo(() => (Object.keys(EMPTY) as (keyof Form)[]).some((key) => form[key] !== EMPTY[key]), [form]);

  // Warn before leaving with unsaved changes (in-app navigation and browser refresh/close).
  useEffect(() => {
    if (!dirty) {
      setNavigationGuard(null);
      return;
    }
    setNavigationGuard((proceed) => {
      if (submitted.current) return true;
      setLeaveRequest(() => proceed);
      return false;
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submitted.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  useEffect(() => () => setNavigationGuard(null), []);
  useEffect(() => headingRef.current?.focus(), [step]);

  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };
  const blur = (key: keyof Form) => () => setTouched((current) => ({ ...current, [key]: true }));
  const errorFor = (key: keyof Form) => (touched[key] ? validateField(key, form) : '');

  const next = () => {
    const fields = STEP_FIELDS[step];
    setTouched((current) => ({ ...current, ...Object.fromEntries(fields.map((key) => [key, true])) }));
    if (fields.some((key) => validateField(key, form))) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const firstInvalidStep = () => STEP_FIELDS.findIndex((fields) => fields.some((key) => validateField(key, form)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || submitted.current) return;
    if (step < STEPS.length - 1) {
      // Enter key on an earlier step moves forward instead of submitting.
      next();
      return;
    }
    const invalid = firstInvalidStep();
    if (invalid !== -1) {
      setTouched(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, true])));
      setStep(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await submitApplication({
        applicantAge: Number(form.applicantAge), gender: form.gender, dependents: Number(form.dependents), address: form.address.trim(),
        employment: form.employment, monthlyIncome: Number(form.monthlyIncome), existingEmis: Number(form.existingEmis),
        propertyOwnership: form.propertyOwnership, cibilScore: form.cibilScore.trim() ? Number(form.cibilScore) : null,
        loanType: form.loanType, purpose: form.purpose, loanAmount: Number(form.loanAmount), tenureMonths: Number(form.tenureMonths),
        interestRate: Number(form.interestRate), idempotencyKey: idempotencyKey.current,
      });
      submitted.current = true;
      setNavigationGuard(null);
      toast('success', `Application ${result.applicationId} submitted.`);
      navigate(`/customer/applications/${encodeURIComponent(result.applicationId)}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your application could not be submitted. Please try again.');
      setBusy(false);
    }
  };

  const dti = isNum(form.monthlyIncome) && Number(form.monthlyIncome) > 0 && isNum(form.existingEmis) ? (Number(form.existingEmis) / Number(form.monthlyIncome)) * 100 : null;

  const select = (key: keyof Form, label: string, options: (string | number)[], required = true, format?: (value: string | number) => string) => (
    <Field label={label} required={required} error={errorFor(key)} htmlFor={`ap-${key}`}>
      <select id={`ap-${key}`} value={form[key]} onChange={set(key)} onBlur={blur(key)} aria-invalid={Boolean(errorFor(key))}>
        <option value="">Select…</option>
        {options.map((option) => <option key={option} value={option}>{format ? format(option) : option}</option>)}
      </select>
    </Field>
  );
  const input = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string, required = true) => (
    <Field label={label} required={required} error={errorFor(key)} hint={hint} htmlFor={`ap-${key}`}>
      <input id={`ap-${key}`} value={form[key]} onChange={set(key)} onBlur={blur(key)} aria-invalid={Boolean(errorFor(key))} {...props} />
    </Field>
  );

  const review: { title: string; step: number; rows: [string, string][] }[] = [
    { title: 'Personal Information', step: 0, rows: [['Name', user?.name ?? ''], ['Age', form.applicantAge], ['Gender', form.gender], ['Dependents', form.dependents], ['Address', form.address]] },
    { title: 'Employment', step: 1, rows: [['Employment status', form.employment]] },
    { title: 'Financial Information', step: 2, rows: [['Monthly income', money(Number(form.monthlyIncome))], ['Existing EMIs', money(Number(form.existingEmis))], ['Debt-to-income ratio', dti === null ? '—' : `${dti.toFixed(2)}%`], ['Property ownership', form.propertyOwnership], ['CIBIL score', form.cibilScore || 'Not provided']] },
    { title: 'Loan Information', step: 3, rows: [['Loan type', form.loanType], ['Purpose', form.purpose], ['Amount', money(Number(form.loanAmount))], ['Tenure', form.tenureMonths ? `${form.tenureMonths} months` : ''], ['Interest rate', form.interestRate ? `${form.interestRate}% p.a.` : '']] },
  ];

  return (
    <Card>
      <ol className="stepper" aria-label="Application progress">
        {STEPS.map((label, index) => (
          <li key={label} className={index < step ? 'done' : index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 18, marginTop: 22 }}>
        <h2 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>{STEPS[step]}</h2>

        {step === 0 && (
          <div className="form-grid">
            <Field label="Full name" hint="From your account.">
              <input value={user?.name ?? ''} readOnly aria-readonly="true" />
            </Field>
            {input('applicantAge', 'Age (years)', { type: 'number', inputMode: 'numeric', min: 21, max: 65 })}
            {select('gender', 'Gender', reference.genders)}
            {input('dependents', 'Number of dependents', { type: 'number', inputMode: 'numeric', min: 0, max: 10 })}
            <div className="span-2">
              <Field label="Residential address" required error={errorFor('address')} htmlFor="ap-address">
                <textarea id="ap-address" value={form.address} onChange={set('address')} onBlur={blur('address')} maxLength={300} aria-invalid={Boolean(errorFor('address'))} />
              </Field>
            </div>
          </div>
        )}
        {step === 1 && <div className="form-grid">{select('employment', 'Employment status', reference.employment)}</div>}
        {step === 2 && (
          <div className="form-grid">
            {input('monthlyIncome', 'Monthly income (₹)', { type: 'number', inputMode: 'decimal', min: 0 })}
            {input('existingEmis', 'Existing EMIs per month (₹)', { type: 'number', inputMode: 'decimal', min: 0 }, 'Total of all current loan instalments. Enter 0 if none.')}
            {select('propertyOwnership', 'Property ownership', reference.propertyOwnership)}
            {input('cibilScore', 'CIBIL score (optional)', { type: 'number', inputMode: 'numeric', min: 300, max: 900 }, 'If you know it. Between 300 and 900.', false)}
            <Field label="Debt-to-income ratio" hint="Calculated automatically.">
              <input value={dti === null ? '—' : `${dti.toFixed(2)}%`} readOnly aria-readonly="true" />
            </Field>
          </div>
        )}
        {step === 3 && (
          <div className="form-grid">
            {select('loanType', 'Loan type', reference.loanTypes)}
            {select('purpose', 'Purpose of loan', reference.purposes)}
            {input('loanAmount', 'Loan amount (₹)', { type: 'number', inputMode: 'decimal', min: 10000 })}
            {select('tenureMonths', 'Tenure', reference.tenures, true, (value) => `${value} months`)}
            {input('interestRate', 'Quoted interest rate (% p.a.)', { type: 'number', inputMode: 'decimal', step: '0.01', min: 1, max: 30 }, 'The rate quoted to you for this loan.')}
          </div>
        )}
        {step === 4 && (
          <div>
            {review.map((section) => (
              <div className="review-section" key={section.title}>
                <header>
                  <h3>{section.title}</h3>
                  <button type="button" className="link-btn" onClick={() => setStep(section.step)}>Edit</button>
                </header>
                <dl className="dl">
                  {section.rows.map(([label, value]) => <div key={label} className={label === 'Address' ? 'span-2' : ''}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
                </dl>
              </div>
            ))}
            <p className="muted small" style={{ marginTop: 12 }}>By submitting, you confirm the information above is accurate. You can track the status under My Applications.</p>
          </div>
        )}

        {error && <InlineAlert>{error}</InlineAlert>}

        <div className="form-actions">
          <div>
            {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep((current) => current - 1)} disabled={busy}><ArrowLeft size={15} /> Back</button>}
          </div>
          <div>
            {step < STEPS.length - 1 ? (
              // Distinct keys stop React reusing this element as the submit button, which would
              // otherwise let the same click that reaches the last step also submit the form.
              <button key="continue" type="button" className="btn btn-primary" onClick={next}>Continue <ArrowRight size={15} /></button>
            ) : (
              <button key="submit" type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            )}
          </div>
        </div>
      </form>
      {leaveRequest && (
        <ConfirmDialog
          title="Leave without submitting?"
          message={<p>You have unsaved changes in your loan application. If you leave now, the information you entered will be lost.</p>}
          confirmLabel="Leave page"
          tone="danger"
          onCancel={() => setLeaveRequest(null)}
          onConfirm={() => {
            const proceed = leaveRequest;
            setLeaveRequest(null);
            proceed();
          }}
        />
      )}
    </Card>
  );
}
