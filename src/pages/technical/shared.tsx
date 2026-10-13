import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { MetricKey, SourceInfo } from '../../services/technicalApi';
import { Card, ErrorState, InlineAlert, LoadingState } from '../../ui';

export const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1 Score' },
  { key: 'rocAuc', label: 'ROC-AUC' },
  { key: 'prAuc', label: 'PR-AUC' },
];
const PERCENT_METRICS: MetricKey[] = ['accuracy', 'precision', 'recall', 'f1'];

export const NA = <span className="muted">Not available</span>;

export function metricText(key: MetricKey, value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not available';
  return PERCENT_METRICS.includes(key) ? `${(value * 100).toFixed(1)}%` : value.toFixed(4);
}

export const num = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined ? 'Not available' : value.toLocaleString('en-IN', { maximumFractionDigits: digits });

/** Renders loading / error / content for one async resource. */
export function Loaded<T>({ state, label, title, children }: { state: { data: T | null; error: string; loading: boolean; reload: () => void }; label?: string; title?: string; children: (data: T) => ReactNode }) {
  if (state.error) return <Card><ErrorState title={title ?? 'Unable to load data'} message={state.error} onRetry={state.reload} /></Card>;
  if (!state.data) return <Card><LoadingState label={label ?? 'Loading…'} /></Card>;
  return <>{children(state.data)}</>;
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return <button type="button" className="btn btn-secondary" onClick={onClick} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Refresh</button>;
}

/** Says where the dataset in memory came from; warns when the SheetDB source could not be reached. */
export function SourceNote({ source }: { source: SourceInfo | null | undefined }) {
  if (!source) return null;
  if (source.warning) return <InlineAlert tone="warning"><strong>Data source:</strong> {source.warning} Figures below are calculated from that copy.</InlineAlert>;
  return <p className="muted small">Data source in use: {source.inUse}.</p>;
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button type="button" role="tab" aria-selected={value === option.value} key={option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}
