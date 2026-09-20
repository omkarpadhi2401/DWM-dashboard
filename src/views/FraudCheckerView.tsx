import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw,
  PlusCircle,
  Save,
  Info
} from 'lucide-react';
import { CheckerFormState, PredictionResult, LoanApplication } from '../types';
import { predictLoanRisk } from '../services/dataService';

interface FraudCheckerViewProps {
  onSaveToQueue?: (app: LoanApplication) => void;
  onNavigateToExplorer?: () => void;
}

export const FraudCheckerView: React.FC<FraudCheckerViewProps> = ({
  onSaveToQueue,
  onNavigateToExplorer,
}) => {
  const [formState, setFormState] = useState<CheckerFormState>({
    applicantName: 'Devendra Joshi',
    applicantAge: 23,
    gender: 'Male',
    employmentStatus: 'Self-Employed',
    numberDependents: 1,
    loanType: 'Personal',
    purposeOfLoan: 'Personal Emergency Funding',
    loanAmountRequested: 750000,
    loanTenureMonths: 36,
    interestRateOffered: 15.5,
    monthlyIncome: 28000,
    existingEMIs: 17000,
    cibilScore: 520,
    propertyOwnership: 'Rented',
    loanStatus: 'Under Review',
  });

  const [result, setResult] = useState<PredictionResult>(() => predictLoanRisk(formState));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live computed DTI
  const computedDTI = formState.monthlyIncome > 0 
    ? Number((formState.existingEMIs / formState.monthlyIncome).toFixed(2)) 
    : 0;

  const handleScenario = (type: 'safe' | 'risk' | 'borderline') => {
    if (type === 'safe') {
      const safeData: CheckerFormState = {
        applicantName: 'Rashmi Pillai',
        applicantAge: 36,
        gender: 'Female',
        employmentStatus: 'Salaried',
        numberDependents: 1,
        loanType: 'Vehicle',
        purposeOfLoan: 'Sedan Purchase',
        loanAmountRequested: 400000,
        loanTenureMonths: 48,
        interestRateOffered: 8.9,
        monthlyIncome: 95000,
        existingEMIs: 12000,
        cibilScore: 790,
        propertyOwnership: 'Owned',
        loanStatus: 'Under Review',
      };
      setFormState(safeData);
      setResult(predictLoanRisk(safeData));
    } else if (type === 'risk') {
      const riskData: CheckerFormState = {
        applicantName: 'Devendra Joshi',
        applicantAge: 22,
        gender: 'Male',
        employmentStatus: 'Self-Employed',
        numberDependents: 0,
        loanType: 'Personal',
        purposeOfLoan: 'High Risk Unsecured Loan',
        loanAmountRequested: 750000,
        loanTenureMonths: 24,
        interestRateOffered: 16.5,
        monthlyIncome: 24000,
        existingEMIs: 16500,
        cibilScore: 510,
        propertyOwnership: 'Rented',
        loanStatus: 'Under Review',
      };
      setFormState(riskData);
      setResult(predictLoanRisk(riskData));
    } else {
      const borderData: CheckerFormState = {
        applicantName: 'Kunal Deshmukh',
        applicantAge: 29,
        gender: 'Male',
        employmentStatus: 'Small Business Owner',
        numberDependents: 2,
        loanType: 'Business',
        purposeOfLoan: 'Equipment Repair',
        loanAmountRequested: 550000,
        loanTenureMonths: 36,
        interestRateOffered: 12.0,
        monthlyIncome: 48000,
        existingEMIs: 19000,
        cibilScore: 630,
        propertyOwnership: 'Rented',
        loanStatus: 'Under Review',
      };
      setFormState(borderData);
      setResult(predictLoanRisk(borderData));
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setTimeout(() => {
      setResult(predictLoanRisk(formState));
      setIsAnalyzing(false);
    }, 300);
  };

  const handleSaveToQueue = () => {
    if (onSaveToQueue) {
      const newApp: LoanApplication = {
        ApplicationID: `APP${Math.floor(1000 + Math.random() * 9000)}`,
        CustomerID: `CUST${Math.floor(1000 + Math.random() * 9000)}`,
        ApplicantName: formState.applicantName,
        ApplicantAge: formState.applicantAge,
        Gender: formState.gender,
        EmploymentStatus: formState.employmentStatus,
        NumberDependents: formState.numberDependents,
        LoanType: formState.loanType,
        PurposeOfLoan: formState.purposeOfLoan,
        ApplicationDate: '12-12-2024',
        DateKey: '20241212',
        Day: 12,
        Month: 'December',
        Quarter: 'Q4',
        Year: 2024,
        FraudFlag: result.prediction === 'Fraud' ? 1 : 0,
        FraudType: result.prediction === 'Fraud' ? 'Synthetic Identity' : 'None',
        LoanStatus: result.prediction === 'Fraud' ? 'Rejected' : result.prediction === 'Review' ? 'Under Review' : 'Approved',
        PropertyOwnershipStatus: formState.propertyOwnership,
        ResidentialAddress: 'Live Scored Application, Review Desk',
        LoanAmountRequested: formState.loanAmountRequested,
        LoanTenureMonths: formState.loanTenureMonths,
        InterestRateOffered: formState.interestRateOffered,
        MonthlyIncome: formState.monthlyIncome,
        ExistingEMIs: formState.existingEMIs,
        DebtToIncomeRatio: computedDTI,
        CIBILScore: formState.cibilScore,
        RiskProbability: result.fraudProbability / 100,
      };
      onSaveToQueue(newApp);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Circumference for r=40 is 2 * PI * 40 = 251.3
  const circumference = 251.3;
  const strokeOffset = circumference - (result.fraudProbability / 100) * circumference;

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Fraud Checker
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Simulate real-time scoring inference for an individual loan applicant using trained ensemble parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input Form (7 Cols) */}
        <div className="lg:col-span-7 bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-white text-base">Applicant Risk Scoring Simulator</h3>
                <p className="text-xs text-slate-400">Fill parameters or select a pre-configured scenario profile</p>
              </div>

              {/* Quick Load Scenario Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScenario('safe')}
                  className="px-2.5 py-1 rounded-lg bg-[#bbf246]/15 text-[#bbf246] hover:bg-[#bbf246]/25 text-xs font-semibold transition-colors"
                >
                  + Safe Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleScenario('risk')}
                  className="px-2.5 py-1 rounded-lg bg-[#f43f5e]/15 text-[#f43f5e] hover:bg-[#f43f5e]/25 text-xs font-semibold transition-colors"
                >
                  + High Risk Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleScenario('borderline')}
                  className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-[#fb923c]/15 text-[#fb923c] hover:bg-[#fb923c]/25 text-xs font-semibold transition-colors"
                >
                  + Borderline
                </button>
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Applicant Name */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Applicant Full Name</label>
                  <input
                    type="text"
                    required
                    value={formState.applicantName}
                    onChange={(e) => setFormState({ ...formState, applicantName: e.target.value })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  />
                </div>

                {/* 2. Applicant Age */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Applicant Age (Years)</label>
                  <input
                    type="number"
                    min="18"
                    max="80"
                    required
                    value={formState.applicantAge}
                    onChange={(e) => setFormState({ ...formState, applicantAge: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  />
                </div>

                {/* 3. Gender */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Gender</label>
                  <select
                    value={formState.gender}
                    onChange={(e) => setFormState({ ...formState, gender: e.target.value as any })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* 4. Employment Status */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Employment Status</label>
                  <select
                    value={formState.employmentStatus}
                    onChange={(e) => setFormState({ ...formState, employmentStatus: e.target.value as any })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  >
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Freelance / Gig">Freelance / Gig</option>
                    <option value="Salaried">Salaried Corporate</option>
                    <option value="Small Business Owner">Small Business Owner</option>
                  </select>
                </div>

                {/* 5. Number of Dependents */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Number of Dependents</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={formState.numberDependents}
                    onChange={(e) => setFormState({ ...formState, numberDependents: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  />
                </div>

                {/* 6. Loan Type */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Loan Type</label>
                  <select
                    value={formState.loanType}
                    onChange={(e) => setFormState({ ...formState, loanType: e.target.value as any })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  >
                    <option value="Personal">Personal Loan</option>
                    <option value="Vehicle">Vehicle Financing</option>
                    <option value="Business">Small Business Loan</option>
                    <option value="Home">Home Loan</option>
                  </select>
                </div>

                {/* 7. Loan Amount Requested */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Loan Amount Requested (₹)</label>
                  <input
                    type="number"
                    min="10000"
                    required
                    value={formState.loanAmountRequested}
                    onChange={(e) => setFormState({ ...formState, loanAmountRequested: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none font-mono"
                  />
                </div>

                {/* 8. Loan Tenure (Months) */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Loan Tenure (Months)</label>
                  <input
                    type="number"
                    min="6"
                    max="360"
                    required
                    value={formState.loanTenureMonths}
                    onChange={(e) => setFormState({ ...formState, loanTenureMonths: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  />
                </div>

                {/* 9. Interest Rate Offered */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Interest Rate Offered (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="35"
                    required
                    value={formState.interestRateOffered}
                    onChange={(e) => setFormState({ ...formState, interestRateOffered: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  />
                </div>

                {/* 10. Monthly Income */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Stated Monthly Income (₹)</label>
                  <input
                    type="number"
                    min="5000"
                    required
                    value={formState.monthlyIncome}
                    onChange={(e) => setFormState({ ...formState, monthlyIncome: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none font-mono"
                  />
                </div>

                {/* 11. Existing EMIs */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Existing Monthly EMIs (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formState.existingEMIs}
                    onChange={(e) => setFormState({ ...formState, existingEMIs: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none font-mono"
                  />
                </div>

                {/* 12. Debt-to-Income Ratio (Auto calculated) */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Debt-to-Income (DTI) Ratio <span className="text-slate-500 font-normal">(Auto)</span>
                  </label>
                  <div className="w-full bg-[#181d24]/60 rounded-xl border border-white/10 text-slate-300 text-xs px-3 py-2.5 font-mono flex items-center justify-between">
                    <span>{(computedDTI * 100).toFixed(1)}% ({computedDTI})</span>
                    <span className={`text-[10px] font-bold ${computedDTI > 0.5 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                      {computedDTI > 0.5 ? 'Critical' : 'Healthy'}
                    </span>
                  </div>
                </div>

                {/* 13. CIBIL Score */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">CIBIL Score (300 - 900)</label>
                  <input
                    type="number"
                    min="300"
                    max="900"
                    required
                    value={formState.cibilScore}
                    onChange={(e) => setFormState({ ...formState, cibilScore: Number(e.target.value) })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none font-mono"
                  />
                </div>

                {/* 14. Property Ownership */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Property Ownership</label>
                  <select
                    value={formState.propertyOwnership}
                    onChange={(e) => setFormState({ ...formState, propertyOwnership: e.target.value as any })}
                    className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 focus:border-[#bbf246] focus:outline-none"
                  >
                    <option value="Owned">Owned</option>
                    <option value="Rented">Rented</option>
                    <option value="Mortgaged">Mortgaged</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="flex-1 bg-[#bbf246] text-[#0a0c0e] font-bold py-3 px-4 rounded-xl hover:bg-[#a3e635] transition-all text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(187,242,70,0.35)] disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAnalyzing ? 'Analyzing Application Parameters...' : 'Analyze Application'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>POST /api/v1/predict-fraud</span>
            <span className="text-[#bbf246]">Inference Hook Ready</span>
          </div>
        </div>

        {/* Right Side: Decision Result Card (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div
            className={`bg-[#14181d] rounded-2xl p-6 border relative overflow-hidden flex flex-col justify-between h-full transition-all ${
              result.riskLevel === 'HIGH RISK'
                ? 'border-[#f43f5e]/40 shadow-[0_0_20px_-3px_rgba(244,63,94,0.15)]'
                : result.riskLevel === 'MEDIUM RISK'
                ? 'border-[#fb923c]/40'
                : 'border-[#bbf246]/40 shadow-[0_0_20px_-3px_rgba(187,242,70,0.15)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  ML Evaluation Verdict
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wide ${
                    result.riskLevel === 'HIGH RISK'
                      ? 'bg-[#f43f5e]/20 text-[#f43f5e]'
                      : result.riskLevel === 'MEDIUM RISK'
                      ? 'bg-[#fb923c]/20 text-[#fb923c]'
                      : 'bg-[#bbf246]/20 text-[#bbf246]'
                  }`}
                >
                  {result.riskLevel}
                </span>
              </div>

              {/* Radial Risk Meter */}
              <div className="flex flex-col items-center justify-center my-4">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="none" r="40" stroke="#1d242e" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      fill="none"
                      r="40"
                      stroke={
                        result.riskLevel === 'HIGH RISK'
                          ? '#f43f5e'
                          : result.riskLevel === 'MEDIUM RISK'
                          ? '#fb923c'
                          : '#bbf246'
                      }
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      strokeWidth="10"
                      className="gauge-circle"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span
                      className={`text-3xl font-black tracking-tight ${
                        result.riskLevel === 'HIGH RISK'
                          ? 'text-[#f43f5e]'
                          : result.riskLevel === 'MEDIUM RISK'
                          ? 'text-[#fb923c]'
                          : 'text-[#bbf246]'
                      }`}
                    >
                      {result.fraudProbability}%
                    </span>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">
                      Fraud Probability
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-white mb-1">
                    Prediction: {result.prediction}
                  </div>
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Contributing Risk Factors Breakdown */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Top Contributing Factors
              </div>
              <div className="space-y-2 text-xs">
                {result.contributingFactors.map((f, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">{f.factor}</span>
                      <span
                        className={`font-bold font-mono ${
                          f.severity === 'coral'
                            ? 'text-[#f43f5e]'
                            : f.severity === 'amber'
                            ? 'text-[#fb923c]'
                            : 'text-[#bbf246]'
                        }`}
                      >
                        {f.impact}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          f.severity === 'coral'
                            ? 'bg-[#f43f5e]'
                            : f.severity === 'amber'
                            ? 'bg-[#fb923c]'
                            : 'bg-[#bbf246]'
                        }`}
                        style={{ width: `${f.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[10px] text-slate-500 italic">
                * Demonstration result — not a lending decision.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono">Latency: 12ms</span>
              <button
                type="button"
                onClick={handleSaveToQueue}
                className="text-[#bbf246] hover:underline font-semibold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Saved to Explorer!' : 'Save to Review Queue'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
