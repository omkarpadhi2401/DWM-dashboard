import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  PlusCircle,
  Save,
  HelpCircle,
  Clock
} from 'lucide-react';
import { CheckerFormState, PredictionResult, LoanApplication } from '../types';
import { predictLoanRisk } from '../services/dataService';

interface FraudCheckerViewProps {
  onSaveToQueue?: (app: LoanApplication) => void;
  onNavigateToExplorer?: () => void;
}

const BLANK_FORM: CheckerFormState = {
  applicantName: '',
  applicantAge: '',
  gender: '',
  employmentStatus: '',
  numberDependents: '',
  loanType: '',
  purposeOfLoan: '',
  loanAmountRequested: '',
  loanTenureMonths: '',
  interestRateOffered: '',
  monthlyIncome: '',
  existingEMIs: '',
  cibilScore: '',
  propertyOwnership: '',
  loanStatus: 'Under Review',
};

export const FraudCheckerView: React.FC<FraudCheckerViewProps> = ({
  onSaveToQueue,
  onNavigateToExplorer,
}) => {
  const [formState, setFormState] = useState<CheckerFormState>(BLANK_FORM);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live computed DTI
  const monthlyInc = typeof formState.monthlyIncome === 'number' ? formState.monthlyIncome : 0;
  const existingEMI = typeof formState.existingEMIs === 'number' ? formState.existingEMIs : 0;
  const computedDTI = monthlyInc > 0 ? Number((existingEMI / monthlyInc).toFixed(2)) : 0;

  const handleClearForm = () => {
    setFormState(BLANK_FORM);
    setResult(null);
    setSaveSuccess(false);
    setValidationError(null);
  };

  const handleScenario = (type: 'safe' | 'risk' | 'borderline') => {
    setValidationError(null);
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
    if (!formState.applicantName.trim()) {
      setValidationError('Please enter the applicant name.');
      return;
    }
    if (!formState.loanAmountRequested) {
      setValidationError('Please enter a requested loan amount.');
      return;
    }
    setValidationError(null);
    setIsAnalyzing(true);
    setTimeout(() => {
      setResult(predictLoanRisk(formState));
      setIsAnalyzing(false);
    }, 300);
  };

  const handleSaveToQueue = () => {
    if (!result) return;
    if (onSaveToQueue) {
      const newApp: LoanApplication = {
        ApplicationID: `APP${Math.floor(1000 + Math.random() * 9000)}`,
        CustomerID: `CUST${Math.floor(1000 + Math.random() * 9000)}`,
        ApplicantName: formState.applicantName || 'Applicant',
        ApplicantAge: typeof formState.applicantAge === 'number' ? formState.applicantAge : 30,
        Gender: (formState.gender as any) || 'Other',
        EmploymentStatus: (formState.employmentStatus as any) || 'Salaried',
        NumberDependents: typeof formState.numberDependents === 'number' ? formState.numberDependents : 0,
        LoanType: (formState.loanType as any) || 'Personal',
        PurposeOfLoan: formState.purposeOfLoan || 'General Funding',
        ApplicationDate: '12-12-2024',
        DateKey: '20241212',
        Day: 12,
        Month: 'December',
        Quarter: 'Q4',
        Year: 2024,
        FraudFlag: result.prediction === 'Fraud' ? 1 : 0,
        FraudType: result.prediction === 'Fraud' ? 'Synthetic Identity' : 'None',
        LoanStatus: result.prediction === 'Fraud' ? 'Rejected' : 'Approved',
        PropertyOwnershipStatus: (formState.propertyOwnership as any) || 'Rented',
        ResidentialAddress: 'Verification Pending',
        LoanAmountRequested: typeof formState.loanAmountRequested === 'number' ? formState.loanAmountRequested : 500000,
        LoanTenureMonths: typeof formState.loanTenureMonths === 'number' ? formState.loanTenureMonths : 36,
        InterestRateOffered: typeof formState.interestRateOffered === 'number' ? formState.interestRateOffered : 12.0,
        MonthlyIncome: typeof formState.monthlyIncome === 'number' ? formState.monthlyIncome : 50000,
        ExistingEMIs: typeof formState.existingEMIs === 'number' ? formState.existingEMIs : 10000,
        DebtToIncomeRatio: computedDTI,
        CIBILScore: typeof formState.cibilScore === 'number' ? formState.cibilScore : 650,
        RiskProbability: result.fraudProbability,
      };

      onSaveToQueue(newApp);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const circumference = 251.2;
  const strokeOffset = result ? circumference - (result.fraudProbability / 100) * circumference : circumference;

  return (
    <section className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] sm:text-[30px] font-bold text-white tracking-tight">
            Fraud Risk Checker
          </h2>
          <p className="text-[14px] sm:text-[15px] text-slate-400 font-normal mt-1 leading-relaxed">
            Real-time inference engine: enter customer profile parameters to generate instant risk probabilities and contributing factors.
          </p>
        </div>
        
        {/* Preset Scenarios + Clear Form */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] sm:text-[14px] text-slate-400 font-medium mr-1">Preload Demo Profile:</span>
          <button
            type="button"
            onClick={() => handleScenario('safe')}
            className="px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#181d24] border border-[#bbf246]/30 text-[13px] sm:text-[14px] font-medium text-[#bbf246] transition-colors cursor-pointer"
          >
            Safe Prime
          </button>
          <button
            type="button"
            onClick={() => handleScenario('borderline')}
            className="px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#181d24] border border-[#fb923c]/30 text-[13px] sm:text-[14px] font-medium text-[#fb923c] transition-colors cursor-pointer"
          >
            Borderline
          </button>
          <button
            type="button"
            onClick={() => handleScenario('risk')}
            className="px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#181d24] border border-[#f43f5e]/30 text-[13px] sm:text-[14px] font-medium text-[#f43f5e] transition-colors cursor-pointer"
          >
            High Risk
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            className="px-3 py-1.5 rounded-xl bg-[#1d232c] hover:bg-[#252e3a] border border-white/10 text-[13px] sm:text-[14px] font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Form</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 rounded-xl bg-[#2a1318] border border-[#f43f5e]/50 text-[13px] sm:text-[14px] font-medium text-[#f43f5e] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Form (7 cols) + Decision Output (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Loan Application Parameters Form */}
        <div className="lg:col-span-7 bg-[#14181d] rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div>
              <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">Application Parameters</h3>
              <p className="text-[13px] sm:text-[14px] text-slate-400 mt-0.5">Input demographic, income, and debt metrics</p>
            </div>
            <button
              type="button"
              onClick={handleClearForm}
              className="text-[12px] sm:text-[13px] text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Applicant Name */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Applicant Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={formState.applicantName}
                  onChange={(e) => setFormState({ ...formState, applicantName: e.target.value })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                />
              </div>

              {/* 2. Applicant Age */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Applicant Age (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 32"
                  min="18"
                  max="80"
                  value={formState.applicantAge}
                  onChange={(e) => setFormState({ ...formState, applicantAge: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 3. Gender */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Gender</label>
                <select
                  value={formState.gender}
                  onChange={(e) => setFormState({ ...formState, gender: e.target.value as any })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 4. Employment Status */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Employment Status</label>
                <select
                  value={formState.employmentStatus}
                  onChange={(e) => setFormState({ ...formState, employmentStatus: e.target.value as any })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                >
                  <option value="">Select Employment Status</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Small Business Owner">Small Business Owner</option>
                  <option value="Freelance / Gig">Freelance / Gig</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              {/* 5. Loan Type */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Loan Type</label>
                <select
                  value={formState.loanType}
                  onChange={(e) => setFormState({ ...formState, loanType: e.target.value as any })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                >
                  <option value="">Select Loan Type</option>
                  <option value="Personal">Personal Loan</option>
                  <option value="Home">Home Loan</option>
                  <option value="Vehicle">Vehicle Loan</option>
                  <option value="Business">Business Loan</option>
                  <option value="Education">Education Loan</option>
                </select>
              </div>

              {/* 6. Purpose of Loan */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Purpose of Loan</label>
                <input
                  type="text"
                  placeholder="e.g. Home Renovation"
                  value={formState.purposeOfLoan}
                  onChange={(e) => setFormState({ ...formState, purposeOfLoan: e.target.value })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                />
              </div>

              {/* 7. Loan Amount Requested */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Loan Amount Requested (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  step="10000"
                  min="25000"
                  value={formState.loanAmountRequested}
                  onChange={(e) => setFormState({ ...formState, loanAmountRequested: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 8. Loan Tenure */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Tenure (Months)</label>
                <input
                  type="number"
                  placeholder="e.g. 36"
                  min="6"
                  max="360"
                  value={formState.loanTenureMonths}
                  onChange={(e) => setFormState({ ...formState, loanTenureMonths: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 9. Interest Rate Offered */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Interest Rate Offered (% p.a.)</label>
                <input
                  type="number"
                  placeholder="e.g. 11.5"
                  step="0.1"
                  min="5"
                  max="36"
                  value={formState.interestRateOffered}
                  onChange={(e) => setFormState({ ...formState, interestRateOffered: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 10. Monthly Income */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Monthly Verified Income (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 60000"
                  min="5000"
                  value={formState.monthlyIncome}
                  onChange={(e) => setFormState({ ...formState, monthlyIncome: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 11. Existing EMIs */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Existing Monthly EMIs (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  min="0"
                  value={formState.existingEMIs}
                  onChange={(e) => setFormState({ ...formState, existingEMIs: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 12. Debt-to-Income Ratio (Auto) */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">
                  Debt-to-Income (DTI) Ratio <span className="text-slate-500 font-normal">(Auto)</span>
                </label>
                <div className="w-full bg-[#181d24]/60 rounded-xl border border-white/10 text-slate-300 text-[13px] sm:text-[14px] px-3.5 py-2 font-mono flex items-center justify-between">
                  <span>{(computedDTI * 100).toFixed(1)}% ({computedDTI})</span>
                  <span className={`text-[11px] sm:text-[12px] font-semibold ${computedDTI > 0.5 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                    {computedDTI > 0.5 ? 'Critical DTI' : 'Healthy'}
                  </span>
                </div>
              </div>

              {/* 13. CIBIL Score */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">CIBIL Score (300 - 900)</label>
                <input
                  type="number"
                  placeholder="e.g. 720"
                  min="300"
                  max="900"
                  value={formState.cibilScore}
                  onChange={(e) => setFormState({ ...formState, cibilScore: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none font-mono"
                />
              </div>

              {/* 14. Property Ownership */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium text-[13px] sm:text-[14px]">Property Ownership</label>
                <select
                  value={formState.propertyOwnership}
                  onChange={(e) => setFormState({ ...formState, propertyOwnership: e.target.value as any })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-[13px] sm:text-[14px] px-3.5 py-2 focus:border-[#bbf246] focus:outline-none"
                >
                  <option value="">Select Ownership</option>
                  <option value="Owned">Owned</option>
                  <option value="Rented">Rented</option>
                  <option value="Mortgaged">Mortgaged</option>
                </select>
              </div>
            </div>

            {/* Form Submit & Clear Action Buttons */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex-1 bg-[#bbf246] text-[#0a0c0e] font-semibold py-2.5 px-4 rounded-xl hover:bg-[#a3e635] transition-all text-[13px] sm:text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(187,242,70,0.35)] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAnalyzing ? 'Analyzing Application Parameters...' : 'Analyze Application'}</span>
              </button>
              <button
                type="button"
                onClick={handleClearForm}
                className="py-2.5 px-4 rounded-xl bg-[#181d24] hover:bg-[#202732] border border-white/10 text-slate-300 hover:text-white font-medium text-[13px] sm:text-[14px] transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Prediction Verdict Card or Empty State */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {!result ? (
            /* Empty State: Awaiting Application Data */
            <div className="bg-[#14181d] rounded-2xl p-8 border border-white/10 flex flex-col items-center justify-center text-center min-h-[460px]">
              <div className="w-14 h-14 rounded-2xl bg-[#181d24] border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <ShieldAlert className="w-7 h-7 text-[#bbf246]/60" />
              </div>
              <h3 className="text-[17px] sm:text-[18px] font-semibold text-white mb-2">Awaiting Application Data</h3>
              <p className="text-[13px] sm:text-[14px] text-slate-400 max-w-xs leading-relaxed mb-6">
                Fill in the applicant details on the left, or select a preset demo profile above, then click <strong className="text-white font-medium">"Analyze Application"</strong> to compute real-time risk scores.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs text-[12px] sm:text-[13px] text-slate-400 font-mono">
                <div className="p-2.5 rounded-xl bg-[#181d24] border border-white/5 flex items-center justify-between">
                  <span>Random Forest Engine:</span>
                  <span className="text-[#bbf246]">Ready</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#181d24] border border-white/5 flex items-center justify-between">
                  <span>XGBoost Gradient Tree:</span>
                  <span className="text-[#bbf246]">Ready</span>
                </div>
              </div>
            </div>
          ) : (
            /* Verdict Displayed */
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
                  <span className="text-[11px] sm:text-[12px] uppercase tracking-wider font-semibold text-slate-400">
                    ML Evaluation Verdict
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-wide ${
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

                {/* Radial Gauge Meter */}
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
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span
                        className={`text-[28px] sm:text-[30px] font-bold tracking-tight font-mono ${
                          result.riskLevel === 'HIGH RISK'
                            ? 'text-[#f43f5e]'
                            : result.riskLevel === 'MEDIUM RISK'
                            ? 'text-[#fb923c]'
                            : 'text-[#bbf246]'
                        }`}
                      >
                        {result.fraudProbability}%
                      </span>
                      <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        Fraud Risk
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-[15px] sm:text-[16px] font-semibold text-white mb-1">
                      Classification: {result.prediction}
                    </div>
                    <p className="text-[13px] sm:text-[14px] text-slate-300 max-w-sm leading-relaxed">
                      {result.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contributing Factors Breakdown */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="text-[11px] sm:text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
                  Top Contributing Risk Drivers
                </div>
                <div className="space-y-2 text-[12px] sm:text-[13px]">
                  {result.contributingFactors.map((f, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#181d24] border border-white/5">
                      <div className="flex items-center justify-between mb-1.5 font-medium">
                        <span className="text-slate-200">{f.factor}</span>
                        <span
                          className={`font-mono text-[12px] sm:text-[13px] font-semibold ${
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

                {/* Save to Queue Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToQueue}
                    className="w-full py-2 px-4 rounded-xl bg-[#1d232c] hover:bg-[#252e3a] border border-white/10 text-white text-[12px] sm:text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#bbf246]" />
                        <span className="text-[#bbf246]">Saved to Active Portfolio!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-slate-400" />
                        <span>Save Application to Review Queue</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
