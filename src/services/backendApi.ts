export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------- types
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
  byQuarter: GroupMetric[];
  byFraudType: { label: string; count: number }[];
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
export type ModelResponse = { models: Record<string, ModelMetric>; selectedModel?: string; availableModels: string[] };
export type RecordRow = Record<string, string | number>;
export type RecordsResponse = { total: number; page: number; pageSize: number; records: RecordRow[] };
export type Prediction = {
  model: string;
  fraudProbability: number;
  prediction: 0 | 1;
  classification: 'Genuine' | 'Fraud';
  riskLevel: RiskLevel;
  featureImportance: { feature: string; importance: number }[];
};

export type Role = 'customer' | 'officer' | 'admin';
export type User = { id: number; email: string; name: string; role: Role; customerId: string | null };
export type Session = { token: string; user: User };
export type Status = 'NEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type Application = {
  applicationId: string;
  customerId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  source: 'dataset' | 'portal';
  applicationDate: string | null;
  submittedAt: string | null;
  age: number;
  gender: string;
  dependents: number;
  address: string;
  employment: string;
  monthlyIncome: number;
  existingEmis: number;
  dti: number;
  propertyOwnership: string;
  cibilScore: number | null;
  loanType: string;
  purpose: string;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number;
  status: Status;
  historicalOutcome: string | null;
  recordedFraudFlag: number | null;
  recordedFraudType: string | null;
  analysisStatus: 'pending' | 'completed' | 'unavailable';
  analysisError?: string | null;
  fraudProbability: number | null;
  fraudPrediction: number | null;
  riskLevel: RiskLevel | null;
  modelName: string | null;
  fraudFlagged: boolean;
  decision: { status: Status; by: string; at: string; reason: string | null; note: string | null } | null;
  updatedAt: string | null;
};
export type TimelineEvent = {
  id: number;
  type: string;
  label: string;
  at: string | null;
  dateOnly?: boolean;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason: string | null;
  note: string | null;
  actorName: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
};
export type ApplicationDetail = {
  application: Application;
  timeline: TimelineEvent[];
  decisionHistory: TimelineEvent[];
  explanation: { globalFactors: { feature: string; importance: number }[]; applicationSpecific: null; message: string };
  allowedActions: ('approve' | 'reject' | 'review')[];
};
export type ApplicationList = { total: number; page: number; pageSize: number; items: Application[] };
export type ApplicationStats = {
  total: number; new: number; underReview: number; approved: number; rejected: number;
  fraudFlagged: number; fraudRate: number; averageLoanAmount: number; portalApplications: number; historicalApplications: number;
};
export type Reference = {
  genders: string[]; employment: string[]; loanTypes: string[]; purposes: string[]; propertyOwnership: string[];
  tenures: number[]; rejectionReasons: string[]; riskBands: Record<RiskLevel, [number, number]>;
};
export type Health = { status: string; datasetAvailable: boolean; modelsTrained: boolean; availableModels: string[]; officerConfigured: boolean; adminConfigured?: boolean };

export type CustomerApplication = {
  applicationId: string;
  applicationDate: string;
  loanType: string;
  purpose: string;
  loanAmount: number;
  tenureMonths: number;
  status: Status;
  updatedAt: string;
  rejectionReason: string | null;
  bankMessage: string | null;
  decidedAt: string | null;
  timeline?: { type: string; label: string; at: string; detail: string | null }[];
  details?: {
    applicantName: string; age: number; gender: string; dependents: number; address: string; employment: string;
    monthlyIncome: number; existingEmis: number; propertyOwnership: string; cibilScore: number | null; interestRate: number;
  };
  created?: boolean;
};
export type NewApplicationPayload = {
  applicantAge: number; gender: string; dependents: number; address: string; employment: string; monthlyIncome: number;
  existingEmis: number; propertyOwnership: string; cibilScore: number | null; loanType: string; purpose: string;
  loanAmount: number; tenureMonths: number; interestRate: number; idempotencyKey: string;
};

// ---------------------------------------------------------------- session storage
const SESSION_KEY = 'fraudguard.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: session lasts for this tab only */
  }
}

// ---------------------------------------------------------------- request helper
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function describeError(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          const loc = Array.isArray(item?.loc) ? item.loc.filter((part: unknown) => part !== 'body').join('.') : '';
          const msg = String(item?.msg ?? 'Invalid value').replace(/^Value error, /, '');
          return loc ? `${loc}: ${msg}` : msg;
        })
        .join('; ');
    }
  }
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return `Request failed (${status}).`;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = loadSession();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (session) headers.Authorization = `Bearer ${session.token}`;
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the FraudGuard API at ${API_BASE}. Check that the backend is running.`);
  }
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 401 && session) window.dispatchEvent(new CustomEvent('fraudguard:unauthorized'));
    throw new ApiError(response.status, describeError(response.status, body));
  }
  return response.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

// ---------------------------------------------------------------- endpoints
export const getHealth = () => request<Health>('/health');
export const getReference = () => request<Reference>('/reference');

export const signup = (name: string, email: string, password: string) =>
  request<Session>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
export const login = (email: string, password: string, portal: 'standard' | 'admin' = 'standard') =>
  request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, portal }) });
export const logout = () => request<{ status: string }>('/auth/logout', { method: 'POST' });
export const getMe = () => request<{ user: User }>('/auth/me');

export const getDatasetSummary = () => request<DatasetSummary>('/dataset-summary');
export const getOverview = () => request<Overview>('/analytics/overview');
export const getEda = () => request<EdaResponse>('/analytics/eda');
export const getModels = () => request<ModelResponse>('/models');
export const getRecords = (params: Record<string, string | number>) => request<RecordsResponse>(`/records?${qs(params)}`);
export const postPrediction = (payload: Record<string, string | number>) =>
  request<Prediction>('/predict', { method: 'POST', body: JSON.stringify(payload) });

export const getApplications = (params: Record<string, string | number>) => request<ApplicationList>(`/applications?${qs(params)}`);
export const getApplicationStats = () => request<ApplicationStats>('/applications/stats');
export const getApplication = (id: string) => request<ApplicationDetail>(`/applications/${encodeURIComponent(id)}`);
export const decideApplication = (id: string, body: { action: 'approve' | 'reject' | 'review'; reason?: string; note?: string; expectedStatus: Status }) =>
  request<ApplicationDetail>(`/applications/${encodeURIComponent(id)}/decision`, { method: 'POST', body: JSON.stringify(body) });
export const rerunAnalysis = (id: string) =>
  request<ApplicationDetail>(`/applications/${encodeURIComponent(id)}/analysis`, { method: 'POST' });

export const getMyApplications = () => request<{ items: CustomerApplication[] }>('/me/applications');
export const getMyApplication = (id: string) => request<CustomerApplication>(`/me/applications/${encodeURIComponent(id)}`);
export const submitApplication = (payload: NewApplicationPayload) =>
  request<CustomerApplication>('/me/applications', { method: 'POST', body: JSON.stringify(payload) });
