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
        className="bg-[#14181d] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#181d24]">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${
                isFraud ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : 'bg-[#bbf246]/20 text-[#bbf246]'
              }`}
            >
              {isFraud ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black text-white">{application.ApplicantName}</h3>
                <span className="text-sm font-mono text-slate-400 font-bold">({application.ApplicationID})</span>
              </div>
              <p className="text-[15px] text-slate-400 mt-0.5">
                Customer ID: <span className="font-mono text-slate-300 font-semibold">{application.CustomerID}</span> • Submitted on {application.ApplicationDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-[15px]">
          {/* Status & Risk Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isFraud
                ? 'bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e]'
                : 'bg-[#bbf246]/10 border-[#bbf246]/30 text-[#bbf246]'
            }`}
          >
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                {isFraud ? 'Suspected High-Risk Loan Application' : 'Low-Risk Qualified Loan Application'}
              </div>
              <div className="text-[15px] text-slate-300 mt-1">
                Fraud Flag: <strong className="font-mono">{isFraud ? '1 (Flagged Fraud)' : '0 (Genuine)'}</strong> • Fraud Pattern:{' '}
                <strong>{application.FraudType || 'None'}</strong> • Loan Status: <strong>{application.LoanStatus}</strong>
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-xs uppercase font-mono block text-slate-400">Risk Probability</span>
              <span className="text-2xl font-mono font-black">
                {Math.round((application.RiskProbability || 0.08) * 100)}%
              </span>
            </div>
          </div>

          {/* Demographics & Applicant Details */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-xs text-slate-400">
              Applicant Profile & Demographics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-xs">Age / Gender</span>
                <span className="text-white font-medium text-[15px]">{application.ApplicantAge} yrs • {application.Gender}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Employment</span>
                <span className="text-white font-medium text-[15px]">{application.EmploymentStatus}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Dependents</span>
                <span className="text-white font-medium text-[15px]">{application.NumberDependents}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Property</span>
                <span className="text-white font-medium text-[15px]">{application.PropertyOwnershipStatus}</span>
              </div>
            </div>
          </div>

          {/* Financial Profile & Credit Standing */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-xs text-slate-400">
              Financial Standing & Credit History
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-xs">Monthly Income</span>
                <span className="text-white font-mono font-bold text-[15px]">
                  ₹{application.MonthlyIncome.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Existing EMIs</span>
                <span className="text-white font-mono font-bold text-[15px]">
                  ₹{application.ExistingEMIs.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">CIBIL Score</span>
                <span className={`font-mono font-bold text-[15px] ${application.CIBILScore < 600 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                  {application.CIBILScore}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Debt-to-Income (DTI)</span>
                <span className={`font-mono font-bold text-[15px] ${application.DebtToIncomeRatio > 40 ? 'text-[#f43f5e]' : 'text-white'}`}>
                  {application.DebtToIncomeRatio}%
                </span>
              </div>
            </div>
          </div>

          {/* Requested Loan Details */}
          <div>
            <h4 className="font-bold text-white mb-2.5 uppercase tracking-wider text-xs text-slate-400">
              Loan Request Terms
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181d24] p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-500 block text-xs">Amount Requested</span>
                <span className="text-white font-mono font-bold text-[15px]">
                  ₹{application.LoanAmountRequested.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Loan Category</span>
                <span className="text-white font-medium text-[15px]">{application.LoanType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Tenure</span>
                <span className="text-white font-medium text-[15px]">{application.LoanTenureMonths} Months</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Interest Rate</span>
                <span className="text-white font-mono text-[15px]">{application.InterestRateOffered}% p.a.</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block text-xs">Stated Loan Purpose</span>
            <p className="text-slate-200 mt-1 bg-[#181d24] p-3.5 rounded-xl border border-white/10 text-[15px] leading-relaxed">
              {application.PurposeOfLoan}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#181d24] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleDownloadJSON}
            className="px-4 py-2.5 rounded-xl bg-[#14181d] hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Dossier</span>
          </button>

          <div className="flex items-center gap-2.5">
            {onUpdateStatus && (
              <>
                <button
                  onClick={() => {
                    onUpdateStatus(application.ApplicationID, 'Rejected');
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#f43f5e]/20 text-[#f43f5e] hover:bg-[#f43f5e]/30 text-sm font-bold transition-colors cursor-pointer"
                >
                  Confirm Fraud / Reject
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(application.ApplicationID, 'Approved');
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#bbf246] text-[#0a0c0e] hover:bg-[#a3e635] text-sm font-bold transition-all cursor-pointer shadow-[0_0_15px_-3px_rgba(187,242,70,0.3)]"
                >
                  Approve Application
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
