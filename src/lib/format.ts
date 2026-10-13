import type { RiskLevel, Status } from '../services/backendApi';

export const money = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `₹${Math.round(value).toLocaleString('en-IN')}`;

export const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;

export const pretty = (value: string) => value.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  if (value.length === 10) return formatDate(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABEL: Record<Status, string> = { NEW: 'New', UNDER_REVIEW: 'Under Review', APPROVED: 'Approved', REJECTED: 'Rejected' };
export const RISK_LABEL: Record<RiskLevel, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

export const applicantLabel = (name: string | null, customerId: string) => name || customerId;

const MODEL_LABELS: Record<string, string> = {
  xgboost: 'XGBoost', logistic_regression: 'Logistic Regression', decision_tree: 'Decision Tree',
  naive_bayes: 'Naive Bayes', random_forest: 'Random Forest',
};
export const modelLabel = (name: string | null | undefined) => (name ? MODEL_LABELS[name] ?? pretty(name) : '—');

// Portal applications carry a full UTC timestamp; show the date in the viewer's local time zone.
export const appDate = (app: { submittedAt: string | null; applicationDate: string | null }) => formatDate(app.submittedAt ?? app.applicationDate);
