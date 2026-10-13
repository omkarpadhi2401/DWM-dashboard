import { request } from './backendApi';

// Types for the ADMIN / technical panel API (/technical/*). All values are computed by the backend
// from the loaded dataset, the saved models and models/evaluation_results.json.

export type SourceInfo = { configured: string; configuredUrl: string; inUse: string; kind: 'sheetdb' | 'local_csv' | null; loadedAt: string | null; warning: string | null };
export type ColumnInfo = { name: string; type: 'integer' | 'decimal' | 'text' | 'date'; storageType: string; missing: number; unique: number; example: string | null; role: string };
export type NumericSummary = { column: string; count: number; mean: number | null; std: number | null; min: number | null; q1: number | null; median: number | null; q3: number | null; max: number | null };
export type DatasetProfile = {
  rows: number; columns: number; cells: number; source: SourceInfo; missingCells: number; completeness: number | null;
  duplicateRows: number; duplicateApplicationIds: number | null; uniqueCustomers: number | null;
  numericalColumns: string[]; categoricalColumns: string[]; columnInfo: ColumnInfo[];
  fraud: { fraud: number; genuine: number; fraudRate: number };
  dateRange: { from: string | null; to: string | null; unparsed: number };
  numericSummary: NumericSummary[];
  categoricalSummary: { column: string; unique: number; values: { value: string; count: number; share: number }[] }[];
  modelFeatures: { all: string[]; numeric: string[]; categorical: string[] };
  hasCibil: boolean;
};
export type Histogram = { column: string; min: number; max: number; missing: number; bins: { from: number; to: number; count: number; fraudCount: number; fraudRate: number }[] };
export type Distributions = { loanAmount: Histogram | null; debtToIncome: Histogram | null; monthlyIncome: Histogram | null; age: Histogram | null; cibil: Histogram | null; cibilNote: string | null };

export type QualityStatus = 'healthy' | 'warning' | 'needs_attention';
export type QualityCheck = { key: string; title: string; status: QualityStatus; value: string; rule: string; note: string | null; details: { label: string; count: number; examples?: string[] }[] };
export type DataQuality = { rows: number; columns: number; checks: QualityCheck[]; summary: Record<QualityStatus, number>; source: SourceInfo };

export type OlapRow = { key: string; loanCount: number; fraudCount: number; fraudRate: number; totalLoanAmount: number; avgLoanAmount: number | null };
export type OlapTotal = Omit<OlapRow, 'key'>;
export type OlapSchema = {
  dimensions: { key: string; label: string; group: string; column: string; members: string[] }[];
  measures: { key: string; label: string }[]; hierarchy: string[]; factTable: string; grain: number; total: OlapTotal;
};
export type OlapResult = { groupBy: string; label: string; filters: Record<string, string>; rows: OlapRow[]; total: OlapTotal };
export type OlapPivot = {
  rows: string; cols: string; measure: string; measureLabel: string; filters: Record<string, string>;
  rowMembers: string[]; colMembers: string[]; cells: Record<string, Record<string, number | null>>;
  rowTotals: Record<string, number | null>; colTotals: Record<string, number | null>; grandTotal: number | null;
};

export type MetricKey = 'accuracy' | 'precision' | 'recall' | 'f1' | 'rocAuc' | 'prAuc';
export type TechModel = {
  name: string; label: string; family: string | null; selected: boolean; artifactAvailable: boolean;
  metrics: Record<MetricKey, number | null>;
  confusionMatrix: { tn: number; fp: number; fn: number; tp: number } | null;
  derived: { specificity: number | null; falsePositiveRate: number | null; predictedFraud: number | null; actualFraud: number | null };
  training: { trainingSeconds: number | null; testRows: number | null; trainRows: number | null; split: string; resampling: string; threshold: number };
  importanceKind: 'tree_importance' | 'abs_coefficient' | 'not_available';
};
export type TechModelDetail = TechModel & {
  estimatorClass: string | null; parameters: Record<string, string | number | boolean> | null; inputFeatures: number; encodedFeatures: number | null;
  featureImportance: { feature: string; importance: number }[] | null; coefficients: { feature: string; coefficient: number }[] | null;
  rocCurve: { fpr: number; tpr: number }[] | null; precisionRecallCurve: { precision: number; recall: number }[] | null;
  limitations: string[]; usedForLiveScoring: boolean;
};
export type TechModels = {
  models: TechModel[]; bestByMetric: Record<MetricKey, { value: number; models: string[] } | null>;
  selectedModel: string | null; selectionRule: string; liveScoringModel: string | null;
  evaluationDataset: { rows?: number; fraudCount?: number; genuineCount?: number; features?: string[]; source?: string };
  metricNotes: Record<MetricKey, string>;
};

export type FeatureAnalysis = {
  features: { name: string; kind: 'numeric' | 'categorical' }[]; target: string;
  correlations: { feature: string; correlation: number | null }[];
  numericComparison: { feature: string; fraudMean: number | null; genuineMean: number | null; fraudMedian: number | null; genuineMedian: number | null }[];
  categoricalBreakdown: { feature: string; values: OlapRow[] }[];
  importance: Record<string, { label: string; kind: TechModel['importanceKind']; values: { feature: string; importance: number }[] | null }>;
  note: string;
};

export type SystemInfo = {
  status: { backend: string; api: string; dataset: string; datasetError: string | null; models: string; database: string };
  uptimeSeconds: number; serverTime: string;
  dataset: { records: number | null; source: SourceInfo | null };
  models: { evaluated: string[]; artifacts: string[]; selected: string | null; liveScoring: string | null; riskBands: Record<string, [number, number]> };
  operationalStore: { engine: string; users: Record<string, number>; portalApplications: Record<string, number>; auditEvents: number };
  api: { endpoints: number; routes: { method: string; path: string; access: string }[] };
  versions: Record<string, string | null>;
  architecture: { layer: string; technology: string; detail: string }[];
  workflow: string[];
};

const qs = (params: Record<string, string | undefined>) =>
  Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');

export const getDatasetProfile = () => request<DatasetProfile>('/technical/dataset-profile');
export const getDistributions = () => request<Distributions>('/technical/distributions');
export const getDataQuality = () => request<DataQuality>('/technical/data-quality');
export const getOlapSchema = () => request<OlapSchema>('/technical/olap/schema');
export const getOlap = (groupBy: string, filters: Record<string, string>) => request<OlapResult>(`/technical/olap?${qs({ group_by: groupBy, ...filters })}`);
export const getOlapPivot = (rows: string, cols: string, measure: string, filters: Record<string, string>) =>
  request<OlapPivot>(`/technical/olap/pivot?${qs({ rows, cols, measure, ...filters })}`);
export const getTechModels = () => request<TechModels>('/technical/models');
export const getTechModel = (name: string) => request<TechModelDetail>(`/technical/models/${encodeURIComponent(name)}`);
export const getFeatureAnalysis = () => request<FeatureAnalysis>('/technical/features');
export const getSystemInfo = () => request<SystemInfo>('/technical/system');
