import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ModelResponse, getModels } from '../../services/backendApi';
import { percent, pretty, modelLabel } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Card, ErrorState, LoadingState, PageHeader, useAsync } from '../../ui';

function Curve({ points, xKey, yKey, title, xLabel }: { points: Record<string, number>[]; xKey: string; yKey: string; title: string; xLabel: string }) {
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${(point[xKey] * 100).toFixed(1)} ${(100 - point[yKey] * 100).toFixed(1)}`).join(' ');
  return (
    <div className="curve">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}>
        <path d="M 0 100 L 100 0" className="baseline" />
        <path d={path} className="curve-line" />
      </svg>
      <div className="axis"><span>0</span><span>{xLabel}</span><span>1</span></div>
    </div>
  );
}

// Academic view of the trained models (kept out of the bank-officer navigation; reachable from Settings).
export function ModelLabPage() {
  const data = useAsync(() => getModels(), []);
  return (
    <>
      <div className="breadcrumb"><button type="button" onClick={() => navigate('/admin/settings')}><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Settings</button><span>/</span><span>Model Lab</span></div>
      <PageHeader title="Model Lab" description="Measured evaluation of each classifier on the untouched test set. SMOTE is applied only inside the training pipeline after the stratified split." />
      {data.error ? <Card><ErrorState title="Model results unavailable" message={data.error} onRetry={data.reload} /></Card> : !data.data ? <Card><LoadingState /></Card> : <Lab response={data.data} />}
    </>
  );
}

function Lab({ response }: { response: ModelResponse }) {
  const [selected, setSelected] = useState(response.selectedModel ?? Object.keys(response.models)[0]);
  const metric = response.models[selected] ?? Object.values(response.models)[0];
  return (
    <>
      <Card className="flush" title="Compare classifiers" subtitle="Select a row to inspect that model.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Algorithm</th><th className="num">Accuracy</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">ROC-AUC</th><th className="num">PR-AUC</th></tr></thead>
            <tbody>
              {Object.entries(response.models).map(([key, value]) => (
                <tr key={key} className={`clickable ${key === selected ? 'selected' : ''}`} onClick={() => setSelected(key)} aria-selected={key === selected}>
                  <td>{modelLabel(key)} {key === response.selectedModel && <span className="badge purple">Selected</span>}</td>
                  <td className="num">{percent(value.accuracy)}</td>
                  <td className="num">{percent(value.precision)}</td>
                  <td className="num">{percent(value.recall)}</td>
                  <td className="num">{percent(value.f1)}</td>
                  <td className="num">{value.rocAuc.toFixed(4)}</td>
                  <td className="num">{value.prAuc.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid-2">
        <Card title={`${modelLabel(selected)} — confusion matrix`} subtitle="Test records">
          <div className="confusion">
            <div><small>True negative</small><b>{metric.confusionMatrix.tn}</b></div>
            <div><small>False positive</small><b>{metric.confusionMatrix.fp}</b></div>
            <div><small>False negative</small><b>{metric.confusionMatrix.fn}</b></div>
            <div><small>True positive</small><b>{metric.confusionMatrix.tp}</b></div>
          </div>
        </Card>
        <Card title="Feature importance" subtitle="Global model signal">
          <div className="factor-list">
            {metric.featureImportance.slice(0, 8).map((item) => (
              <div className="factor" key={item.feature}>
                <span>{item.feature}</span>
                <div className="bar"><i style={{ width: `${Math.max(2, (item.importance / Math.max(...metric.featureImportance.map((f) => f.importance), 0.0001)) * 100)}%` }} /></div>
                <b>{item.importance.toFixed(3)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid-2">
        <Card><Curve title="ROC curve" points={metric.rocCurve} xKey="fpr" yKey="tpr" xLabel="False positive rate" /></Card>
        <Card><Curve title="Precision-recall curve" points={metric.precisionRecallCurve} xKey="recall" yKey="precision" xLabel="Recall" /></Card>
      </div>
    </>
  );
}
