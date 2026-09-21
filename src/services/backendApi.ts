export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type GroupMetric = { label: string; total: number; fraud: number; fraudRate: number };
export type DatasetSummary = {
  rows: number;
  columns: number;
  columnNames: string[];
  numericalColumns: string[];
  categoricalColumns: string[];
  missingValues: Record<string, number>;
  fraudCount: number;
  genuineCount: number;
  source: string;
};
export type Overview = {
  totalApplications: number;
  fraudulentApplications: number;
  genuineApplications: number;
  fraudRate: number;
  averageLoanAmount: number;
  averageCibilScore: number | null;
  byLoanType: GroupMetric[];
  byEmployment: GroupMetric[];
  byGender: GroupMetric[];
  byAgeGroup: GroupMetric[];
  byMonth: GroupMetric[];
};
export type EdaResponse = {
  correlations: { feature: string; value: number }[];
  distributions: Record<string, { range: string; count: number; fraudRate: number }[]>;
  byLoanType: GroupMetric[];
  byEmployment: GroupMetric[];
};
export type ModelMetric = {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  prAuc: number;
  trainingSeconds: number;
  confusionMatrix: { tn: number; fp: number; fn: number; tp: number };
  rocCurve: { fpr: number; tpr: number }[];
  precisionRecallCurve: { precision: number; recall: number }[];
  featureImportance: { feature: string; importance: number }[];
};
export type ModelResponse = { models: Record<string, ModelMetric>; selectedModel?: string };
export type RecordRow = Record<string, string | number>;
export type RecordsResponse = { total: number; page: number; pageSize: number; records: RecordRow[] };
export type Prediction = {
  model: string;
  fraudProbability: number;
  prediction: 0 | 1;
  classification: 'Genuine' | 'Fraud';
  featureImportance: { feature: string; importance: number }[];
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const getDatasetSummary = () => get<DatasetSummary>('/dataset-summary');
export const getOverview = () => get<Overview>('/analytics/overview');
export const getEda = () => get<EdaResponse>('/analytics/eda');
export const getModels = () => get<ModelResponse>('/models');
export const getRecords = (page: number, search: string, fraud: string, loanType: string, employment: string) =>
  get<RecordsResponse>(`/records?page=${page}&page_size=20&search=${encodeURIComponent(search)}&fraud=${encodeURIComponent(fraud)}&loan_type=${encodeURIComponent(loanType)}&employment=${encodeURIComponent(employment)}`);
export const postPrediction = (payload: Record<string, string | number>) =>
  fetch(`${API_BASE}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(async (response) => {
    if (!response.ok) throw new Error((await response.text()) || `${response.status} ${response.statusText}`);
    return response.json() as Promise<Prediction>;
  });
