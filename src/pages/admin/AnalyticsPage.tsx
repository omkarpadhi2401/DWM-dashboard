import { RefreshCw } from 'lucide-react';
import { EdaResponse, GroupMetric, ModelResponse, Overview, getEda, getModels, getOverview } from '../../services/backendApi';
import { money, percent, pretty, modelLabel } from '../../lib/format';
import { Card, ErrorState, Kpi, LoadingState, PageHeader, useAsync } from '../../ui';

function RateBars({ items, note }: { items: GroupMetric[]; note?: string }) {
  const max = Math.max(...items.map((item) => item.fraudRate), 0.01);
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-label"><span>{item.label}</span><b>{item.fraudRate.toFixed(2)}%</b></div>
          <div className="bar"><i style={{ width: `${Math.max(2, (item.fraudRate / max) * 100)}%` }} /></div>
          <small>{item.fraud.toLocaleString()} fraud of {item.total.toLocaleString()} applications</small>
        </div>
      ))}
      {note && <p className="muted small">{note}</p>}
    </div>
  );
}

function DistributionBars({ items }: { items: { range: string; count: number; fraudRate: number }[] }) {
  const max = Math.max(...items.map((item) => item.fraudRate), 0.01);
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar-row" key={item.range}>
          <div className="bar-label"><span className="mono">{item.range}</span><b>{item.fraudRate.toFixed(2)}%</b></div>
          <div className="bar alt"><i style={{ width: `${Math.max(2, (item.fraudRate / max) * 100)}%` }} /></div>
          <small>{item.count.toLocaleString()} applications</small>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const data = useAsync(() => Promise.all([getOverview(), getEda(), getModels().catch(() => null)]), []);

  return (
    <>
      <PageHeader
        title="Fraud Analytics"
        description="Computed live from the historical dataset of labelled loan applications (FraudFlag). Figures are not estimated or simulated."
        actions={<button type="button" className="btn btn-secondary" onClick={data.reload} disabled={data.loading}><RefreshCw size={15} className={data.loading ? 'spin' : ''} /> Refresh</button>}
      />
      {data.error ? (
        <Card><ErrorState title="Unable to load analytics" message={data.error} onRetry={data.reload} /></Card>
      ) : !data.data ? (
        <Card><LoadingState label="Loading analytics…" /></Card>
      ) : (
        <AnalyticsContent overview={data.data[0]} eda={data.data[1]} models={data.data[2]} />
      )}
    </>
  );
}

function AnalyticsContent({ overview, eda, models }: { overview: Overview; eda: EdaResponse; models: ModelResponse | null }) {
  const fraudShare = overview.totalApplications ? (overview.fraudulentApplications / overview.totalApplications) * 100 : 0;
  return (
    <>
      <div className="kpis">
        <Kpi label="Fraud rate" value={`${overview.fraudRate.toFixed(2)}%`} tone="purple" />
        <Kpi label="Fraud cases" value={overview.fraudulentApplications.toLocaleString()} tone="danger" />
        <Kpi label="Genuine cases" value={overview.genuineApplications.toLocaleString()} tone="success" />
        <Kpi label="Average loan amount" value={money(overview.averageLoanAmount)} note={`${overview.totalApplications.toLocaleString()} labelled applications`} />
      </div>

      <div className="grid-2">
        <Card title="Fraud vs genuine" subtitle="Target variable: FraudFlag">
          <div className="split-bar" aria-label={`${fraudShare.toFixed(2)}% fraud`}>
            <i style={{ width: `${100 - fraudShare}%`, background: '#c4b5fd' }} />
            <i style={{ width: `${fraudShare}%`, background: 'var(--purple)' }} />
          </div>
          <div className="legend">
            <span><i style={{ background: '#c4b5fd' }} /> Genuine {overview.genuineApplications.toLocaleString()} ({(100 - fraudShare).toFixed(2)}%)</span>
            <span><i style={{ background: 'var(--purple)' }} /> Fraud {overview.fraudulentApplications.toLocaleString()} ({fraudShare.toFixed(2)}%)</span>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>The classes are highly imbalanced, so model evaluation relies on recall and PR-AUC rather than accuracy alone.</p>
        </Card>
        <Card title="Fraud cases by type" subtitle="Recorded FraudType for FraudFlag = 1">
          <div className="bars">
            {overview.byFraudType.map((item) => (
              <div className="bar-row" key={item.label}>
                <div className="bar-label"><span>{item.label}</span><b>{item.count}</b></div>
                <div className="bar"><i style={{ width: `${(item.count / Math.max(1, overview.fraudulentApplications)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Fraud rate trend" subtitle="By quarter of application date (chronological)">
        <RateBars items={overview.byQuarter} />
      </Card>

      <div className="grid-2">
        <Card title="By loan type"><RateBars items={overview.byLoanType} /></Card>
        <Card title="By employment"><RateBars items={overview.byEmployment} /></Card>
      </div>
      <div className="grid-2">
        <Card title="By gender"><RateBars items={overview.byGender} /></Card>
        <Card title="By age group"><RateBars items={overview.byAgeGroup} /></Card>
      </div>
      <div className="grid-2">
        <Card title="Debt-to-income ratio" subtitle="Fraud rate by DTI quantile (%)">{eda.distributions.DebtToIncomeRatio ? <DistributionBars items={eda.distributions.DebtToIncomeRatio} /> : <p className="muted">Not available.</p>}</Card>
        <Card title="Loan amount" subtitle="Fraud rate by loan amount quantile (₹)">{eda.distributions.LoanAmountRequested ? <DistributionBars items={eda.distributions.LoanAmountRequested} /> : <p className="muted">Not available.</p>}</Card>
      </div>
      <Card title="CIBIL score">
        <p className="muted">CIBIL score is not a column in the historical dataset, so fraud rate by CIBIL score cannot be computed. Portal applicants may self-declare a score, which is shown on their application but is not used by the model.</p>
      </Card>

      <Card className="flush" title="Model metrics" subtitle="Measured on the held-out test set by the training pipeline.">
        {models ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Model</th><th className="num">Accuracy</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">ROC-AUC</th><th className="num">PR-AUC</th><th>Artifact</th></tr></thead>
              <tbody>
                {Object.entries(models.models).map(([key, metric]) => (
                  <tr key={key}>
                    <td>{modelLabel(key)} {key === models.selectedModel && <span className="badge purple">Selected</span>}</td>
                    <td className="num">{percent(metric.accuracy)}</td>
                    <td className="num">{percent(metric.precision)}</td>
                    <td className="num">{percent(metric.recall)}</td>
                    <td className="num">{percent(metric.f1)}</td>
                    <td className="num">{metric.rocAuc.toFixed(4)}</td>
                    <td className="num">{metric.prAuc.toFixed(4)}</td>
                    <td>{models.availableModels.includes(key) ? <span className="badge risk-low">Available</span> : <span className="badge neutral" title="No .joblib file in models/">Missing</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20 }}><p className="muted">Model results are not available. Train the models with <code>python -m ml.train</code>.</p></div>
        )}
      </Card>
    </>
  );
}
