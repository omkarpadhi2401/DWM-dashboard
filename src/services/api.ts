import { LoanApplication, KPIMetrics } from '../types';

export const SHEET_API_URL = 'https://sheetdb.io/api/v1/jnveyifpbrsuy';

/**
 * Normalizes a raw record from the SheetDB JSON REST endpoint.
 * Numeric fields often arrive as string representations from Google Sheets.
 */
export function normalizeRecord(row: any, index: number = 0): LoanApplication {
  const age = Number(row.ApplicantAge) || 28;
  const dependents = Number(row.NumberDependents) || 0;
  const dateKey = Number(row.DateKey) || 20240101;
  const day = Number(row.Day) || 1;
  const year = Number(row.Year) || 2024;
  const fraudFlag = Number(row.FraudFlag) === 1 ? 1 : 0;
  const amount = Number(row.LoanAmountRequested) || 0;
  const tenure = Number(row.LoanTenureMonths) || 12;
  const interestRate = Number(row.InterestRateOffered) || 10.5;
  const monthlyIncome = Number(row.MonthlyIncome) || 0;
  const existingEMIs = Number(row.ExistingEMIs) || 0;
  
  // DTI might be formatted as percentage or decimal
  let rawDti = Number(row.DebtToIncomeRatio);
  let dti = !isNaN(rawDti) && rawDti > 0 
    ? (rawDti > 1 ? Number(rawDti.toFixed(2)) : Number((rawDti * 100).toFixed(2)))
    : (monthlyIncome > 0 ? Number(((existingEMIs / monthlyIncome) * 100).toFixed(2)) : 15.0);

  // Derive realistic CIBIL credit score if not present in sheet
  let cibil = Number(row.CIBILScore);
  if (isNaN(cibil) || cibil === 0) {
    if (fraudFlag === 1) {
      cibil = Math.round(510 + (Math.abs(amount) % 110));
    } else {
      const calculated = Math.round(840 - (interestRate * 12) - Math.min(80, dti * 1.2));
      cibil = Math.max(590, Math.min(845, calculated));
    }
  }

  // Calculate risk probability
  const riskProb = fraudFlag === 1 
    ? 0.92 
    : Number((Math.min(0.38, (interestRate / 25) * 0.4 + (dti / 100) * 0.3)).toFixed(2));

  // Determine loan status
  let loanStatus: 'Approved' | 'Under Review' | 'Rejected' = 'Approved';
  if (row.LoanStatus === 'Rejected' || fraudFlag === 1) {
    loanStatus = 'Rejected';
  } else if (row.LoanStatus === 'Under Review' || dti > 50) {
    loanStatus = 'Under Review';
  } else if (row.LoanStatus === 'Approved') {
    loanStatus = 'Approved';
  }

  // Determine fraud type
  let fraudType = row.FraudType;
  if (!fraudType || fraudType === 'No Fraud') {
    fraudType = fraudFlag === 1 ? 'Synthetic Identity' : 'None';
  }

  const appId = String(row.ApplicationID || `APP${String(index + 1).padStart(3, '0')}`);
  const custId = String(row.CustomerID || `CUST${String(index + 1).padStart(3, '0')}`);
  const applicantName = row.ApplicantName || `Applicant ${appId.replace('APP', '')}`;

  return {
    ApplicationID: appId,
    CustomerID: custId,
    ApplicantName: applicantName,
    ApplicantAge: age,
    Gender: (row.Gender || 'Male') as any,
    EmploymentStatus: (row.EmploymentStatus || 'Salaried') as any,
    NumberDependents: dependents,
    LoanType: (row.LoanType || 'Personal Loan') as any,
    PurposeOfLoan: String(row.PurposeOfLoan || 'General Needs'),
    ApplicationDate: String(row.ApplicationDate || `${day}-01-${year}`),
    DateKey: String(dateKey),
    Day: day,
    Month: String(row.Month || 'January'),
    Quarter: String(row.Quarter || 'Q1'),
    Year: year,
    FraudFlag: fraudFlag as 0 | 1,
    FraudType: fraudType as any,
    LoanStatus: loanStatus,
    PropertyOwnershipStatus: (row.PropertyOwnershipStatus || 'Rented') as any,
    ResidentialAddress: String(row.ResidentialAddress || 'Metropolitan Tier-1, India'),
    LoanAmountRequested: amount,
    LoanTenureMonths: tenure,
    InterestRateOffered: interestRate,
    MonthlyIncome: monthlyIncome,
    ExistingEMIs: existingEMIs,
    DebtToIncomeRatio: dti,
    CIBILScore: cibil,
    RiskProbability: riskProb,
  };
}

/**
 * Fetch live data from the verified SheetDB REST endpoint.
 * Direct array response is parsed and normalized.
 */
export async function fetchLiveLoanApplications(endpoint = SHEET_API_URL): Promise<LoanApplication[]> {
  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Required debugging output to verify live payload in Google AI Studio
    console.log("API response:", data);
    console.log("Record count:", Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length > 0) {
      console.log("First record:", data[0]);
    }

    if (!Array.isArray(data)) {
      throw new Error("Expected API response to be an array of loan application objects.");
    }

    const normalizedData = data.map((row, idx) => normalizeRecord(row, idx));
    return normalizedData;
  } catch (error) {
    console.error("Technical error fetching live API data:", error);
    throw error;
  }
}

/**
 * Calculate all dashboard metrics directly from the applications array.
 * Zero hardcoding.
 */
export function calculateDashboardMetrics(data: LoanApplication[]): KPIMetrics {
  if (!data || data.length === 0) {
    return {
      totalApplications: 0,
      genuineApplications: 0,
      fraudulentApplications: 0,
      fraudRate: 0,
      avgLoanAmount: 0,
      avgGenuineAmount: 0,
      avgFraudAmount: 0,
      estFraudPreventedCr: 0,
    };
  }

  const totalApplications = data.length;
  const fraudApps = data.filter((row) => row.FraudFlag === 1);
  const genuineApps = data.filter((row) => row.FraudFlag === 0);

  const fraudulentApplications = fraudApps.length;
  const genuineApplications = genuineApps.length;
  const fraudRate = Number(((fraudulentApplications / totalApplications) * 100).toFixed(2));

  // Average Loan Amount in Lakhs (divide amount by 100,000)
  const totalAmount = data.reduce((sum, row) => sum + row.LoanAmountRequested, 0);
  const avgLoanAmount = Number((totalAmount / (totalApplications * 100000)).toFixed(2));

  const totalGenuineAmt = genuineApps.reduce((sum, row) => sum + row.LoanAmountRequested, 0);
  const avgGenuineAmount = genuineApps.length > 0
    ? Number((totalGenuineAmt / (genuineApps.length * 100000)).toFixed(2))
    : 0;

  const totalFraudAmt = fraudApps.reduce((sum, row) => sum + row.LoanAmountRequested, 0);
  const avgFraudAmount = fraudApps.length > 0
    ? Number((totalFraudAmt / (fraudApps.length * 100000)).toFixed(2))
    : 0;

  // Estimated Fraud Prevented in Crores (divide rupees by 10,000,000)
  const estFraudPreventedCr = Number((totalFraudAmt / 10000000).toFixed(2));

  return {
    totalApplications,
    genuineApplications,
    fraudulentApplications,
    fraudRate,
    avgLoanAmount,
    avgGenuineAmount,
    avgFraudAmount,
    estFraudPreventedCr,
  };
}

/**
 * Aggregations for analytical charts
 */
export function getBreakdownByLoanType(data: LoanApplication[]) {
  const map: Record<string, { total: number; fraud: number; totalAmount: number }> = {};
  data.forEach((app) => {
    const key = app.LoanType || 'Other';
    if (!map[key]) map[key] = { total: 0, fraud: 0, totalAmount: 0 };
    map[key].total += 1;
    if (app.FraudFlag === 1) {
      map[key].fraud += 1;
      map[key].totalAmount += app.LoanAmountRequested;
    }
  });

  return Object.entries(map).map(([type, stats]) => {
    const rate = stats.total > 0 ? Number(((stats.fraud / stats.total) * 100).toFixed(1)) : 0;
    const amountCr = Number((stats.totalAmount / 10000000).toFixed(2));
    const amountL = Number((stats.totalAmount / 100000).toFixed(1));
    return {
      type,
      total: stats.total,
      fraudCount: stats.fraud,
      fraudRate: rate,
      totalAmountCr: amountCr,
      totalAmountL: amountL,
    };
  }).sort((a, b) => b.fraudRate - a.fraudRate);
}

export function getBreakdownByEmployment(data: LoanApplication[]) {
  const map: Record<string, { total: number; fraud: number }> = {};
  data.forEach((app) => {
    const key = app.EmploymentStatus || 'Other';
    if (!map[key]) map[key] = { total: 0, fraud: 0 };
    map[key].total += 1;
    if (app.FraudFlag === 1) map[key].fraud += 1;
  });

  return Object.entries(map).map(([status, stats]) => {
    const rate = stats.total > 0 ? Number(((stats.fraud / stats.total) * 100).toFixed(1)) : 0;
    return {
      status,
      total: stats.total,
      fraudCount: stats.fraud,
      fraudRate: rate,
    };
  }).sort((a, b) => b.fraudRate - a.fraudRate);
}

export function getBreakdownByGender(data: LoanApplication[]) {
  const map: Record<string, { total: number; fraud: number }> = {};
  data.forEach((app) => {
    const key = app.Gender || 'Other';
    if (!map[key]) map[key] = { total: 0, fraud: 0 };
    map[key].total += 1;
    if (app.FraudFlag === 1) map[key].fraud += 1;
  });

  return Object.entries(map).map(([gender, stats]) => {
    const rate = stats.total > 0 ? Number(((stats.fraud / stats.total) * 100).toFixed(1)) : 0;
    return {
      gender,
      total: stats.total,
      fraudCount: stats.fraud,
      fraudRate: rate,
    };
  }).sort((a, b) => b.fraudRate - a.fraudRate);
}

export function getBreakdownByAgeGroup(data: LoanApplication[]) {
  const buckets = [
    { label: '18–25', min: 18, max: 25 },
    { label: '26–35', min: 26, max: 35 },
    { label: '36–45', min: 36, max: 45 },
    { label: '46–55', min: 46, max: 55 },
    { label: '56+', min: 56, max: 120 },
  ];

  return buckets.map((bucket) => {
    const apps = data.filter((a) => a.ApplicantAge >= bucket.min && a.ApplicantAge <= bucket.max);
    const total = apps.length;
    const fraudCount = apps.filter((a) => a.FraudFlag === 1).length;
    const fraudRate = total > 0 ? Number(((fraudCount / total) * 100).toFixed(1)) : 0;
    return {
      label: bucket.label,
      total,
      fraudCount,
      fraudRate,
    };
  });
}

export function getMonthlyIntakeTrend(data: LoanApplication[]) {
  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthMap: Record<string, { genuine: number; fraud: number; total: number }> = {};
  monthOrder.forEach((m) => {
    monthMap[m] = { genuine: 0, fraud: 0, total: 0 };
  });

  data.forEach((app) => {
    const m = app.Month || '';
    if (monthMap[m]) {
      monthMap[m].total += 1;
      if (app.FraudFlag === 1) {
        monthMap[m].fraud += 1;
      } else {
        monthMap[m].genuine += 1;
      }
    }
  });

  const trendData = monthOrder.map((m, idx) => {
    const stats = monthMap[m];
    const fraudRate = stats.total > 0 ? Number(((stats.fraud / stats.total) * 100).toFixed(1)) : 0;
    return {
      month: m,
      label: shortLabels[idx],
      genuine: stats.genuine,
      fraud: stats.fraud,
      total: stats.total,
      fraudRate,
    };
  });

  // Calculate peak and lowest fraud months
  const activeMonths = trendData.filter((t) => t.total > 0);
  let peak = activeMonths[0] || { month: 'N/A', fraudRate: 0 };
  let lowest = activeMonths[0] || { month: 'N/A', fraudRate: 0 };

  activeMonths.forEach((item) => {
    if (item.fraudRate > peak.fraudRate) peak = item;
    if (item.fraudRate < lowest.fraudRate) lowest = item;
  });

  return {
    trendData,
    peakMonth: peak,
    lowestMonth: lowest,
  };
}
