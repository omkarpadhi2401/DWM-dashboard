export type NavigationTab = 
  | 'overview' 
  | 'analytics' 
  | 'models' 
  | 'checker' 
  | 'explorer' 
  | 'reports' 
  | 'settings';

export type NavTab = NavigationTab;

export interface AppSettings {
  useLiveApi: boolean;
  sheetDbEndpoint: string;
  fraudProbabilityThreshold: number;
  alertOnFraudFlag: boolean;
  autoRejectHighRisk: boolean;
}

export interface LoanApplication {
  ApplicationID: string;
  CustomerID: string;
  ApplicantName: string;
  ApplicantAge: number;
  Gender: 'Male' | 'Female' | 'Other';
  EmploymentStatus: 'Salaried' | 'Self-Employed' | 'Small Business Owner' | 'Freelance / Gig' | 'Retired' | 'Unemployed';
  NumberDependents: number;
  LoanType: 'Personal' | 'Home' | 'Vehicle' | 'Business' | 'Education';
  PurposeOfLoan: string;
  ApplicationDate: string;
  DateKey: string;
  Day: number;
  Month: string;
  Quarter: string;
  Year: number;
  FraudFlag: 0 | 1;
  FraudType: 'None' | 'Synthetic Identity' | 'Income Inflation' | 'Collusion' | 'Default Risk' | 'Rapid Velocity';
  LoanStatus: 'Approved' | 'Under Review' | 'Rejected';
  PropertyOwnershipStatus: 'Owned' | 'Rented' | 'Mortgaged';
  ResidentialAddress: string;
  LoanAmountRequested: number;
  LoanTenureMonths: number;
  InterestRateOffered: number;
  MonthlyIncome: number;
  ExistingEMIs: number;
  DebtToIncomeRatio: number;
  CIBILScore: number;
  RiskProbability: number;
}

export interface KPIMetrics {
  totalApplications: number;
  genuineApplications: number;
  fraudulentApplications: number;
  fraudRate: number;
  avgLoanAmount: number; // In Lakhs
  avgGenuineAmount: number; // In Lakhs
  avgFraudAmount: number; // In Lakhs
  estFraudPreventedCr: number; // In Crores
}

export interface ModelMetric {
  id: string;
  name: string;
  badge: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  prAuc: number;
  inferenceMs: string;
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  description: string;
  features: { name: string; weight: number }[];
  rocPoints: { fpr: number; tpr: number }[];
}

export interface FraudAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'coral' | 'amber' | 'lime';
}

export interface PipelineActivity {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status: 'completed' | 'active' | 'scheduled';
}

export interface DataSourceConfig {
  mode: 'demo' | 'live';
  apiUrl: string;
  apiKey: string;
  fraudThreshold: number;
  smoteRatio: string;
  lastSyncTime: string;
  status: 'connected' | 'syncing' | 'error';
}

export interface CheckerFormState {
  applicantName: string;
  applicantAge: number;
  gender: 'Male' | 'Female' | 'Other';
  employmentStatus: 'Salaried' | 'Self-Employed' | 'Small Business Owner' | 'Freelance / Gig';
  numberDependents: number;
  loanType: 'Personal' | 'Home' | 'Vehicle' | 'Business';
  purposeOfLoan: string;
  loanAmountRequested: number;
  loanTenureMonths: number;
  interestRateOffered: number;
  monthlyIncome: number;
  existingEMIs: number;
  cibilScore: number;
  propertyOwnership: 'Owned' | 'Rented' | 'Mortgaged';
  loanStatus: 'Under Review' | 'Approved';
}

export interface PredictionResult {
  prediction: 'Genuine' | 'Fraud' | 'Review';
  fraudProbability: number;
  riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
  recommendation: string;
  dtiRatio: number;
  contributingFactors: {
    factor: string;
    impact: string;
    percentage: number;
    severity: 'coral' | 'amber' | 'lime';
  }[];
}
