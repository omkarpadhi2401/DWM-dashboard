import { useState } from 'react';
import { getFeatureAnalysis } from '../../services/technicalApi';
import { BarChart, HBarChart } from '../../charts';
import { pretty } from '../../lib/format';
import { Card, InlineAlert, PageHeader, useAsync } from '../../ui';
import { Loaded, RefreshButton, Tabs, num } from './shared';

export function FeatureAnalysisPage() {
  const data = useAsync(() => getFeatureAnalysis(), []);
  const [model, setModel] = useState('');
  const [feature, setFeature] = useState('');
  return (
    <>
      <PageHeader
        title="Feature Analysis"
        description="How each input feature relates to the fraud label, and which features each model relies on."
        actions={<RefreshButton onClick={data.reload} busy={data.loading} />}
      />
      <Loaded state={data} label="Analysing features…" title="Unable to load feature analysis">
        {(result) => {
          const modelNames = Object.keys(result.importance);
          const activeModel = model || modelNames.find((name) => result.importance[name].values) || modelNames[0];
          const importance = result.importance[activeModel];
          const activeFeature = feature || result.categoricalBreakdown[0]?.feature;
          const breakdown = result.categoricalBreakdown.find((item) => item.feature === activeFeature);
          const maxCorrelation = Math.max(...result.correlations.map((item) => Math.abs(item.correlation ?? 0)), 0.0001);
          return (
            <>
              <Card title="Model input features" subtitle={`${result.features.length} features · target: ${result.target}`}>
                <div className="chips">
                  {result.features.map((item) => <span key={item.name} className={`badge ${item.kind === 'numeric' ? 'purple' : 'neutral'}`}>{item.name} · {item.kind}</span>)}
                </div>
              </Card>

              <Card title="Global feature importance" subtitle="From the training pipeline's evaluation results"
                actions={<Tabs label="Model" value={activeModel} onChange={setModel} options={modelNames.map((name) => ({ value: name, label: result.importance[name].label }))} />}>
                <InlineAlert tone="info">{result.note}</InlineAlert>
                <div style={{ marginTop: 14 }}>
                  {importance?.values?.length ? (
                    <>
                      <p className="muted small" style={{ marginBottom: 10 }}>
                        {importance.kind === 'abs_coefficient' ? 'Absolute size of the logistic-regression coefficient per encoded feature.' : 'Tree-based importance per encoded feature (sums to 1 across all features).'}
                      </p>
                      <HBarChart format={(value) => value.toFixed(3)} data={importance.values.slice(0, 12).map((item) => ({ label: item.feature.replace('_', ' = '), value: item.importance }))} />
                    </>
                  ) : (
                    <p className="muted">Not available — {importance?.label} does not provide feature importance.</p>
                  )}
                </div>
              </Card>

              <div className="grid-2">
                <Card title="Correlation with FraudFlag" subtitle="Pearson correlation of each numerical feature with the target">
                  <HBarChart tone="soft" max={maxCorrelation} format={(value) => value.toFixed(4)} data={result.correlations.map((item) => ({ label: pretty(item.feature), value: item.correlation ?? 0 }))} />
                  <p className="muted small" style={{ marginTop: 10 }}>Bar length shows the absolute size; the sign is in the value. All correlations are close to zero, i.e. no single numerical feature separates fraud from genuine applications.</p>
                </Card>
                <Card className="flush" title="Fraud vs genuine: numerical features" subtitle="Mean and median per class">
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Feature</th><th className="num">Fraud mean</th><th className="num">Genuine mean</th><th className="num">Fraud median</th><th className="num">Genuine median</th></tr></thead>
                      <tbody>
                        {result.numericComparison.map((row) => (
                          <tr key={row.feature}><td>{pretty(row.feature)}</td><td className="num">{num(row.fraudMean)}</td><td className="num">{num(row.genuineMean)}</td><td className="num">{num(row.fraudMedian)}</td><td className="num">{num(row.genuineMedian)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <Card title="Fraud percentage by categorical feature"
                actions={<Tabs label="Feature" value={activeFeature} onChange={setFeature} options={result.categoricalBreakdown.map((item) => ({ value: item.feature, label: pretty(item.feature) }))} />}>
                {breakdown ? (
                  <BarChart wide ariaLabel={`Fraud percentage by ${breakdown.feature}`} yLabel="Fraud %" format={(value) => `${value.toFixed(2)}%`}
                    data={breakdown.values.map((item) => ({ label: item.key, value: item.fraudRate, detail: `${item.fraudCount} fraud of ${item.loanCount.toLocaleString()} applications` }))} />
                ) : <p className="muted">Not available</p>}
              </Card>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
