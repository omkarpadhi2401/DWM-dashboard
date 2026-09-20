import { 
  LoanApplication, 
  KPIMetrics, 
  ModelMetric, 
  DataSourceConfig, 
  CheckerFormState, 
  PredictionResult, 
  FraudAlert, 
  PipelineActivity 
} from '../types';

export const DEFAULT_CONFIG: DataSourceConfig = {
  mode: 'demo',
  apiUrl: 'https://sheetdb.io/api/v1/jnveyifpbrsuy',
  apiKey: '',
  fraudThreshold: 8.0,
  smoteRatio: '1:1 (Synthetic 50/50)',
  lastSyncTime: '2 minutes ago',
  status: 'connected',
};

export const DEFAULT_KPIS: KPIMetrics = {
  totalApplications: 5000,
  genuineApplications: 4514,
  fraudulentApplications: 486,
  fraudRate: 9.72,
  avgLoanAmount: 4.82,
  avgGenuineAmount: 4.60,
  avgFraudAmount: 6.80,
  estFraudPreventedCr: 3.30,
};

export const MODELS_DATA: Record<string, ModelMetric> = {
  rf: {
    id: 'rf',
    name: 'Random Forest',
    badge: 'Active Champion',
    accuracy: 94.8,
    precision: 92.4,
    recall: 85.6,
    f1: 88.8,
    rocAuc: 0.962,
    prAuc: 0.894,
    inferenceMs: '14ms',
    tn: 885,
    fp: 18,
    fn: 14,
    tp: 83,
    description: 'Ensemble of 150 bootstrap aggregated decision trees with random feature subspace selection. Counterbalances class imbalance cleanly with SMOTE preprocessed data.',
    features: [
      { name: 'CIBIL Credit Score', weight: 0.28 },
      { name: 'Debt-to-Income (DTI)', weight: 0.24 },
      { name: 'Loan Amount / Income Ratio', weight: 0.18 },
      { name: 'Employment Stability', weight: 0.14 },
      { name: 'Applicant Age Bracket', weight: 0.10 },
      { name: 'Existing EMI Count', weight: 0.06 },
    ],
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.02, tpr: 0.72 },
      { fpr: 0.04, tpr: 0.85 },
      { fpr: 0.08, tpr: 0.93 },
      { fpr: 0.15, tpr: 0.97 },
      { fpr: 0.30, tpr: 0.99 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
  xgb: {
    id: 'xgb',
    name: 'XGBoost',
    badge: 'High Precision',
    accuracy: 95.1,
    precision: 93.6,
    recall: 84.1,
    f1: 88.6,
    rocAuc: 0.965,
    prAuc: 0.901,
    inferenceMs: '18ms',
    tn: 889,
    fp: 14,
    fn: 16,
    tp: 81,
    description: 'Gradient boosted decision trees optimizing pseudo-residual loss with L1/L2 shrinkage. Delivers the lowest false-alarm rate across retail portfolios.',
    features: [
      { name: 'Debt-to-Income (DTI)', weight: 0.31 },
      { name: 'CIBIL Credit Score', weight: 0.26 },
      { name: 'Stated Monthly Income', weight: 0.17 },
      { name: 'Loan Amount Requested', weight: 0.14 },
      { name: 'Employment Status', weight: 0.08 },
      { name: 'Application Hour Velocity', weight: 0.04 },
    ],
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.015, tpr: 0.70 },
      { fpr: 0.035, tpr: 0.84 },
      { fpr: 0.07, tpr: 0.94 },
      { fpr: 0.14, tpr: 0.98 },
      { fpr: 0.28, tpr: 0.99 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
  lr: {
    id: 'lr',
    name: 'Logistic Regression',
    badge: 'Baseline Linear',
    accuracy: 89.2,
    precision: 79.5,
    recall: 72.3,
    f1: 75.7,
    rocAuc: 0.884,
    prAuc: 0.742,
    inferenceMs: '4ms',
    tn: 840,
    fp: 63,
    fn: 27,
    tp: 70,
    description: 'Standard L2 regularized logistic regression baseline. Fast inference, though struggles to detect subtle non-linear multi-attribute fraud rings without manual interaction terms.',
    features: [
      { name: 'CIBIL Credit Score', weight: 0.38 },
      { name: 'Loan Amount Requested', weight: 0.26 },
      { name: 'Monthly Income', weight: 0.20 },
      { name: 'Debt-to-Income Ratio', weight: 0.16 },
    ],
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.08, tpr: 0.55 },
      { fpr: 0.15, tpr: 0.72 },
      { fpr: 0.25, tpr: 0.83 },
      { fpr: 0.40, tpr: 0.90 },
      { fpr: 0.65, tpr: 0.96 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
  dt: {
    id: 'dt',
    name: 'Decision Tree',
    badge: 'Interpretable Tree',
    accuracy: 90.6,
    precision: 81.2,
    recall: 80.4,
    f1: 80.8,
    rocAuc: 0.892,
    prAuc: 0.781,
    inferenceMs: '6ms',
    tn: 852,
    fp: 51,
    fn: 19,
    tp: 78,
    description: 'Single CART decision tree with cost-complexity pruning. Offers transparent, regulatory-compliant human-readable split rules.',
    features: [
      { name: 'CIBIL Credit Score', weight: 0.35 },
      { name: 'Debt-to-Income (DTI)', weight: 0.28 },
      { name: 'Loan Purpose', weight: 0.22 },
      { name: 'Applicant Age', weight: 0.15 },
    ],
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.06, tpr: 0.60 },
      { fpr: 0.12, tpr: 0.76 },
      { fpr: 0.22, tpr: 0.85 },
      { fpr: 0.38, tpr: 0.92 },
      { fpr: 0.60, tpr: 0.97 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
  nb: {
    id: 'nb',
    name: 'Naive Bayes',
    badge: 'Probabilistic',
    accuracy: 86.4,
    precision: 71.0,
    recall: 76.5,
    f1: 73.6,
    rocAuc: 0.841,
    prAuc: 0.698,
    inferenceMs: '5ms',
    tn: 810,
    fp: 93,
    fn: 23,
    tp: 74,
    description: 'Gaussian Naive Bayes classifier applying conditional independence assumptions across continuous financial indicators. Provides an initial probabilistic benchmark.',
    features: [
      { name: 'Loan Amount Requested', weight: 0.33 },
      { name: 'CIBIL Credit Score', weight: 0.30 },
      { name: 'Debt-to-Income Ratio', weight: 0.22 },
      { name: 'Applicant Age', weight: 0.15 },
    ],
    rocPoints: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.10, tpr: 0.50 },
      { fpr: 0.20, tpr: 0.68 },
      { fpr: 0.32, tpr: 0.78 },
      { fpr: 0.50, tpr: 0.87 },
      { fpr: 0.75, tpr: 0.94 },
      { fpr: 1.0, tpr: 1.0 },
    ],
  },
};

export const DEMO_APPLICATIONS: LoanApplication[] = [
  {
    ApplicationID: 'APP0001',
    CustomerID: 'CUST0001',
    ApplicantName: 'Aarav Mehta',
    ApplicantAge: 34,
    Gender: 'Male',
    EmploymentStatus: 'Salaried',
    NumberDependents: 2,
    LoanType: 'Personal',
    PurposeOfLoan: 'Home Renovation',
    ApplicationDate: '12-12-2024',
    DateKey: '20241212',
    Day: 12,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'Andheri West, Mumbai, MH',
    LoanAmountRequested: 450000,
    LoanTenureMonths: 36,
    InterestRateOffered: 11.5,
    MonthlyIncome: 65000,
    ExistingEMIs: 12000,
    DebtToIncomeRatio: 0.18,
    CIBILScore: 740,
    RiskProbability: 0.06,
  },
  {
    ApplicationID: 'APP0002',
    CustomerID: 'CUST0002',
    ApplicantName: 'Pooja Hegde',
    ApplicantAge: 28,
    Gender: 'Female',
    EmploymentStatus: 'Salaried',
    NumberDependents: 0,
    LoanType: 'Home',
    PurposeOfLoan: 'First Apartment Purchase',
    ApplicationDate: '12-12-2024',
    DateKey: '20241212',
    Day: 12,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Rented',
    ResidentialAddress: 'Whitefield, Bengaluru, KA',
    LoanAmountRequested: 2500000,
    LoanTenureMonths: 180,
    InterestRateOffered: 8.4,
    MonthlyIncome: 115000,
    ExistingEMIs: 18000,
    DebtToIncomeRatio: 0.16,
    CIBILScore: 785,
    RiskProbability: 0.04,
  },
  {
    ApplicationID: 'APP0003',
    CustomerID: 'CUST0003',
    ApplicantName: 'Devendra Joshi',
    ApplicantAge: 41,
    Gender: 'Male',
    EmploymentStatus: 'Self-Employed',
    NumberDependents: 3,
    LoanType: 'Business',
    PurposeOfLoan: 'Inventory Expansion',
    ApplicationDate: '11-12-2024',
    DateKey: '20241211',
    Day: 11,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 1,
    FraudType: 'Synthetic Identity',
    LoanStatus: 'Under Review',
    PropertyOwnershipStatus: 'Rented',
    ResidentialAddress: 'Civil Lines, Jaipur, RJ',
    LoanAmountRequested: 1000000,
    LoanTenureMonths: 48,
    InterestRateOffered: 15.2,
    MonthlyIncome: 35000,
    ExistingEMIs: 24000,
    DebtToIncomeRatio: 0.69,
    CIBILScore: 510,
    RiskProbability: 0.89,
  },
  {
    ApplicationID: 'APP0004',
    CustomerID: 'CUST0004',
    ApplicantName: 'Rohan Kulkarni',
    ApplicantAge: 37,
    Gender: 'Male',
    EmploymentStatus: 'Salaried',
    NumberDependents: 1,
    LoanType: 'Vehicle',
    PurposeOfLoan: 'Electric Car Financing',
    ApplicationDate: '11-12-2024',
    DateKey: '20241211',
    Day: 11,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'Kothrud, Pune, MH',
    LoanAmountRequested: 800000,
    LoanTenureMonths: 60,
    InterestRateOffered: 9.1,
    MonthlyIncome: 78000,
    ExistingEMIs: 15000,
    DebtToIncomeRatio: 0.19,
    CIBILScore: 710,
    RiskProbability: 0.08,
  },
  {
    ApplicationID: 'APP0005',
    CustomerID: 'CUST0005',
    ApplicantName: 'Vikas Singhania',
    ApplicantAge: 52,
    Gender: 'Male',
    EmploymentStatus: 'Small Business Owner',
    NumberDependents: 2,
    LoanType: 'Personal',
    PurposeOfLoan: 'Debt Consolidation',
    ApplicationDate: '10-12-2024',
    DateKey: '20241210',
    Day: 10,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 1,
    FraudType: 'Income Inflation',
    LoanStatus: 'Rejected',
    PropertyOwnershipStatus: 'Mortgaged',
    ResidentialAddress: 'Salt Lake, Kolkata, WB',
    LoanAmountRequested: 650000,
    LoanTenureMonths: 36,
    InterestRateOffered: 14.8,
    MonthlyIncome: 28000,
    ExistingEMIs: 21000,
    DebtToIncomeRatio: 0.75,
    CIBILScore: 490,
    RiskProbability: 0.92,
  },
  {
    ApplicationID: 'APP0006',
    CustomerID: 'CUST0006',
    ApplicantName: 'Ananya Iyer',
    ApplicantAge: 29,
    Gender: 'Female',
    EmploymentStatus: 'Salaried',
    NumberDependents: 0,
    LoanType: 'Education',
    PurposeOfLoan: 'Executive MBA Tuition',
    ApplicationDate: '10-12-2024',
    DateKey: '20241210',
    Day: 10,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'T Nagar, Chennai, TN',
    LoanAmountRequested: 1500000,
    LoanTenureMonths: 60,
    InterestRateOffered: 9.5,
    MonthlyIncome: 92000,
    ExistingEMIs: 14000,
    DebtToIncomeRatio: 0.15,
    CIBILScore: 760,
    RiskProbability: 0.05,
  },
  {
    ApplicationID: 'APP0007',
    CustomerID: 'CUST0007',
    ApplicantName: 'Kunal Deshmukh',
    ApplicantAge: 23,
    Gender: 'Male',
    EmploymentStatus: 'Freelance / Gig',
    NumberDependents: 0,
    LoanType: 'Personal',
    PurposeOfLoan: 'Personal Equipment',
    ApplicationDate: '09-12-2024',
    DateKey: '20241209',
    Day: 9,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 1,
    FraudType: 'Synthetic Identity',
    LoanStatus: 'Under Review',
    PropertyOwnershipStatus: 'Rented',
    ResidentialAddress: 'Banjara Hills, Hyderabad, TS',
    LoanAmountRequested: 520000,
    LoanTenureMonths: 24,
    InterestRateOffered: 16.0,
    MonthlyIncome: 24000,
    ExistingEMIs: 15000,
    DebtToIncomeRatio: 0.63,
    CIBILScore: 540,
    RiskProbability: 0.86,
  },
  {
    ApplicationID: 'APP0008',
    CustomerID: 'CUST0008',
    ApplicantName: 'Deepak Chawla',
    ApplicantAge: 46,
    Gender: 'Male',
    EmploymentStatus: 'Salaried',
    NumberDependents: 2,
    LoanType: 'Home',
    PurposeOfLoan: 'Villa Extension',
    ApplicationDate: '08-12-2024',
    DateKey: '20241208',
    Day: 8,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'Vasant Vihar, New Delhi, DL',
    LoanAmountRequested: 4200000,
    LoanTenureMonths: 144,
    InterestRateOffered: 8.6,
    MonthlyIncome: 180000,
    ExistingEMIs: 32000,
    DebtToIncomeRatio: 0.18,
    CIBILScore: 810,
    RiskProbability: 0.03,
  },
  {
    ApplicationID: 'APP0009',
    CustomerID: 'CUST0009',
    ApplicantName: 'Simran Kaur',
    ApplicantAge: 31,
    Gender: 'Female',
    EmploymentStatus: 'Small Business Owner',
    NumberDependents: 1,
    LoanType: 'Vehicle',
    PurposeOfLoan: 'Commercial Van Purchase',
    ApplicationDate: '07-12-2024',
    DateKey: '20241207',
    Day: 7,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'Model Town, Ludhiana, PB',
    LoanAmountRequested: 620000,
    LoanTenureMonths: 48,
    InterestRateOffered: 10.2,
    MonthlyIncome: 58000,
    ExistingEMIs: 11000,
    DebtToIncomeRatio: 0.19,
    CIBILScore: 690,
    RiskProbability: 0.12,
  },
  {
    ApplicationID: 'APP0010',
    CustomerID: 'CUST0010',
    ApplicantName: 'Tanmay Bhatia',
    ApplicantAge: 25,
    Gender: 'Male',
    EmploymentStatus: 'Self-Employed',
    NumberDependents: 0,
    LoanType: 'Personal',
    PurposeOfLoan: 'Crypto Trading Speculation',
    ApplicationDate: '06-12-2024',
    DateKey: '20241206',
    Day: 6,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 1,
    FraudType: 'Rapid Velocity',
    LoanStatus: 'Rejected',
    PropertyOwnershipStatus: 'Rented',
    ResidentialAddress: 'Sector 62, Noida, UP',
    LoanAmountRequested: 750000,
    LoanTenureMonths: 36,
    InterestRateOffered: 15.5,
    MonthlyIncome: 25000,
    ExistingEMIs: 17000,
    DebtToIncomeRatio: 0.68,
    CIBILScore: 510,
    RiskProbability: 0.94,
  },
  {
    ApplicationID: 'APP0011',
    CustomerID: 'CUST0011',
    ApplicantName: 'Meera Nair',
    ApplicantAge: 39,
    Gender: 'Female',
    EmploymentStatus: 'Salaried',
    NumberDependents: 2,
    LoanType: 'Business',
    PurposeOfLoan: 'Boutique Store Expansion',
    ApplicationDate: '05-12-2024',
    DateKey: '20241205',
    Day: 5,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 0,
    FraudType: 'None',
    LoanStatus: 'Approved',
    PropertyOwnershipStatus: 'Owned',
    ResidentialAddress: 'Panampilly Nagar, Kochi, KL',
    LoanAmountRequested: 1200000,
    LoanTenureMonths: 60,
    InterestRateOffered: 10.5,
    MonthlyIncome: 85000,
    ExistingEMIs: 16000,
    DebtToIncomeRatio: 0.19,
    CIBILScore: 745,
    RiskProbability: 0.07,
  },
  {
    ApplicationID: 'APP0012',
    CustomerID: 'CUST0012',
    ApplicantName: 'Harsh Vardhan',
    ApplicantAge: 22,
    Gender: 'Male',
    EmploymentStatus: 'Freelance / Gig',
    NumberDependents: 0,
    LoanType: 'Personal',
    PurposeOfLoan: 'Emergency Travel',
    ApplicationDate: '04-12-2024',
    DateKey: '20241204',
    Day: 4,
    Month: 'December',
    Quarter: 'Q4',
    Year: 2024,
    FraudFlag: 1,
    FraudType: 'Synthetic Identity',
    LoanStatus: 'Under Review',
    PropertyOwnershipStatus: 'Rented',
    ResidentialAddress: 'Aliganj, Lucknow, UP',
    LoanAmountRequested: 380000,
    LoanTenureMonths: 24,
    InterestRateOffered: 16.5,
    MonthlyIncome: 18000,
    ExistingEMIs: 12000,
    DebtToIncomeRatio: 0.67,
    CIBILScore: 525,
    RiskProbability: 0.88,
  },
];

// Helper to generate dynamic additional rows for complete 5,000 statistical coverage
export function generateSyntheticPage(page: number, pageSize: number = 10, search = ''): { rows: LoanApplication[]; total: number } {
  let baseList = [...DEMO_APPLICATIONS];

  // If page exceeds static samples, generate realistic deterministic records
  const startIndex = (page - 1) * pageSize;
  const total = 5000;

  const names = ['Aarav', 'Pooja', 'Rohan', 'Vikas', 'Ananya', 'Kunal', 'Deepak', 'Simran', 'Tanmay', 'Meera', 'Aditya', 'Sneha', 'Gaurav', 'Neha', 'Sanjay', 'Priyanka'];
  const surnames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Singh', 'Kapoor', 'Deshmukh', 'Joshi', 'Chawla', 'Bhatia'];
  const loanTypes: ('Personal' | 'Home' | 'Vehicle' | 'Business' | 'Education')[] = ['Personal', 'Home', 'Vehicle', 'Business', 'Education'];
  const empTypes: ('Salaried' | 'Self-Employed' | 'Small Business Owner' | 'Freelance / Gig')[] = ['Salaried', 'Self-Employed', 'Small Business Owner', 'Freelance / Gig'];

  const rows: LoanApplication[] = [];
  for (let i = 0; i < pageSize; i++) {
    const recordIndex = startIndex + i;
    if (recordIndex >= total) break;

    if (recordIndex < baseList.length) {
      rows.push(baseList[recordIndex]);
    } else {
      const isFraud = (recordIndex % 10 === 3); // ~10% fraud rate matching 486 / 5000
      const name = `${names[recordIndex % names.length]} ${surnames[recordIndex % surnames.length]}`;
      const lType = loanTypes[recordIndex % loanTypes.length];
      const eType = empTypes[(recordIndex * 3) % empTypes.length];
      const cibil = isFraud ? 480 + (recordIndex % 110) : 670 + (recordIndex % 180);
      const income = isFraud ? 20000 + (recordIndex % 25000) : 45000 + (recordIndex % 85000);
      const amount = isFraud ? 500000 + (recordIndex % 600000) : 350000 + (recordIndex % 1800000);
      const emis = isFraud ? Math.round(income * 0.58) : Math.round(income * 0.22);
      const dti = Number((emis / Math.max(income, 1)).toFixed(2));

      rows.push({
        ApplicationID: `APP${String(recordIndex + 1).padStart(4, '0')}`,
        CustomerID: `CUST${String(recordIndex + 1).padStart(4, '0')}`,
        ApplicantName: name,
        ApplicantAge: 21 + (recordIndex % 45),
        Gender: recordIndex % 2 === 0 ? 'Male' : 'Female',
        EmploymentStatus: eType,
        NumberDependents: recordIndex % 4,
        LoanType: lType,
        PurposeOfLoan: `${lType} Funding Purpose`,
        ApplicationDate: '10-12-2024',
        DateKey: '20241210',
        Day: 10,
        Month: 'December',
        Quarter: 'Q4',
        Year: 2024,
        FraudFlag: isFraud ? 1 : 0,
        FraudType: isFraud ? (recordIndex % 2 === 0 ? 'Synthetic Identity' : 'Income Inflation') : 'None',
        LoanStatus: isFraud ? (recordIndex % 3 === 0 ? 'Rejected' : 'Under Review') : 'Approved',
        PropertyOwnershipStatus: recordIndex % 2 === 0 ? 'Owned' : 'Rented',
        ResidentialAddress: 'Tier-1 Metro Hub, India',
        LoanAmountRequested: amount,
        LoanTenureMonths: 12 + (recordIndex % 6) * 12,
        InterestRateOffered: isFraud ? 15.5 : 9.8,
        MonthlyIncome: income,
        ExistingEMIs: emis,
        DebtToIncomeRatio: dti,
        CIBILScore: cibil,
        RiskProbability: isFraud ? 0.88 : 0.06,
      });
    }
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    const filtered = rows.filter(r => 
      r.ApplicationID.toLowerCase().includes(q) || 
      r.ApplicantName.toLowerCase().includes(q) ||
      r.LoanType.toLowerCase().includes(q)
    );
    return { rows: filtered, total: filtered.length };
  }

  return { rows, total };
}

export const FRAUD_ALERTS: FraudAlert[] = [
  {
    id: 'alt-1',
    title: 'Rapid Loan Application Spike',
    description: '12 applications detected from identical subnet within 10 minutes.',
    timestamp: 'Just now',
    severity: 'coral',
  },
  {
    id: 'alt-2',
    title: 'Identity Inconsistency',
    description: 'PAN name mismatch flagged against Aadhaar depository for CUST0003.',
    timestamp: '47 mins ago',
    severity: 'amber',
  },
  {
    id: 'alt-3',
    title: 'Batch Model Retrain Complete',
    description: 'Model recall increased by +1.4% with SMOTE balanced oversampling.',
    timestamp: '3 hours ago',
    severity: 'lime',
  },
  {
    id: 'alt-4',
    title: 'Cluster Default Risk Warning',
    description: 'Unsecured personal loan cluster detected in Tier-2 geographical segment.',
    timestamp: '5 hours ago',
    severity: 'amber',
  },
];

export const PIPELINE_ACTIVITIES: PipelineActivity[] = [
  {
    id: 'act-1',
    title: '5,000 records loaded & validated',
    subtitle: 'Google Sheet schema mapping verified (25 features)',
    timestamp: '2 mins ago',
    status: 'completed',
  },
  {
    id: 'act-2',
    title: 'Data cleaning completed',
    subtitle: 'Median income imputation and Standard Scaler applied',
    timestamp: '14 mins ago',
    status: 'completed',
  },
  {
    id: 'act-3',
    title: 'Model evaluation completed',
    subtitle: 'Random Forest & XGBoost achieved 0.96 ROC-AUC',
    timestamp: '1 hour ago',
    status: 'completed',
  },
  {
    id: 'act-4',
    title: 'Dataset synchronized',
    subtitle: 'Zero latency webhook connected to SheetDB API',
    timestamp: '2 hours ago',
    status: 'completed',
  },
  {
    id: 'act-5',
    title: 'New high-risk pattern detected',
    subtitle: 'DTI > 0.60 & CIBIL < 550 flagged 4.8x fraud likelihood',
    timestamp: '3 hours ago',
    status: 'active',
  },
];

/**
 * Predict risk for a single loan application using tree-based heuristic weights
 */
export function predictLoanRisk(form: CheckerFormState): PredictionResult {
  const dti = form.monthlyIncome > 0 ? Number((form.existingEMIs / form.monthlyIncome).toFixed(2)) : 1.0;
  const loanToIncomeRatio = form.monthlyIncome > 0 ? (form.loanAmountRequested / (form.monthlyIncome * 12)) : 5.0;

  // Baseline 15%
  let score = 15;

  // CIBIL factor
  if (form.cibilScore < 550) score += 36;
  else if (form.cibilScore < 640) score += 20;
  else if (form.cibilScore > 750) score -= 14;

  // DTI factor
  if (dti > 0.55) score += 26;
  else if (dti > 0.40) score += 14;
  else if (dti < 0.25) score -= 8;

  // Leverage factor
  if (loanToIncomeRatio > 3.0) score += 16;
  else if (loanToIncomeRatio > 1.8) score += 8;

  // Age & Employment
  if (form.applicantAge < 25) score += 8;
  if (form.employmentStatus === 'Self-Employed' || form.employmentStatus === 'Freelance / Gig') score += 7;
  if (form.loanType === 'Personal') score += 6;

  // Clamp 4% - 98%
  const finalProbability = Math.min(98, Math.max(4, Math.round(score)));

  let riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' = 'LOW RISK';
  let prediction: 'Genuine' | 'Fraud' | 'Review' = 'Genuine';
  let recommendation = '';

  if (finalProbability >= 60) {
    riskLevel = 'HIGH RISK';
    prediction = 'Fraud';
    recommendation = 'High probability of fraudulent synthetic profile or intentional default. Automatic loan decline or biometric identity verification required.';
  } else if (finalProbability >= 35) {
    riskLevel = 'MEDIUM RISK';
    prediction = 'Review';
    recommendation = 'Borderline qualification metrics. Manual review of 6-month bank statement PDFs and Form 16 / ITR documents recommended.';
  } else {
    riskLevel = 'LOW RISK';
    prediction = 'Genuine';
    recommendation = 'Credit profile indicates genuine applicant with robust debt servicing capacity and prime credit tier.';
  }

  const contributingFactors = [
    {
      factor: `CIBIL Score (${form.cibilScore})`,
      impact: form.cibilScore < 600 ? '+35% Risk' : '-14% Risk',
      percentage: Math.min(100, Math.max(15, Math.round(((900 - form.cibilScore) / 4)))),
      severity: form.cibilScore < 600 ? ('coral' as const) : ('lime' as const),
    },
    {
      factor: `Debt-to-Income (${(dti * 100).toFixed(0)}%)`,
      impact: dti > 0.45 ? '+26% Risk' : '-8% Risk',
      percentage: Math.min(100, Math.round(dti * 100)),
      severity: dti > 0.45 ? ('coral' as const) : ('lime' as const),
    },
    {
      factor: `${form.employmentStatus} + ${form.loanType} Loan`,
      impact: form.employmentStatus !== 'Salaried' ? '+15% Profile Risk' : 'Standard Risk',
      percentage: form.employmentStatus !== 'Salaried' ? 65 : 25,
      severity: form.employmentStatus !== 'Salaried' ? ('amber' as const) : ('lime' as const),
    },
  ];

  return {
    prediction,
    fraudProbability: finalProbability,
    riskLevel,
    recommendation,
    dtiRatio: dti,
    contributingFactors,
  };
}

/**
 * Export records as CSV string
 */
export function generateCSVContent(records: LoanApplication[]): string {
  const headers = [
    'ApplicationID',
    'CustomerID',
    'ApplicantName',
    'ApplicantAge',
    'Gender',
    'EmploymentStatus',
    'NumberDependents',
    'LoanType',
    'PurposeOfLoan',
    'ApplicationDate',
    'LoanAmountRequested',
    'LoanTenureMonths',
    'InterestRateOffered',
    'MonthlyIncome',
    'ExistingEMIs',
    'DebtToIncomeRatio',
    'CIBILScore',
    'LoanStatus',
    'FraudFlag',
    'FraudType',
    'RiskProbability'
  ];

  const rows = records.map(r => [
    r.ApplicationID,
    r.CustomerID,
    `"${r.ApplicantName}"`,
    r.ApplicantAge,
    r.Gender,
    `"${r.EmploymentStatus}"`,
    r.NumberDependents,
    `"${r.LoanType}"`,
    `"${r.PurposeOfLoan}"`,
    r.ApplicationDate,
    r.LoanAmountRequested,
    r.LoanTenureMonths,
    r.InterestRateOffered,
    r.MonthlyIncome,
    r.ExistingEMIs,
    r.DebtToIncomeRatio,
    r.CIBILScore,
    `"${r.LoanStatus}"`,
    r.FraudFlag,
    `"${r.FraudType}"`,
    r.RiskProbability
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Fetch live records from SheetDB API or remote Google Sheet endpoint
 */
export async function fetchSheetData(endpoint: string): Promise<LoanApplication[]> {
  if (!endpoint) return [];
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
  }
  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any, idx: number) => {
    const amount = Number(item.LoanAmountRequested || item.loan_amount || item.Amount || 450000);
    const cibil = Number(item.CIBILScore || item.cibil_score || item.CIBIL || 680);
    const income = Number(item.MonthlyIncome || item.monthly_income || item.Income || 45000);
    const emis = Number(item.ExistingEMIs || item.existing_emis || item.EMIs || 10000);
    const dti = income > 0 ? Number((emis / income).toFixed(2)) : Number(item.DebtToIncomeRatio || 0.25);
    const isFraud = Number(item.FraudFlag || item.fraud_flag || item.IsFraud || (cibil < 580 && dti > 0.5 ? 1 : 0));

    return {
      ApplicationID: item.ApplicationID || `APP${String(idx + 1).padStart(4, '0')}`,
      CustomerID: item.CustomerID || `CUST${String(idx + 1).padStart(4, '0')}`,
      ApplicantName: item.ApplicantName || item.CustomerName || `Applicant ${idx + 1}`,
      ApplicantAge: Number(item.ApplicantAge || 32),
      Gender: item.Gender || (idx % 2 === 0 ? 'Male' : 'Female'),
      EmploymentStatus: item.EmploymentStatus || 'Salaried',
      NumberDependents: Number(item.NumberDependents || 1),
      LoanType: item.LoanType || 'Personal',
      PurposeOfLoan: item.PurposeOfLoan || 'Debt Consolidation',
      ApplicationDate: item.ApplicationDate || '12-12-2024',
      DateKey: item.DateKey || '20241212',
      Day: Number(item.Day || 12),
      Month: item.Month || 'December',
      Quarter: item.Quarter || 'Q4',
      Year: Number(item.Year || 2024),
      FraudFlag: isFraud === 1 ? 1 : 0,
      FraudType: item.FraudType || (isFraud === 1 ? 'Synthetic Identity' : 'None'),
      LoanStatus: item.LoanStatus || (isFraud === 1 ? 'Rejected' : 'Approved'),
      PropertyOwnershipStatus: item.PropertyOwnershipStatus || 'Owned',
      ResidentialAddress: item.ResidentialAddress || 'Metropolitan Tier-1, India',
      LoanAmountRequested: amount,
      LoanTenureMonths: Number(item.LoanTenureMonths || 36),
      InterestRateOffered: Number(item.InterestRateOffered || 11.5),
      MonthlyIncome: income,
      ExistingEMIs: emis,
      DebtToIncomeRatio: dti,
      CIBILScore: cibil,
      RiskProbability: isFraud === 1 ? 0.88 : 0.08,
    };
  });
}

/**
 * Recalculate KPIs from a list of applications
 */
export function calculateKPIMetrics(apps: LoanApplication[]): KPIMetrics {
  if (!apps || apps.length === 0) return DEFAULT_KPIS;
  const totalApplications = apps.length;
  const fraudulentApplications = apps.filter((a) => a.FraudFlag === 1).length;
  const genuineApplications = totalApplications - fraudulentApplications;
  const fraudRate = Number(((fraudulentApplications / totalApplications) * 100).toFixed(2));

  const totalAmount = apps.reduce((acc, a) => acc + a.LoanAmountRequested, 0);
  const avgLoanAmount = Number((totalAmount / (totalApplications * 100000)).toFixed(2));

  const fraudApps = apps.filter((a) => a.FraudFlag === 1);
  const genApps = apps.filter((a) => a.FraudFlag === 0);

  const avgFraudAmount = fraudApps.length > 0 
    ? Number((fraudApps.reduce((acc, a) => acc + a.LoanAmountRequested, 0) / (fraudApps.length * 100000)).toFixed(1))
    : 6.8;

  const avgGenuineAmount = genApps.length > 0
    ? Number((genApps.reduce((acc, a) => acc + a.LoanAmountRequested, 0) / (genApps.length * 100000)).toFixed(1))
    : 4.6;

  return {
    totalApplications,
    genuineApplications,
    fraudulentApplications,
    fraudRate,
    avgLoanAmount,
    avgFraudAmount,
    avgGenuineAmount,
    estFraudPreventedCr: 3.30,
  };
}

