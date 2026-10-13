import { getTechModel, getTechModels } from '../../services/technicalApi';
import { CurveChart, HBarChart } from '../../charts';
import { Route, useQueryState } from '../../lib/router';
import { Card, InlineAlert, Kpi, PageHeader, useAsync } from '../../ui';
import { ConfusionMatrix } from './ModelComparisonPage';
import { Loaded, METRICS, Tabs, metricText } from './shared';

const IMPORTANCE_TITLE = {
  tree_importance: 'Global feature importance (tree-based)',
  abs_coefficient: 'Global feature influence (absolute coefficient)',
  not_available: 'Global feature importance',
};

export function ModelPerformancePage({ route }: { route: Route }) {
  const list = useAsync(() => getTechModels(), []);
  const [query, update] = useQueryState(route, { model: '' });
  const selected = query.model || list.data?.selectedModel || list.data?.models[0]?.name || '';
  const detail = useAsync(() => (selected ? getTechModel(selected) : Promise.reject(new Error('No model selected'))), [selected]);
  return (
    <>
      <PageHeader title="Model Performance" description="Detailed evaluation of one model on the held-out test set." />
      <Loaded state={list} label="Loading models…" title="Model results unavailable">
        {(models) => (
          <>
            <Tabs label="Model" value={selected} onChange={(model) => update({ model })} options={models.models.map((model) => ({ value: model.name, label: model.label }))} />
            {selected && (
              <Loaded state={detail} label="Loading model detail…" title="Unable to load this model">
                {(model) => (
                  <>
                    <div className="kpis" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                      {METRICS.map(({ key, label }) => <Kpi key={key} label={label} value={metricText(key, model.metrics[key])} />)}
                    </div>

                    <div className="grid-2">
                      <Card title="Confusion matrix" subtitle={`Test set: ${model.training.testRows?.toLocaleString() ?? 'Not available'} applications · threshold ${model.training.threshold}`}>
                        <ConfusionMatrix matrix={model.confusionMatrix} />
                        <dl className="dl" style={{ marginTop: 14 }}>
                          <div><dt>Predicted as fraud</dt><dd>{model.derived.predictedFraud ?? 'Not available'}</dd></div>
                          <div><dt>Actual fraud cases</dt><dd>{model.derived.actualFraud ?? 'Not available'}</dd></div>
                          <div><dt>Specificity (true negative rate)</dt><dd>{model.derived.specificity === null ? 'Not available' : `${(model.derived.specificity * 100).toFixed(2)}%`}</dd></div>
                          <div><dt>False positive rate</dt><dd>{model.derived.falsePositiveRate === null ? 'Not available' : `${(model.derived.falsePositiveRate * 100).toFixed(2)}%`}</dd></div>
                        </dl>
                      </Card>
                      <Card title="Model and training information">
                        <dl className="dl">
                          <div><dt>Model type</dt><dd>{model.label}</dd></div>
                          <div><dt>Family</dt><dd>{model.family ?? 'Not available'}</dd></div>
                          <div><dt>Estimator class</dt><dd className="mono">{model.estimatorClass ?? 'Not available'}</dd></div>
                          <div><dt>Saved model file</dt><dd>{model.artifactAvailable ? 'Available' : 'Not available'}</dd></div>
                          <div><dt>Input features</dt><dd>{model.inputFeatures}</dd></div>
                          <div><dt>Features after encoding</dt><dd>{model.encodedFeatures ?? 'Not available'}</dd></div>
                          <div><dt>Training rows</dt><dd>{model.training.trainRows?.toLocaleString() ?? 'Not available'}</dd></div>
                          <div><dt>Training time</dt><dd>{model.training.trainingSeconds === null ? 'Not available' : `${model.training.trainingSeconds.toFixed(3)} s`}</dd></div>
                          <div className="span-2"><dt>Evaluation</dt><dd>{model.training.split}. {model.training.resampling}.</dd></div>
                          <div className="span-2"><dt>Used for live scoring</dt><dd>{model.usedForLiveScoring ? 'Yes — scores new portal applications' : 'No'}</dd></div>
                        </dl>
                        <h3 style={{ margin: '16px 0 8px' }}>Hyper-parameters</h3>
                        {model.parameters ? (
                          <div className="chips">{Object.entries(model.parameters).map(([key, value]) => <span className="badge neutral" key={key}>{key} = {String(value)}</span>)}</div>
                        ) : (
                          <p className="muted">Not available (no saved model file to read them from).</p>
                        )}
                      </Card>
                    </div>

                    <div className="grid-2">
                      <Card title="ROC curve" subtitle={`ROC-AUC ${metricText('rocAuc', model.metrics.rocAuc)} · dashed line = random classifier`}>
                        {model.rocCurve?.length ? <CurveChart ariaLabel="ROC curve" points={model.rocCurve} xKey="fpr" yKey="tpr" xLabel="False positive rate" yLabel="True positive rate" diagonal /> : <p className="muted">Not available</p>}
                      </Card>
                      <Card title="Precision-recall curve" subtitle={`PR-AUC ${metricText('prAuc', model.metrics.prAuc)}`}>
                        {model.precisionRecallCurve?.length ? <CurveChart ariaLabel="Precision-recall curve" points={model.precisionRecallCurve} xKey="recall" yKey="precision" xLabel="Recall" yLabel="Precision" /> : <p className="muted">Not available</p>}
                      </Card>
                    </div>

                    <Card title={IMPORTANCE_TITLE[model.importanceKind]} subtitle="Describes the model as a whole">
                      <InlineAlert tone="info">
                        <strong>Global feature importance is not an individual application explanation.</strong> It shows which inputs the model relies on overall. It does not say why a specific applicant received a particular fraud probability; per-application explanations are not implemented.
                      </InlineAlert>
                      <div style={{ marginTop: 14 }}>
                        {model.featureImportance?.length ? (
                          <HBarChart format={(value) => value.toFixed(3)} data={model.featureImportance.slice(0, 12).map((item) => ({ label: item.feature.replace('_', ' = '), value: item.importance }))} />
                        ) : (
                          <p className="muted">Not available — {model.label} does not provide feature importance.</p>
                        )}
                      </div>
                      {model.coefficients && (
                        <>
                          <h3 style={{ margin: '18px 0 8px' }}>Signed coefficients</h3>
                          <p className="muted small" style={{ marginBottom: 8 }}>Read from the saved model. Positive values push the prediction towards fraud, negative towards genuine (inputs are standardised / one-hot encoded).</p>
                          <div className="table-wrap">
                            <table>
                              <thead><tr><th>Encoded feature</th><th className="num">Coefficient</th><th>Direction</th></tr></thead>
                              <tbody>
                                {model.coefficients.map((item) => (
                                  <tr key={item.feature}><td className="mono">{item.feature}</td><td className="num">{item.coefficient.toFixed(4)}</td><td>{item.coefficient >= 0 ? 'Towards fraud' : 'Towards genuine'}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </Card>

                    <Card title="Limitations" subtitle="Derived from this model's measured results">
                      <ul className="plain-list">{model.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                    </Card>
                  </>
                )}
              </Loaded>
            )}
          </>
        )}
      </Loaded>
    </>
  );
}
