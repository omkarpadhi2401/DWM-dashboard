import { ArrowRight, RefreshCw } from 'lucide-react';
import { API_BASE, getHealth, getReference } from '../../services/backendApi';
import { useAuth } from '../../lib/auth';
import { modelLabel, pretty } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Card, ErrorState, LoadingState, PageHeader, useAsync } from '../../ui';

export function SettingsPage() {
  const { user } = useAuth();
  const info = useAsync(() => Promise.all([getHealth(), getReference()]), []);
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account details, system status and the decision rules used by this workspace."
        actions={<button type="button" className="btn btn-secondary" onClick={info.reload} disabled={info.loading}><RefreshCw size={15} className={info.loading ? 'spin' : ''} /> Refresh status</button>}
      />
      <div className="grid-2">
        <Card title="Your account">
          <dl className="dl">
            <div><dt>Name</dt><dd>{user?.name}</dd></div>
            <div><dt>Email</dt><dd>{user?.email}</dd></div>
            <div><dt>Role</dt><dd>Bank officer</dd></div>
            <div><dt>Session</dt><dd>Expires after 12 hours of sign-in</dd></div>
          </dl>
        </Card>
        <Card title="System status">
          {info.error ? (
            <ErrorState title="API unavailable" message={info.error} onRetry={info.reload} />
          ) : !info.data ? (
            <LoadingState />
          ) : (
            <dl className="dl">
              <div><dt>API address</dt><dd className="mono">{API_BASE}</dd></div>
              <div><dt>API status</dt><dd><span className="badge risk-low">Online</span></dd></div>
              <div><dt>Historical dataset</dt><dd>{info.data[0].datasetAvailable ? 'Loaded' : 'Missing'}</dd></div>
              <div><dt>Model results</dt><dd>{info.data[0].modelsTrained ? 'Available' : 'Not trained'}</dd></div>
              <div className="span-2"><dt>Model artifacts</dt><dd>{info.data[0].availableModels.map(modelLabel).join(', ') || 'None'}</dd></div>
            </dl>
          )}
        </Card>
      </div>
      {info.data && (
        <div className="grid-2">
          <Card title="Risk levels" subtitle="Derived from the model's fraud probability">
            <dl className="dl">
              {Object.entries(info.data[1].riskBands).map(([level, [low, high]]) => (
                <div key={level}><dt>{pretty(level.charAt(0) + level.slice(1).toLowerCase())}</dt><dd>{Math.round(low * 100)}% – {high >= 1 ? '100%' : `below ${Math.round(high * 100)}%`}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="Rejection reasons" subtitle="Shown to applicants when an application is rejected">
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {info.data[1].rejectionReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </Card>
        </div>
      )}
      <Card title="Academic model evaluation" subtitle="Detailed confusion matrices, ROC and precision-recall curves for the trained classifiers.">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/model-lab')}>Open Model Lab <ArrowRight size={15} /></button>
      </Card>
    </>
  );
}
