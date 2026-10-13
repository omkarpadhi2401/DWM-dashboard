import { useState } from 'react';
import { getOverview } from '../../services/backendApi';
import { MetricKey, getDatasetProfile, getDistributions, getTechModels } from '../../services/technicalApi';
import { BarChart, CHART_PURPLE, CHART_PURPLE_SOFT, HBarChart, LineChart, SplitBar, compact } from '../../charts';
import { navigate } from '../../lib/router';
import { Card, Kpi, PageHeader, useAsync } from '../../ui';
import { Loaded, METRICS, RefreshButton, SourceNote, Tabs, metricText } from './shared';

const pct = (value: number) => `${value.toFixed(2)}%`;

export function TechDashboard() {
  const data = useAsync(() => Promise.all([getDatasetProfile(), getOverview(), getDistributions(), getTechModels()]), []);
  const [metric, setMetric] = useState<MetricKey>('recall');
  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Technical overview of the FraudGuard dataset, fraud patterns and machine-learning models. Every figure is calculated from the project data."
        actions={<RefreshButton onClick={data.reload} busy={data.loading} />}
      />
      <Loaded state={data} label="Loading technical dashboard…" title="Unable to load the dashboard">
        {([profile, overview, dist, models]) => {
          const artifacts = models.models.filter((model) => model.artifactAvailable).length;
          const rateBars = (items: { label: string; fraudRate: number; fraud: number; total: number }[]) =>
            items.map((item) => ({ label: item.label, value: item.fraudRate, detail: `${item.fraud} fraud of ${item.total.toLocaleString()} applications` }));
          const histBars = (bins: { from: number; to: number; count: number; fraudCount: number; fraudRate: number }[], format: (value: number) => string) =>
            bins.map((bin) => ({ label: `${format(bin.from)}–${format(bin.to)}`, value: bin.count, detail: `${bin.fraudCount} fraud (${bin.fraudRate.toFixed(2)}%)` }));
          return (
            <>
              <SourceNote source={profile.source} />
              <div className="kpis">
                <Kpi label="Total records" value={profile.rows.toLocaleString()} note={`${profile.columns} columns`} onClick={() => navigate('/technical/dataset')} />
                <Kpi label="Fraud cases" value={profile.fraud.fraud.toLocaleString()} tone="danger" />
                <Kpi label="Genuine cases" value={profile.fraud.genuine.toLocaleString()} tone="success" />
                <Kpi label="Fraud percentage" value={pct(profile.fraud.fraudRate)} tone="purple" />
                <Kpi label="Model features" value={String(profile.modelFeatures.all.length)} note={`${profile.modelFeatures.numeric.length} numeric · ${profile.modelFeatures.categorical.length} categorical`} onClick={() => navigate('/technical/features')} />
                <Kpi label="ML models evaluated" value={String(models.models.length)} note={`${artifacts} saved model files available`} onClick={() => navigate('/technical/models')} />
                <Kpi label="Dataset completeness" value={profile.completeness === null ? 'Not available' : `${profile.completeness.toFixed(2)}%`} note={`${profile.missingCells.toLocaleString()} missing values`} onClick={() => navigate('/technical/quality')} />
                <Kpi label="Duplicate records" value={profile.duplicateRows.toLocaleString()} note={`${(profile.duplicateApplicationIds ?? 0).toLocaleString()} repeated Application IDs`} onClick={() => navigate('/technical/quality')} />
              </div>

              <div className="grid-2">
                <Card title="Highest value per metric" subtitle="Which model scores highest on each evaluation metric (held-out test set). No single model leads on all of them.">
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Metric</th><th className="num">Highest value</th><th>Model</th></tr></thead>
                      <tbody>
                        {METRICS.map(({ key, label }) => {
                          const best = models.bestByMetric[key];
                          return (
                            <tr key={key}>
                              <td>{label}</td>
                              <td className="num">{best ? metricText(key, best.value) : 'Not available'}</td>
                              <td>{best ? best.models.map((name) => models.models.find((model) => model.name === name)?.label ?? name).join(', ') : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card title="Fraud vs genuine" subtitle="Target variable: FraudFlag">
                  <SplitBar parts={[{ label: 'Genuine', value: profile.fraud.genuine, color: CHART_PURPLE_SOFT }, { label: 'Fraud', value: profile.fraud.fraud, color: CHART_PURPLE }]} />
                  <p className="muted small" style={{ marginTop: 12 }}>
                    Records dated {profile.dateRange.from ?? '—'} to {profile.dateRange.to ?? '—'}. The classes are highly imbalanced, so accuracy alone is not a reliable measure of model quality.
                  </p>
                </Card>
              </div>

              <Card title="Fraud trend over time" subtitle="Fraud percentage by quarter of application date">
                <LineChart ariaLabel="Fraud percentage by quarter" yLabel="Fraud %" format={(value) => `${value.toFixed(1)}%`} data={rateBars(overview.byQuarter)} />
              </Card>

              <div className="grid-2">
                <Card title="Fraud by loan type" subtitle="Fraud percentage"><BarChart ariaLabel="Fraud percentage by loan type" format={(value) => `${value.toFixed(2)}%`} data={rateBars(overview.byLoanType)} /></Card>
                <Card title="Fraud by employment status" subtitle="Fraud percentage"><BarChart ariaLabel="Fraud percentage by employment status" format={(value) => `${value.toFixed(2)}%`} data={rateBars(overview.byEmployment)} /></Card>
              </div>
              <div className="grid-2">
                <Card title="Fraud by gender" subtitle="Fraud percentage"><BarChart ariaLabel="Fraud percentage by gender" format={(value) => `${value.toFixed(2)}%`} data={rateBars(overview.byGender)} /></Card>
                <Card title="Fraud by age group" subtitle="Fraud percentage"><BarChart ariaLabel="Fraud percentage by age group" format={(value) => `${value.toFixed(2)}%`} data={rateBars(overview.byAgeGroup)} /></Card>
              </div>
              <div className="grid-2">
                <Card title="Loan amount distribution" subtitle="Number of applications per loan-amount band (₹)">
                  {dist.loanAmount ? <BarChart ariaLabel="Loan amount distribution" showValues={false} format={compact} data={histBars(dist.loanAmount.bins, compact)} /> : <p className="muted">Not available</p>}
                </Card>
                <Card title="Debt-to-income distribution" subtitle="Number of applications per DTI band (%)">
                  {dist.debtToIncome ? <BarChart ariaLabel="Debt-to-income distribution" showValues={false} format={compact} data={histBars(dist.debtToIncome.bins, (value) => value.toFixed(0))} /> : <p className="muted">Not available</p>}
                </Card>
              </div>
              <Card title="CIBIL score distribution">
                {dist.cibil ? <BarChart ariaLabel="CIBIL score distribution" showValues={false} format={compact} data={histBars(dist.cibil.bins, (value) => value.toFixed(0))} /> : <p className="muted">Not available. {dist.cibilNote}</p>}
              </Card>

              <Card
                title="Model performance comparison"
                subtitle="Measured on the held-out test set by the training pipeline"
                actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/technical/models')}>Full comparison</button>}
              >
                <Tabs label="Metric" value={metric} onChange={setMetric} options={METRICS.map(({ key, label }) => ({ value: key, label }))} />
                <div style={{ marginTop: 14 }}>
                  <HBarChart max={1} format={(value) => metricText(metric, value)} data={models.models.map((model) => ({ label: model.label, value: model.metrics[metric] ?? 0 }))} />
                </div>
                <p className="muted small" style={{ marginTop: 10 }}>{models.metricNotes[metric]}</p>
              </Card>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
