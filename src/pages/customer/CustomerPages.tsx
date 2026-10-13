import { ArrowLeft, ArrowRight, FilePlus2, RefreshCw } from 'lucide-react';
import { CustomerApplication, getMyApplication, getMyApplications } from '../../services/backendApi';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime, money } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Card, EmptyState, ErrorState, InlineAlert, Kpi, LoadingState, PageHeader, StatusBadge, useAsync } from '../../ui';

// Customers never see fraud probabilities, risk levels or other model output.

function ApplicationsTable({ items }: { items: CustomerApplication[] }) {
  const open = (id: string) => navigate(`/customer/applications/${encodeURIComponent(id)}`);
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Application ID</th><th>Date</th><th>Loan type</th><th className="num">Amount</th><th>Status</th><th /></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.applicationId} className="clickable" onClick={() => open(item.applicationId)}>
              <td className="mono">{item.applicationId}</td>
              <td>{formatDate(item.applicationDate)}</td>
              <td>{item.loanType}</td>
              <td className="num">{money(item.loanAmount)}</td>
              <td><StatusBadge status={item.status} /></td>
              <td><button type="button" className="btn btn-secondary btn-sm" onClick={(event) => { event.stopPropagation(); open(item.applicationId); }}>View details</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StartButton() {
  return <button type="button" className="btn btn-primary" onClick={() => navigate('/customer/apply')}><FilePlus2 size={15} /> Apply for a loan</button>;
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const list = useAsync(() => getMyApplications(), []);
  const items = list.data?.items ?? [];
  const count = (status: string) => items.filter((item) => item.status === status).length;
  return (
    <>
      <PageHeader title={`Welcome, ${user?.name.split(' ')[0] ?? ''}`} description={`Customer ID ${user?.customerId}. Apply for a loan and follow its progress here.`} actions={<StartButton />} />
      {list.error ? (
        <Card><ErrorState title="Unable to load your applications" message={list.error} onRetry={list.reload} /></Card>
      ) : !list.data ? (
        <Card><LoadingState label="Loading your applications…" /></Card>
      ) : (
        <>
          <div className="kpis">
            <Kpi label="Total applications" value={String(items.length)} />
            <Kpi label="In progress" value={String(count('NEW') + count('UNDER_REVIEW'))} tone="purple" note="Submitted or under review" />
            <Kpi label="Approved" value={String(count('APPROVED'))} tone="success" />
            <Kpi label="Rejected" value={String(count('REJECTED'))} tone="danger" />
          </div>
          <Card
            className="flush"
            title="Recent applications"
            actions={items.length > 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/customer/applications')}>View all <ArrowRight size={14} /></button> : undefined}
          >
            {items.length === 0 ? (
              <EmptyState title="No applications yet" message="When you apply for a loan, you can track its status here." action={<StartButton />} />
            ) : (
              <ApplicationsTable items={items.slice(0, 5)} />
            )}
          </Card>
        </>
      )}
    </>
  );
}

export function MyApplicationsPage() {
  const list = useAsync(() => getMyApplications(), []);
  return (
    <>
      <PageHeader
        title="My Applications"
        description="All loan applications you have submitted."
        actions={<><button type="button" className="btn btn-secondary" onClick={list.reload} disabled={list.loading}><RefreshCw size={15} className={list.loading ? 'spin' : ''} /> Refresh</button><StartButton /></>}
      />
      <Card className="flush">
        {list.error ? (
          <ErrorState title="Unable to load your applications" message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <LoadingState label="Loading your applications…" />
        ) : list.data.items.length === 0 ? (
          <EmptyState title="No applications yet" message="You have not submitted any loan applications." action={<StartButton />} />
        ) : (
          <ApplicationsTable items={list.data.items} />
        )}
      </Card>
    </>
  );
}

const STATUS_MESSAGE: Record<CustomerApplication['status'], { tone: 'info' | 'warning' | 'success' | 'error'; text: string }> = {
  NEW: { tone: 'info', text: 'We have received your application. It is waiting for review by a bank officer.' },
  UNDER_REVIEW: { tone: 'warning', text: 'Your application is under review. Our team is looking at it in more detail.' },
  APPROVED: { tone: 'success', text: 'Your application has been approved.' },
  REJECTED: { tone: 'error', text: 'Your application has been rejected.' },
};

export function CustomerApplicationDetail({ id }: { id: string }) {
  const detail = useAsync(() => getMyApplication(id), [id]);
  const back = (
    <div className="breadcrumb">
      <button type="button" onClick={() => navigate('/customer/applications')}><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> My Applications</button>
      <span>/</span><span>{id}</span>
    </div>
  );
  if (detail.error) return <>{back}<Card><ErrorState title="Unable to load this application" message={detail.error} onRetry={detail.reload} /></Card></>;
  if (!detail.data) return <>{back}<Card><LoadingState label="Loading application…" /></Card></>;
  const app = detail.data;
  const message = STATUS_MESSAGE[app.status];
  return (
    <>
      {back}
      <PageHeader
        title={`Application ${app.applicationId}`}
        description={`${app.loanType} · ${money(app.loanAmount)} · Submitted ${formatDateTime(app.applicationDate)}`}
        actions={<button type="button" className="btn btn-secondary" onClick={detail.reload} disabled={detail.loading}><RefreshCw size={15} className={detail.loading ? 'spin' : ''} /> Refresh status</button>}
      />
      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Application status">
            <div style={{ display: 'grid', gap: 12 }}>
              <div><StatusBadge status={app.status} /></div>
              <InlineAlert tone={message.tone}>
                {message.text}
                {app.status === 'REJECTED' && app.rejectionReason && <div style={{ marginTop: 6 }}><strong>Reason:</strong> {app.rejectionReason}</div>}
                {app.bankMessage && <div style={{ marginTop: 6 }}><strong>Message from the bank:</strong> {app.bankMessage}</div>}
              </InlineAlert>
              {app.decidedAt && <p className="muted small">Decision made on {formatDateTime(app.decidedAt)}.</p>}
            </div>
          </Card>
          <Card title="Loan details">
            <dl className="dl">
              <div><dt>Application ID</dt><dd className="mono">{app.applicationId}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(app.applicationDate)}</dd></div>
              <div><dt>Loan type</dt><dd>{app.loanType}</dd></div>
              <div><dt>Purpose</dt><dd>{app.purpose}</dd></div>
              <div><dt>Amount</dt><dd>{money(app.loanAmount)}</dd></div>
              <div><dt>Tenure</dt><dd>{app.tenureMonths} months</dd></div>
              {app.details && <div><dt>Quoted interest rate</dt><dd>{app.details.interestRate}% p.a.</dd></div>}
            </dl>
          </Card>
          {app.details && (
            <Card title="Your information">
              <dl className="dl">
                <div><dt>Name</dt><dd>{app.details.applicantName}</dd></div>
                <div><dt>Age</dt><dd>{app.details.age}</dd></div>
                <div><dt>Gender</dt><dd>{app.details.gender}</dd></div>
                <div><dt>Dependents</dt><dd>{app.details.dependents}</dd></div>
                <div><dt>Employment</dt><dd>{app.details.employment}</dd></div>
                <div><dt>Monthly income</dt><dd>{money(app.details.monthlyIncome)}</dd></div>
                <div><dt>Existing EMIs</dt><dd>{money(app.details.existingEmis)}</dd></div>
                <div><dt>Property ownership</dt><dd>{app.details.propertyOwnership}</dd></div>
                <div><dt>CIBIL score</dt><dd>{app.details.cibilScore ?? 'Not provided'}</dd></div>
                <div className="span-2"><dt>Address</dt><dd>{app.details.address}</dd></div>
              </dl>
            </Card>
          )}
        </div>
        <div className="detail-side">
          <Card title="Timeline">
            <ul className="timeline">
              {(app.timeline ?? []).map((event, index) => (
                <li key={`${event.type}-${index}`}>
                  <span className={`dot ${event.type === 'APPROVED' ? 'approved' : event.type === 'REJECTED' ? 'rejected' : event.type === 'SENT_FOR_REVIEW' ? 'review' : ''}`} />
                  <strong>{event.type === 'REJECTED' && event.detail ? `Rejected — ${event.detail}` : event.label}</strong>
                  <small>{formatDateTime(event.at)}</small>
                  {event.type === 'SENT_FOR_REVIEW' && event.detail && <p>{event.detail}</p>}
                </li>
              ))}
              {(app.status === 'NEW' || app.status === 'UNDER_REVIEW') && (
                <li>
                  <span className="dot muted-dot" />
                  <strong className="muted">Decision</strong>
                  <small>Pending</small>
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
