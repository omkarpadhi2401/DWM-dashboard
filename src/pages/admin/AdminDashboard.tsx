import { useEffect } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useStats } from '../../lib/stats';
import { getApplications } from '../../services/backendApi';
import { money } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Card, EmptyState, ErrorState, Kpi, LoadingState, PageHeader, useAsync } from '../../ui';
import { ApplicationTable } from './ApplicationTable';

export function AdminDashboard() {
  const { stats, error: statsError, refresh } = useStats();
  const attention = useAsync(() => getApplications({ status: 'NEW,UNDER_REVIEW', sort: 'fraudProbability', order: 'desc', page_size: 8 }), []);
  const recent = useAsync(() => getApplications({ sort: 'applicationDate', order: 'desc', page_size: 8 }), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reloadAll = () => {
    refresh();
    attention.reload();
    recent.reload();
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live summary of loan applications from the historical dataset and the customer portal."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={reloadAll}><RefreshCw size={15} /> Refresh</button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/new')}>View New Applications <ArrowRight size={15} /></button>
          </>
        }
      />

      {statsError && !stats ? (
        <Card><ErrorState title="Unable to load dashboard figures" message={statsError} onRetry={refresh} /></Card>
      ) : !stats ? (
        <Card><LoadingState label="Loading dashboard…" /></Card>
      ) : (
        <div className="kpis">
          <Kpi label="Total applications" value={stats.total.toLocaleString()} note={`${stats.historicalApplications.toLocaleString()} historical · ${stats.portalApplications.toLocaleString()} portal`} onClick={() => navigate('/admin/applications')} />
          <Kpi label="New applications" value={stats.new.toLocaleString()} tone="purple" note="Awaiting a first decision" onClick={() => navigate('/admin/new')} />
          <Kpi label="Under review" value={stats.underReview.toLocaleString()} tone="warning" onClick={() => navigate('/admin/applications?status=UNDER_REVIEW')} />
          <Kpi label="Approved" value={stats.approved.toLocaleString()} tone="success" onClick={() => navigate('/admin/applications?status=APPROVED')} />
          <Kpi label="Rejected" value={stats.rejected.toLocaleString()} tone="danger" onClick={() => navigate('/admin/applications?status=REJECTED')} />
          <Kpi label="Fraud flagged" value={stats.fraudFlagged.toLocaleString()} note="Recorded label (historical) or model prediction (portal)" onClick={() => navigate('/admin/applications?fraud=flagged')} />
          <Kpi label="Fraud rate" value={`${stats.fraudRate.toFixed(2)}%`} note="Fraud flagged ÷ total applications" />
          <Kpi label="Average loan amount" value={money(stats.averageLoanAmount)} />
        </div>
      )}

      <Card
        className="flush"
        title="Applications requiring attention"
        subtitle="New and under-review applications, highest fraud probability first."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/new')}>Open work queue <ArrowRight size={14} /></button>}
      >
        {attention.loading && !attention.data ? (
          <LoadingState label="Loading applications…" />
        ) : attention.error ? (
          <ErrorState title="Unable to load applications" message={attention.error} onRetry={attention.reload} />
        ) : attention.data && attention.data.items.length === 0 ? (
          <EmptyState title="Nothing needs attention" message="There are no new or under-review applications right now." />
        ) : (
          <div className="table-wrap"><ApplicationTable items={attention.data?.items ?? []} /></div>
        )}
      </Card>

      <Card
        className="flush"
        title="Recent applications"
        subtitle="Most recent by application date."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/applications')}>All applications <ArrowRight size={14} /></button>}
      >
        {recent.loading && !recent.data ? (
          <LoadingState label="Loading applications…" />
        ) : recent.error ? (
          <ErrorState title="Unable to load applications" message={recent.error} onRetry={recent.reload} />
        ) : recent.data && recent.data.items.length === 0 ? (
          <EmptyState title="No applications found" />
        ) : (
          <div className="table-wrap"><ApplicationTable items={recent.data?.items ?? []} /></div>
        )}
      </Card>
    </>
  );
}
