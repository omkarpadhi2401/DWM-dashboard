import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { QualityStatus, getDataQuality } from '../../services/technicalApi';
import { Card, PageHeader, useAsync } from '../../ui';
import { Loaded, RefreshButton, SourceNote } from './shared';

const STATUS: Record<QualityStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'Healthy', className: 'risk-low', icon: CheckCircle2 },
  warning: { label: 'Warning', className: 'risk-medium', icon: AlertTriangle },
  needs_attention: { label: 'Needs Attention', className: 'risk-high', icon: XCircle },
};

export function QualityBadge({ status }: { status: QualityStatus }) {
  const { label, className, icon: Icon } = STATUS[status];
  return <span className={`badge ${className}`}><Icon size={13} /> {label}</span>;
}

export function DataQualityPage() {
  const quality = useAsync(() => getDataQuality(), []);
  return (
    <>
      <PageHeader
        title="Data Quality"
        description="Each status is the result of a check run on the loaded dataset. The rule that decides the status is shown with every check."
        actions={<RefreshButton onClick={quality.reload} busy={quality.loading} />}
      />
      <Loaded state={quality} label="Running data-quality checks…" title="Unable to run the data-quality checks">
        {(data) => (
          <>
            <SourceNote source={data.source} />
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <div className="kpi"><span className="kpi-label">Checks run</span><strong className="kpi-value">{data.checks.length}</strong><small className="kpi-note">{data.rows.toLocaleString()} rows × {data.columns} columns</small></div>
              <div className="kpi"><span className="kpi-label">Healthy</span><strong className="kpi-value success">{data.summary.healthy}</strong></div>
              <div className="kpi"><span className="kpi-label">Warning</span><strong className="kpi-value warning">{data.summary.warning}</strong></div>
              <div className="kpi"><span className="kpi-label">Needs Attention</span><strong className="kpi-value danger">{data.summary.needs_attention}</strong></div>
            </div>
            <div className="quality-list">
              {data.checks.map((check) => (
                <Card key={check.key}>
                  <div className="quality-head">
                    <div>
                      <h2>{check.title}</h2>
                      <p style={{ marginTop: 4 }}>{check.value}</p>
                    </div>
                    <QualityBadge status={check.status} />
                  </div>
                  {check.details.length > 0 && (
                    <div className="table-wrap" style={{ marginTop: 12 }}>
                      <table>
                        <thead><tr><th>Finding</th><th className="num">Count</th><th>Examples</th></tr></thead>
                        <tbody>
                          {check.details.map((detail) => (
                            <tr key={detail.label}>
                              <td style={{ whiteSpace: 'normal' }}>{detail.label}</td>
                              <td className="num">{detail.count.toLocaleString()}</td>
                              <td className="muted">{detail.examples?.join(', ') ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {check.note && <p className="muted small" style={{ marginTop: 10 }}>{check.note}</p>}
                  <p className="muted small" style={{ marginTop: 8 }}><strong>Rule:</strong> {check.rule}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </Loaded>
    </>
  );
}
