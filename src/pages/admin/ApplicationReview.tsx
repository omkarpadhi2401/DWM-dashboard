import { useState } from 'react';
import { ArrowLeft, Check, RefreshCw, Send, X } from 'lucide-react';
import { Application, ApplicationDetail, ApiError, Reference, decideApplication, getApplication, getReference, rerunAnalysis } from '../../services/backendApi';
import { applicantLabel, formatDate, formatDateTime, money, percent, pretty, STATUS_LABEL, modelLabel, appDate } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useStats } from '../../lib/stats';
import { Card, Dialog, ErrorState, Field, InlineAlert, LoadingState, RiskBadge, StatusBadge, useAsync, useToast } from '../../ui';

type Action = 'approve' | 'reject' | 'review';

function Row({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'span-2' : ''}>
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function dotClass(type: string) {
  if (type === 'APPROVED') return 'approved';
  if (type === 'REJECTED') return 'rejected';
  if (type === 'SENT_FOR_REVIEW') return 'review';
  if (type === 'FRAUD_ANALYSIS_UNAVAILABLE') return 'muted-dot';
  return '';
}

export function ApplicationReview({ id }: { id: string }) {
  const detail = useAsync(() => getApplication(id), [id]);
  const [action, setAction] = useState<Action | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const { refresh: refreshStats } = useStats();
  const toast = useToast();

  const back = (
    <div className="breadcrumb">
      <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/admin/applications'))}>
        <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back
      </button>
      <span>/</span>
      <button type="button" onClick={() => navigate('/admin/applications')}>All Applications</button>
      <span>/</span>
      <span>{id}</span>
    </div>
  );

  if (detail.loading && !detail.data) return <>{back}<Card><LoadingState label="Loading application…" /></Card></>;
  if (detail.error || !detail.data) {
    return <>{back}<Card><ErrorState title="Unable to load application" message={detail.error || 'Unknown error'} onRetry={detail.reload} /></Card></>;
  }

  const { application: app, timeline, decisionHistory, explanation, allowedActions } = detail.data;

  const onDecided = (next: ApplicationDetail, message: string) => {
    detail.setData(next);
    setAction(null);
    refreshStats();
    toast('success', message);
  };

  const rerun = async () => {
    setRerunning(true);
    try {
      detail.setData(await rerunAnalysis(app.applicationId));
      toast('success', 'Fraud analysis completed.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Fraud analysis failed.');
    } finally {
      setRerunning(false);
    }
  };

  return (
    <>
      {back}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            Application {app.applicationId} <StatusBadge status={app.status} />
          </h1>
          <p className="muted">
            {applicantLabel(app.applicantName, app.customerId)} · {app.loanType} · {money(app.loanAmount)} · {app.source === 'portal' ? `Submitted ${formatDateTime(app.submittedAt)}` : `Historical record dated ${formatDate(app.applicationDate)}`}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={detail.reload} disabled={detail.loading}>
          <RefreshCw size={15} className={detail.loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Applicant information">
            <dl className="dl">
              <Row label="Applicant" value={app.applicantName ?? 'Not recorded in historical dataset'} />
              <Row label="Customer ID" value={app.customerId} />
              {app.applicantEmail && <Row label="Email" value={app.applicantEmail} />}
              <Row label="Age" value={app.age} />
              <Row label="Gender" value={app.gender} />
              <Row label="Dependents" value={app.dependents} />
              <Row label="Residential address" value={app.address} span />
            </dl>
          </Card>
          <Card title="Employment & financial information">
            <dl className="dl">
              <Row label="Employment status" value={app.employment} />
              <Row label="Monthly income" value={money(app.monthlyIncome)} />
              <Row label="Existing EMIs (monthly)" value={money(app.existingEmis)} />
              <Row label="Debt-to-income ratio" value={`${app.dti.toFixed(2)}%`} />
              <Row label="Property ownership" value={app.propertyOwnership} />
              <Row label="CIBIL score" value={app.cibilScore ?? (app.source === 'portal' ? 'Not provided by applicant' : 'Not available in historical dataset')} />
            </dl>
            {app.source === 'portal' && app.cibilScore !== null && <p className="muted small" style={{ marginTop: 10 }}>CIBIL score is self-declared by the applicant and has not been verified.</p>}
          </Card>
          <Card title="Loan information">
            <dl className="dl">
              <Row label="Loan type" value={app.loanType} />
              <Row label="Purpose" value={app.purpose} />
              <Row label="Amount requested" value={money(app.loanAmount)} />
              <Row label="Tenure" value={`${app.tenureMonths} months`} />
              <Row label="Interest rate" value={`${app.interestRate}% p.a.`} />
              <Row label="Application date" value={appDate(app)} />
            </dl>
          </Card>
          <Card title="Fraud analysis & risk assessment">
            <FraudAnalysis app={app} explanation={explanation} onRerun={rerun} rerunning={rerunning} />
          </Card>
          <Card title="Decision history" subtitle="Every officer action is recorded here and never overwritten.">
            {decisionHistory.length === 0 ? (
              <p className="muted">{app.source === 'portal' ? 'No officer actions yet.' : 'No officer actions are recorded in this system for historical dataset records.'}</p>
            ) : (
              <ol className="history">
                {decisionHistory.map((event) => (
                  <li key={event.id}>
                    <div className="history-head">
                      <strong>{event.label}</strong>
                      {event.fromStatus && <span className="muted small">{STATUS_LABEL[event.fromStatus as keyof typeof STATUS_LABEL]} → {STATUS_LABEL[event.toStatus as keyof typeof STATUS_LABEL]}</span>}
                    </div>
                    <div className="muted small">{formatDateTime(event.at)} · {event.actorName}{event.actorEmail ? ` (${event.actorEmail})` : ''}</div>
                    {event.reason && <p><span className="muted">Reason:</span> {event.reason}</p>}
                    {event.note && <p><span className="muted">Note:</span> {event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="detail-side">
          <Card title="Decision">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="muted">Current status</span>
                <StatusBadge status={app.status} />
              </div>
              {app.decision && (
                <InlineAlert tone={app.decision.status === 'APPROVED' ? 'success' : 'error'}>
                  <strong>{STATUS_LABEL[app.decision.status]}</strong> by {app.decision.by} on {formatDateTime(app.decision.at)}
                  {app.decision.reason && <div>Reason: {app.decision.reason}</div>}
                  {app.decision.note && <div>Note: {app.decision.note}</div>}
                </InlineAlert>
              )}
              {app.source === 'dataset' && (
                <InlineAlert tone="info">Historical dataset record — read-only. Recorded outcome: <strong>{app.historicalOutcome}</strong>.</InlineAlert>
              )}
              {allowedActions.length > 0 ? (
                <div className="action-stack">
                  {allowedActions.includes('approve') && <button type="button" className="btn btn-success" onClick={() => setAction('approve')}><Check size={16} /> Approve</button>}
                  {allowedActions.includes('reject') && <button type="button" className="btn btn-danger" onClick={() => setAction('reject')}><X size={16} /> Reject</button>}
                  {allowedActions.includes('review') && <button type="button" className="btn btn-secondary" onClick={() => setAction('review')}><Send size={15} /> Send for Review</button>}
                </div>
              ) : app.source === 'portal' ? (
                <p className="muted small">A final decision has been recorded. No further actions are available.</p>
              ) : null}
            </div>
          </Card>
          <Card title="Timeline">
            <ul className="timeline">
              {timeline.map((event) => (
                <li key={`${event.type}-${event.id}`}>
                  <span className={`dot ${dotClass(event.type)}`} />
                  <strong>{event.type === 'REJECTED' && event.reason ? `Rejected — ${event.reason}` : event.label}</strong>
                  <small>
                    {event.at ? (event.dateOnly ? formatDate(event.at) : formatDateTime(event.at)) : 'Time not recorded'}
                    {event.actorName && event.actorRole !== 'system' ? ` · ${event.actorName}` : ''}
                  </small>
                  {event.type === 'SENT_FOR_REVIEW' && event.reason && <p>Reason: {event.reason}</p>}
                  {event.note && <p>{event.type === 'FRAUD_ANALYSIS_UNAVAILABLE' ? `Error: ${event.note}` : event.note}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {action && (
        <DecisionDialog
          action={action}
          app={app}
          onClose={() => setAction(null)}
          onDone={onDecided}
          onStale={() => {
            setAction(null);
            detail.reload();
            refreshStats();
          }}
        />
      )}
    </>
  );
}

function FraudAnalysis({ app, explanation, onRerun, rerunning }: { app: Application; explanation: ApplicationDetail['explanation']; onRerun: () => void; rerunning: boolean }) {
  if (app.analysisStatus !== 'completed' || app.fraudProbability === null) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <InlineAlert tone="warning">Fraud analysis is unavailable for this application.{app.analysisError ? ` ${app.analysisError}` : ''}</InlineAlert>
        {app.source === 'portal' && (
          <div><button type="button" className="btn btn-secondary" onClick={onRerun} disabled={rerunning}><RefreshCw size={15} className={rerunning ? 'spin' : ''} /> {rerunning ? 'Running analysis…' : 'Run fraud analysis'}</button></div>
        )}
      </div>
    );
  }
  const level = (app.riskLevel ?? 'LOW').toLowerCase();
  const max = Math.max(...explanation.globalFactors.map((factor) => factor.importance), 0.0001);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="grid-2" style={{ gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="muted small">Fraud probability</span>
          <div className="prob"><strong>{percent(app.fraudProbability, 2)}</strong><RiskBadge level={app.riskLevel} /></div>
          <div className={`meter ${level}`}><i style={{ width: `${Math.max(1, app.fraudProbability * 100)}%` }} /></div>
        </div>
        <dl className="dl" style={{ gridTemplateColumns: '1fr' }}>
          <Row label="Model classification" value={app.fraudPrediction ? 'Fraud' : 'Genuine'} />
          <Row label="Model" value={modelLabel(app.modelName)} />
        </dl>
      </div>
      {app.source === 'dataset' ? (
        <dl className="dl">
          <Row label="Recorded fraud label" value={app.recordedFraudFlag ? 'Fraud (FraudFlag = 1)' : 'Genuine (FraudFlag = 0)'} />
          <Row label="Recorded fraud type" value={app.recordedFraudType} />
        </dl>
      ) : (
        <dl className="dl">
          <Row label="Fraud type" value="Not available — the model predicts fraud / genuine only" span />
        </dl>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        <h3>Contributing factors</h3>
        <InlineAlert tone="info">{explanation.message} The factors below are the model's overall (global) feature importances, not a per-application explanation.</InlineAlert>
        {explanation.globalFactors.length ? (
          <div className="factor-list">
            {explanation.globalFactors.map((factor) => (
              <div className="factor" key={factor.feature}>
                <span title={factor.feature}>{pretty(factor.feature)}</span>
                <div className="bar"><i style={{ width: `${Math.max(3, (factor.importance / max) * 100)}%` }} /></div>
                <b>{factor.importance.toFixed(3)}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">Global feature importance is not available for this model.</p>
        )}
      </div>
      <p className="muted small">Risk levels: Low below 25%, Medium 25–50%, High 50% and above (the model's classification threshold).</p>
    </div>
  );
}

const ACTION_COPY: Record<Action, { title: string; confirm: string; success: string }> = {
  approve: { title: 'Approve application', confirm: 'Approve application', success: 'approved' },
  reject: { title: 'Reject application', confirm: 'Reject application', success: 'rejected' },
  review: { title: 'Send for further review', confirm: 'Send for review', success: 'sent for review' },
};

let referencePromise: Promise<Reference> | null = null;

function DecisionDialog({ action, app, onClose, onDone, onStale }: { action: Action; app: Application; onClose: () => void; onDone: (detail: ApplicationDetail, message: string) => void; onStale: () => void }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reasons = useAsync(() => (referencePromise ??= getReference()).then((ref) => ref.rejectionReasons), []);
  const copy = ACTION_COPY[action];

  const submit = async () => {
    if (busy) return;
    const next: Record<string, string> = {};
    if (action === 'reject' && !reason) next.reason = 'Select a rejection reason.';
    if (action === 'reject' && reason === 'Other' && !note.trim()) next.note = 'Describe the reason when selecting “Other”.';
    if (action === 'review' && !reason.trim()) next.reason = 'Enter the reason for further review.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError('');
    try {
      const result = await decideApplication(app.applicationId, { action, reason: reason.trim() || undefined, note: note.trim() || undefined, expectedStatus: app.status });
      onDone(result, `Application ${app.applicationId} ${copy.success}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(`${err.message}`);
        setBusy(false);
        window.setTimeout(onStale, 1800);
        return;
      }
      setError(err instanceof Error ? err.message : 'The decision could not be saved.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={copy.title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${action === 'reject' ? 'btn-danger' : action === 'approve' ? 'btn-success' : 'btn-primary'}`} onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : copy.confirm}
          </button>
        </>
      }
    >
      <dl className="summary-box">
        <dt>Application ID</dt><dd>{app.applicationId}</dd>
        <dt>Applicant</dt><dd>{applicantLabel(app.applicantName, app.customerId)}</dd>
        <dt>Loan amount</dt><dd>{money(app.loanAmount)}</dd>
        <dt>Status change</dt><dd>{STATUS_LABEL[app.status]} → {action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Under Review'}</dd>
      </dl>
      {error && <InlineAlert>{error}</InlineAlert>}
      {action === 'reject' && (
        <Field label="Rejection reason" required error={errors.reason} hint="The reason is shown to the applicant.">
          {reasons.error ? (
            <InlineAlert>Unable to load rejection reasons: {reasons.error}</InlineAlert>
          ) : !reasons.data ? (
            <span className="muted small">Loading reasons…</span>
          ) : (
            <div className="radio-list" role="radiogroup" aria-label="Rejection reason">
              {reasons.data.map((option) => (
                <label key={option} className={`radio-option ${reason === option ? 'selected' : ''}`}>
                  <input type="radio" name="reason" value={option} checked={reason === option} onChange={() => setReason(option)} />
                  {option}
                </label>
              ))}
            </div>
          )}
        </Field>
      )}
      {action === 'review' && (
        <Field label="Reason for further review" required error={errors.reason} hint="Internal — not shown to the applicant." htmlFor="review-reason">
          <textarea id="review-reason" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Verify income documents with employer" />
        </Field>
      )}
      <Field
        label={action === 'review' ? 'Additional note (optional)' : 'Note to applicant (optional)'}
        required={action === 'reject' && reason === 'Other'}
        error={errors.note}
        hint={action === 'review' ? 'Internal — not shown to the applicant.' : 'Shown to the applicant with the decision.'}
        htmlFor="decision-note"
      >
        <textarea id="decision-note" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
    </Dialog>
  );
}
