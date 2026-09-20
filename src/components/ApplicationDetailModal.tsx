import React from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  IndianRupee, 
  FileText, 
  Calendar, 
  Download,
  AlertTriangle,
  Building,
  CreditCard
} from 'lucide-react';
import { LoanApplication } from '../types';

interface ApplicationDetailModalProps {
  application: LoanApplication | null;
  onClose: () => void;
  onUpdateStatus?: (appId: string, status: 'Approved' | 'Rejected' | 'Under Review') => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
  onUpdateStatus,
}) => {
  if (!application) return null;

  const isFraud = application.FraudFlag === 1;

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(application, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${application.ApplicationID}_dossier.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#14181d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                isFraud ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : 'bg-[#bbf246]/20 text-[#bbf246]'
              }`}
            >
              {isFraud ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{application.ApplicantName}</h3>
                <span className="text-xs font-mono text-slate-400">({application.ApplicationID})</span>
              </div>
              <p className="text-xs text-slate-400">
                Customer ID: {application.CustomerID} • Submitted on {application.ApplicationDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status & Risk Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isFraud
                ? 'bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e]'
                : 'bg-[#bbf246]/10 border-[#bbf246]/30 text-[#bbf246]'
            }`}
          >
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">
                {isFraud ? 'Suspected High-Risk Application' : 'Low-Risk Qualified Application'}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Fraud Flag: <strong>{isFraud ? '1 (Flagged Fraud)' : '0 (Genuine)'}</strong> • Fraud Pattern:{' '}
                <strong>{application.FraudType}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono block text-slate-400">Model Probability</span>
              <span className="text-xl font-mono font-black">
                {Math.round((application.RiskProbability || 0.08) * 100)}%
              </span>
            </div>
          </div>

          {/* Demographics & KYC */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-[10px] text-slate-400">
              Applicant Profile & Demographics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-3.5 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-[10px]">Age / Gender</span>
                <span className="text-white font-medium">{application.ApplicantAge} yrs • {application.Gender}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Employment</span>
                <span className="text-white font-medium">{application.EmploymentStatus}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Dependents</span>
                <span className="text-white font-medium">{application.NumberDependents}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Property</span>
                <span className="text-white font-medium">{application.PropertyOwnershipStatus}</span>
              </div>
            </div>
          </div>

          {/* Financial Profile & Credit Metrics */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-[10px] text-slate-400">
              Financial Standing & Credit History
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-3.5 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-[10px]">Monthly Income</span>
                <span className="text-white font-mono font-bold">
                  ₹{application.MonthlyIncome.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Existing EMIs</span>
                <span className="text-white font-mono font-bold">
                  ₹{application.ExistingEMIs.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CIBIL Score</span>
                <span className={`font-mono font-bold ${application.CIBILScore < 600 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                  {application.CIBILScore}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Debt-to-Income (DTI)</span>
                <span className={`font-mono font-bold ${application.DebtToIncomeRatio > 0.5 ? 'text-[#f43f5e]' : 'text-white'}`}>
                  {application.DebtToIncomeRatio}
                </span>
              </div>
            </div>
          </div>

          {/* Requested Loan Details */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-[10px] text-slate-400">
              Loan Request Terms
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-3.5 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-[10px]">Amount Requested</span>
                <span className="text-white font-mono font-bold">
                  ₹{application.LoanAmountRequested.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Loan Category</span>
                <span className="text-white font-medium">{application.LoanType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tenure</span>
                <span className="text-white font-medium">{application.LoanTenureMonths} Months</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Interest Rate</span>
                <span className="text-white font-mono">{application.InterestRateOffered}% p.a.</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Stated Loan Purpose</span>
            <p className="text-slate-300 mt-1 bg-[#181d24] p-3 rounded-xl border border-white/10">
              {application.PurposeOfLoan}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#181d24] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleDownloadJSON}
            className="px-3 py-2 rounded-xl bg-[#14181d] hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Dossier</span>
          </button>

          <div className="flex items-center gap-2">
            {onUpdateStatus && (
              <>
                <button
                  onClick={() => {
                    onUpdateStatus(application.ApplicationID, 'Rejected');
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#f43f5e]/20 text-[#f43f5e] hover:bg-[#f43f5e]/30 text-xs font-bold transition-colors"
                >
                  Confirm Fraud / Reject
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(application.ApplicationID, 'Approved');
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#bbf246] text-[#0a0c0e] hover:bg-[#a3e635] text-xs font-bold transition-all"
                >
                  Approve Application
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
