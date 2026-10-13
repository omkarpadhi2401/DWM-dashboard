import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MetricKey, TechModel, getTechModels } from '../../services/technicalApi';
import { HBarChart } from '../../charts';
import { navigate } from '../../lib/router';
import { Card, InlineAlert, PageHeader, useAsync } from '../../ui';
import { Loaded, METRICS, RefreshButton, Tabs, metricText } from './shared';

export function ConfusionMatrix({ matrix }: { matrix: TechModel['confusionMatrix'] }) {
  if (!matrix) return <p className="muted">Not available</p>;
  return (
    <table className="cm" aria-label="Confusion matrix">
      <thead>
        <tr><th /><th>Predicted genuine</th><th>Predicted fraud</th></tr>
      </thead>
      <tbody>
        <tr><th>Actual genuine</th><td><b>{matrix.tn.toLocaleString()}</b><small>True negative</small></td><td><b>{matrix.fp.toLocaleString()}</b><small>False positive</small></td></tr>
        <tr><th>Actual fraud</th><td><b>{matrix.fn.toLocaleString()}</b><small>False negative</small></td><td className="cm-hit"><b>{matrix.tp.toLocaleString()}</b><small>True positive</small></td></tr>
      </tbody>
    </table>
  );
}

export function ModelComparisonPage() {
  const data = useAsync(() => getTechModels(), []);
  const [sortBy, setSortBy] = useState<MetricKey>('recall');
  return (
    <>
      <PageHeader
        title="ML Model Comparison"
        description="The classifiers trained by the FraudGuard pipeline, compared on the same held-out test set. Values come from models/evaluation_results.json — nothing is estimated."
        actions={<RefreshButton onClick={data.reload} busy={data.loading} />}
      />
      <Loaded state={data} label="Loading model results…" title="Model results unavailable">
        {(result) => {
          const sorted = [...result.models].sort((a, b) => (b.metrics[sortBy] ?? -1) - (a.metrics[sortBy] ?? -1));
          const test = result.models[0]?.training;
          return (
            <>
              <InlineAlert tone="info">
                No model is labelled “best” here: each metric measures something different, and on this imbalanced dataset the model with the highest accuracy detects no fraud at all. Choose the metric that matters and compare.
              </InlineAlert>

              <Card className="flush" title="All models, all metrics" subtitle={`Sorted by ${METRICS.find((item) => item.key === sortBy)?.label} · test set of ${test?.testRows?.toLocaleString() ?? '—'} applications · decision threshold ${test?.threshold ?? '—'}`}
                actions={<Tabs label="Sort by metric" value={sortBy} onChange={setSortBy} options={METRICS.map(({ key, label }) => ({ value: key, label }))} />}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        {METRICS.map(({ key, label }) => <th key={key} className={`num ${key === sortBy ? 'col-active' : ''}`}>{label}</th>)}
                        <th>Saved model file</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((model) => (
                        <tr key={model.name} className="clickable" onClick={() => navigate(`/technical/performance?model=${model.name}`)}>
                          <td>
                            {model.label}
                            {model.selected && <> <span className="badge purple" title={result.selectionRule}>Selected by pipeline</span></>}
                            <div className="muted small">{model.family ?? 'Not available'}</div>
                          </td>
                          {METRICS.map(({ key }) => {
                            const best = result.bestByMetric[key];
                            const isTop = best !== null && model.metrics[key] === best.value;
                            return <td key={key} className={`num ${key === sortBy ? 'col-active' : ''}`}>{isTop ? <b title="Highest value for this metric">{metricText(key, model.metrics[key])}</b> : metricText(key, model.metrics[key])}</td>;
                          })}
                          <td>{model.artifactAvailable ? <span className="badge risk-low">Available</span> : <span className="badge neutral" title="No .joblib file in models/">Not available</span>}</td>
                          <td><button type="button" className="btn btn-secondary btn-sm" onClick={(event) => { event.stopPropagation(); navigate(`/technical/performance?model=${model.name}`); }}>Details <ArrowRight size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted small" style={{ padding: '10px 16px 14px' }}>Bold = highest value for that metric. {result.selectionRule}</p>
              </Card>

              <div className="grid-3">
                {METRICS.filter(({ key }) => key !== 'prAuc').map(({ key, label }) => (
                  <Card key={key} title={label} subtitle={result.metricNotes[key]}>
                    <HBarChart max={1} format={(value) => metricText(key, value)} data={result.models.map((model) => ({ label: model.label, value: model.metrics[key] ?? 0 }))} />
                  </Card>
                ))}
                <Card title="PR-AUC" subtitle={result.metricNotes.prAuc}>
                  <HBarChart max={Math.max(...result.models.map((model) => model.metrics.prAuc ?? 0)) * 1.25 || 1} format={(value) => metricText('prAuc', value)} data={result.models.map((model) => ({ label: model.label, value: model.metrics.prAuc ?? 0 }))} />
                  <p className="muted small" style={{ marginTop: 8 }}>Scale zoomed to the observed range.</p>
                </Card>
              </div>

              <Card title="Confusion matrices" subtitle="Rows are the actual class, columns the predicted class">
                <div className="cm-grid">
                  {result.models.map((model) => (
                    <div key={model.name}>
                      <h3 style={{ marginBottom: 8 }}>{model.label}</h3>
                      <ConfusionMatrix matrix={model.confusionMatrix} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flush" title="Training and prediction information">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Model</th><th className="num">Training rows</th><th className="num">Test rows</th><th className="num">Training time</th><th className="num">Predicted as fraud</th><th className="num">Actual fraud in test</th><th className="num">Specificity</th><th>Live scoring</th></tr></thead>
                    <tbody>
                      {result.models.map((model) => (
                        <tr key={model.name}>
                          <td>{model.label}</td>
                          <td className="num">{model.training.trainRows?.toLocaleString() ?? 'Not available'}</td>
                          <td className="num">{model.training.testRows?.toLocaleString() ?? 'Not available'}</td>
                          <td className="num">{model.training.trainingSeconds === null ? 'Not available' : `${model.training.trainingSeconds.toFixed(2)} s`}</td>
                          <td className="num">{model.derived.predictedFraud ?? 'Not available'}</td>
                          <td className="num">{model.derived.actualFraud ?? 'Not available'}</td>
                          <td className="num">{model.derived.specificity === null ? 'Not available' : `${(model.derived.specificity * 100).toFixed(1)}%`}</td>
                          <td>{result.liveScoringModel === model.name ? <span className="badge purple">In use</span> : <span className="muted">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted small" style={{ padding: '10px 16px 14px' }}>{test?.split}. {test?.resampling}. “Live scoring” is the model that scores new portal applications.</p>
              </Card>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
