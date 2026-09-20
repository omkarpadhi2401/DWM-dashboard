import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Cpu,
  Layers,
  Award
} from 'lucide-react';
import { KPIMetrics } from '../types';
import { MODELS_DATA } from '../services/dataService';

interface ReportsViewProps {
  kpis: KPIMetrics;
  onExportCSV: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ kpis, onExportCSV }) => {
  const handlePrint = () => {
    window.print();
  };

  const genuinePct = kpis.totalApplications > 0
    ? ((kpis.genuineApplications / kpis.totalApplications) * 100).toFixed(2)
    : '0.00';

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Executive Fraud & Risk Report
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Academic mini-project synthesis: Model evaluations, empirical findings, and portfolio loss mitigation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#181d24] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#bbf246] text-[#0a0c0e] hover:bg-[#a3e635] text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_18px_-2px_rgba(187,242,70,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Cleaned CSV</span>
          </button>
        </div>
      </div>

      {/* Section 1: Executive Fraud Summary - CALCULATED FROM DATA */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#bbf246]" />
          <h3 className="font-bold text-white text-base">1. Fraud Summary & Exposure (Calculated from Dataset)</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Analysis of <strong>{kpis.totalApplications.toLocaleString()} loan applications</strong> retrieved from the verified live SheetDB API revealed{' '}
          <strong>{kpis.fraudulentApplications.toLocaleString()} fraudulent applications ({kpis.fraudRate}%)</strong> against{' '}
          <strong>{kpis.genuineApplications.toLocaleString()} genuine applications ({genuinePct}%)</strong>.
          The average fraudulent loan amount requested was <strong>₹{kpis.avgFraudAmount} Lakhs</strong> compared to genuine applications (<strong>₹{kpis.avgGenuineAmount} Lakhs</strong>).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block">Total Live Applications</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">
              {kpis.totalApplications.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block">Identified Fraud Exposure</span>
            <span className="text-lg font-black text-[#f43f5e] font-mono mt-0.5 block">
              ₹{kpis.estFraudPreventedCr} Crores
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block">Baseline Genuine Rate</span>
            <span className="text-lg font-black text-[#bbf246] font-mono mt-0.5 block">
              {genuinePct}%
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block">Dataset Fraud Rate</span>
            <span className="text-lg font-black text-[#fb923c] font-mono mt-0.5 block">
              {kpis.fraudRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Model Performance Benchmarking */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-5 h-5 text-[#bbf246]" />
          <h3 className="font-bold text-white text-base">2. Model Performance Benchmarks</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Supervised machine learning architectures evaluated on loan data with SMOTE class balancing.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Model</th>
                <th className="pb-3 px-3">Accuracy</th>
                <th className="pb-3 px-3">Precision</th>
                <th className="pb-3 px-3">Recall</th>
                <th className="pb-3 px-3">F1 Score</th>
                <th className="pb-3 px-3">ROC-AUC</th>
                <th className="pb-3 px-3">Inference Time</th>
                <th className="pb-3 px-3 text-right">Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.values(MODELS_DATA).map((model) => (
                <tr key={model.id} className="hover:bg-[#181d24]/50">
                  <td className="py-3 px-3 font-semibold text-white">
                    {model.name}
                    {model.badge && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#bbf246]/20 text-[#bbf246] font-bold">
                        {model.badge}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono">{model.accuracy}%</td>
                  <td className="py-3 px-3 font-mono">{model.precision}%</td>
                  <td className="py-3 px-3 font-mono">{model.recall}%</td>
                  <td className="py-3 px-3 font-mono font-bold text-[#bbf246]">{model.f1}%</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">{model.rocAuc}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{model.inferenceMs}</td>
                  <td className="py-3 px-3 text-right">
                    {model.id === 'rf' ? (
                      <span className="text-[#bbf246] font-bold text-[10px]">Production Choice</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Key Fraud Drivers */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-[#bbf246]" />
          <h3 className="font-bold text-white text-base">3. Feature Importance & Empirical Drivers</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Feature importance attribution extracted via Random Forest Gini impurity and XGBoost gain metrics:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[#f43f5e] font-bold block mb-1">1. CIBIL Score (&lt; 580)</span>
            <p className="text-slate-300 text-[11px]">
              Strongest non-linear predictor. Applications with credit scores below 580 coupled with elevated loan amounts exhibited highest risk clustering.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[#fb923c] font-bold block mb-1">2. Debt-to-Income (DTI &gt; 50%)</span>
            <p className="text-slate-300 text-[11px]">
              Accounts for extreme variance. Borrowers whose existing debt obligations exceed 50% of monthly income show higher default and fraud probabilities.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[#bbf246] font-bold block mb-1">3. Employment & Unsecured Products</span>
            <p className="text-slate-300 text-[11px]">
              Personal loan applications filed by self-employed applicants showed the highest propensity for synthetic identity and income misrepresentation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
