import { ArrowDown, ArrowRight } from 'lucide-react';
import { getSystemInfo } from '../../services/technicalApi';
import { API_BASE } from '../../services/backendApi';
import { formatDateTime, modelLabel } from '../../lib/format';
import { Card, Kpi, PageHeader, useAsync } from '../../ui';
import { Loaded, RefreshButton, SourceNote } from './shared';

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? 'risk-low' : 'risk-high'}`}>{label}</span>;
}

export function SystemPage() {
  const info = useAsync(() => getSystemInfo(), []);
  return (
    <>
      <PageHeader
        title="System / Technical Information"
        description="Architecture, live status and components of FraudGuard. No passwords, keys or tokens are shown on this page."
        actions={<RefreshButton onClick={info.reload} busy={info.loading} />}
      />
      <Loaded state={info} label="Checking system status…" title="Backend unavailable">
        {(data) => {
          const uptime = data.uptimeSeconds < 3600 ? `${Math.floor(data.uptimeSeconds / 60)} min` : `${(data.uptimeSeconds / 3600).toFixed(1)} h`;
          return (
            <>
              <SourceNote source={data.dataset.source} />
              <div className="kpis">
                <div className="kpi"><span className="kpi-label">Backend status</span><div><Dot ok={data.status.backend === 'online'} label={data.status.backend === 'online' ? 'Online' : 'Offline'} /></div><small className="kpi-note">Up for {uptime}</small></div>
                <div className="kpi"><span className="kpi-label">API status</span><div><Dot ok={data.status.api === 'online'} label={data.status.api === 'online' ? 'Online' : 'Offline'} /></div><small className="kpi-note">{data.api.endpoints} endpoints</small></div>
                <Kpi label="Dataset records" value={data.dataset.records?.toLocaleString() ?? 'Not available'} note={data.dataset.source?.inUse ?? data.status.datasetError ?? undefined} />
                <Kpi label="Available models" value={String(data.models.artifacts.length)} note={`${data.models.evaluated.length} evaluated · live scoring: ${modelLabel(data.models.liveScoring)}`} />
              </div>

              <Card title="System architecture">
                <div className="arch">
                  <div className="arch-row">
                    <div className="arch-box"><b>Customer portal</b><small>Signup, loan application, status tracking</small></div>
                    <div className="arch-box"><b>Bank Officer workspace</b><small>Review, approve, reject, send for review</small></div>
                    <div className="arch-box accent"><b>Admin / Technical panel</b><small>Dataset, models, data quality, OLAP</small></div>
                  </div>
                  <div className="arch-arrow"><ArrowDown size={16} /> <span>React + TypeScript single-page app · HTTPS/JSON · bearer token</span></div>
                  <div className="arch-row"><div className="arch-box wide"><b>FastAPI backend</b><small>Authentication · role-based access control (Customer / Officer / Admin) · application workflow · analytics · OLAP · prediction</small></div></div>
                  <div className="arch-arrow"><ArrowDown size={16} /></div>
                  <div className="arch-row">
                    <div className="arch-box"><b>Historical dataset</b><small>SheetDB source, cached CSV · read-only</small></div>
                    <div className="arch-box"><b>Operational store</b><small>SQLite: users, sessions, applications, audit trail</small></div>
                    <div className="arch-box"><b>ML models</b><small>Preprocess + SMOTE + classifier pipelines (.joblib)</small></div>
                  </div>
                </div>
              </Card>

              <Card className="flush" title="Components">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr></thead>
                    <tbody>{data.architecture.map((row) => <tr key={row.layer}><td><b>{row.layer}</b></td><td>{row.technology}</td><td style={{ whiteSpace: 'normal' }}>{row.detail}</td></tr>)}</tbody>
                  </table>
                </div>
              </Card>

              <Card title="Fraud detection workflow">
                <ol className="flow">
                  {data.workflow.map((step, index) => (
                    <li key={step}><span>{index + 1}</span>{step}{index < data.workflow.length - 1 && <ArrowRight size={14} className="flow-arrow" />}</li>
                  ))}
                </ol>
              </Card>

              <div className="grid-2">
                <Card title="Data and models">
                  <dl className="dl">
                    <div><dt>Configured data source</dt><dd>{data.dataset.source?.configured ?? 'Not available'}</dd></div>
                    <div><dt>Source address</dt><dd className="mono">{data.dataset.source?.configuredUrl ?? 'Not available'}</dd></div>
                    <div><dt>Source in use</dt><dd>{data.dataset.source?.inUse ?? 'Not available'}</dd></div>
                    <div><dt>Loaded at</dt><dd>{formatDateTime(data.dataset.source?.loadedAt)}</dd></div>
                    <div className="span-2"><dt>Models evaluated</dt><dd>{data.models.evaluated.map(modelLabel).join(', ') || 'None'}</dd></div>
                    <div className="span-2"><dt>Saved model files</dt><dd>{data.models.artifacts.map(modelLabel).join(', ') || 'None'}</dd></div>
                    <div><dt>Selected by training pipeline</dt><dd>{modelLabel(data.models.selected)}</dd></div>
                    <div><dt>Used for live scoring</dt><dd>{modelLabel(data.models.liveScoring)}</dd></div>
                  </dl>
                </Card>
                <Card title="Operational store and runtime">
                  <dl className="dl">
                    <div><dt>Database</dt><dd>{data.operationalStore.engine}</dd></div>
                    <div><dt>API address</dt><dd className="mono">{API_BASE}</dd></div>
                    <div><dt>Customer accounts</dt><dd>{data.operationalStore.users.customer ?? 0}</dd></div>
                    <div><dt>Bank officer accounts</dt><dd>{data.operationalStore.users.officer ?? 0}</dd></div>
                    <div><dt>Admin accounts</dt><dd>{data.operationalStore.users.admin ?? 0}</dd></div>
                    <div><dt>Portal applications</dt><dd>{Object.values(data.operationalStore.portalApplications).reduce((sum, value) => sum + value, 0)}</dd></div>
                    <div><dt>Audit-trail events</dt><dd>{data.operationalStore.auditEvents}</dd></div>
                    <div><dt>Server time (UTC)</dt><dd>{formatDateTime(data.serverTime)}</dd></div>
                  </dl>
                  <h3 style={{ margin: '14px 0 8px' }}>Library versions</h3>
                  <div className="chips">{Object.entries(data.versions).map(([name, version]) => <span className="badge neutral" key={name}>{name} {version ?? 'not installed'}</span>)}</div>
                </Card>
              </div>

              <Card className="flush" title="API endpoints" subtitle="Who can call each endpoint (enforced by the backend)">
                <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>Method</th><th>Path</th><th>Access</th></tr></thead>
                    <tbody>{data.api.routes.map((route) => <tr key={`${route.method} ${route.path}`}><td><span className="badge neutral">{route.method}</span></td><td className="mono">{route.path}</td><td>{route.access === 'Admin' ? <span className="badge purple">Admin</span> : route.access}</td></tr>)}</tbody>
                  </table>
                </div>
              </Card>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
