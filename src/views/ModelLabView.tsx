import React, { useState } from 'react';
import { 
  FlaskConical, 
  ArrowRight, 
  Activity, 
  Zap, 
  Info,
  CheckCircle2,
  Sliders,
  Layers
} from 'lucide-react';
import { ModelMetric } from '../types';
import { MODELS_DATA } from '../services/dataService';

interface ModelLabViewProps {
  onNavigateToChecker: () => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({ onNavigateToChecker }) => {
  const [selectedKey, setSelectedKey] = useState<string>('rf');
  
  // Standard 5 evaluated models in logical sequence
  const modelKeys = ['lr', 'dt', 'nb', 'rf', 'xgb'];
  const activeModel: ModelMetric = MODELS_DATA[selectedKey] || MODELS_DATA['rf'];

  return (
    <section className="flex flex-col gap-6 sm:gap-7">
      {/* Page Title & Subtitle (28-30px font title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] sm:text-[30px] font-bold text-white tracking-tight">
            Model Lab
          </h2>
          <p className="text-[14px] sm:text-[15px] text-slate-400 font-normal mt-1 leading-relaxed">
            Comparative benchmarking workspace for fraud classification models evaluated on 20% holdout test set (1,000 samples).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToChecker}
            className="px-3.5 py-2 bg-[#bbf246] text-[#0a0c0e] text-[13px] sm:text-[14px] font-semibold rounded-xl hover:bg-[#a3e635] transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_-3px_rgba(187,242,70,0.3)]"
          >
            <span>Test Active Model in Checker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. FIRST MAJOR SECTION AT TOP: Comprehensive Model Comparison Table */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight flex items-center gap-2.5">
              <FlaskConical className="w-5 h-5 text-[#bbf246]" />
              <span>Model Comparison Matrix</span>
            </h3>
            <p className="text-[13px] sm:text-[14px] text-slate-400 mt-1">
              Evaluated across holdout test set (1,000 samples) with SMOTE preprocessed class balancing. Click any row to inspect deep dive evaluation.
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] font-medium bg-[#181d24] text-slate-300 border border-white/10 font-mono">
            Demo Benchmark Data
          </span>
        </div>

        {/* Model Comparison Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-[13px] sm:text-[14px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[11px] sm:text-[12px]">
                <th className="pb-3 px-4">Algorithm</th>
                <th className="pb-3 px-4">Accuracy</th>
                <th className="pb-3 px-4">Precision</th>
                <th className="pb-3 px-4">Recall</th>
                <th className="pb-3 px-4">F1 Score</th>
                <th className="pb-3 px-4">ROC-AUC</th>
                <th className="pb-3 px-4">PR-AUC</th>
                <th className="pb-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {modelKeys.map((key) => {
                const m = MODELS_DATA[key];
                const isSelected = key === selectedKey;
                return (
                  <tr
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#181d24] text-white font-medium border-l-4 border-l-[#bbf246]' 
                        : 'text-slate-300 hover:bg-[#181d24]/50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#bbf246]' : 'bg-slate-600'}`} />
                        <div>
                          <span className="text-white font-semibold text-[14px] block">{m.name}</span>
                          <span className="text-[11px] sm:text-[12px] text-slate-400 font-mono">{m.badge}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px]">{m.accuracy}%</td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px]">{m.precision}%</td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px]">{m.recall}%</td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px]">{m.f1}%</td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px] font-semibold text-[#bbf246]">{m.rocAuc}</td>
                    <td className="py-3 px-4 font-mono text-[13px] sm:text-[14px]">{m.prAuc}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKey(key);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-[#bbf246] text-[#0a0c0e] font-semibold' 
                            : 'bg-[#14181d] text-slate-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {isSelected ? 'Inspecting' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] sm:text-[12px] text-slate-500 mt-3 font-mono">
          Note: Benchmark results are displayed without arbitrary winner declarations. Real-world model selection reflects trade-offs between precision, recall, and operational latency.
        </p>
      </div>

      {/* Model Selector Bar (Keep selector conveniently available) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Switch Active Model
          </span>
          <span className="text-[11px] sm:text-[12px] text-slate-400">
            Selected: <strong className="text-white font-medium">{activeModel.name}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {modelKeys.map((key) => {
            const m = MODELS_DATA[key];
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#181d24] border-[#bbf246] shadow-[0_0_15px_-3px_rgba(187,242,70,0.2)] ring-1 ring-[#bbf246]'
                    : 'bg-[#14181d] border-white/10 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] sm:text-[14px] font-semibold text-white truncate">{m.name}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-[#bbf246] text-[#0a0c0e] font-semibold' : 'bg-[#181d24] text-slate-400'
                  }`}>
                    {m.inferenceMs}
                  </span>
                </div>
                <div className="text-[11px] sm:text-[12px] text-slate-400 truncate">{m.badge}</div>
                <div className={`mt-2 text-[12px] font-mono font-medium ${isSelected ? 'text-[#bbf246]' : 'text-slate-300'}`}>
                  ROC-AUC: {m.rocAuc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DETAILED EVALUATION SECTION FOR SELECTED MODEL */}
      {/* Active Model Deep Dive Banner */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-[18px] sm:text-[20px] font-bold text-white">{activeModel.name}</h3>
              <span className="px-2.5 py-0.5 rounded text-[11px] sm:text-[12px] font-semibold bg-[#bbf246]/20 text-[#bbf246] font-mono">
                {activeModel.badge}
              </span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-slate-300 max-w-3xl leading-relaxed">
              {activeModel.description}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase block font-mono">Inference Latency</span>
              <span className="text-[14px] sm:text-[15px] font-semibold text-[#bbf246] font-mono">{activeModel.inferenceMs} avg</span>
            </div>
          </div>
        </div>

        {/* 6 Key Performance Metrics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-5">
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">Accuracy</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-white font-mono mt-1 block">{activeModel.accuracy}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">Precision</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-[#bbf246] font-mono mt-1 block">{activeModel.precision}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">Recall</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-[#f43f5e] font-mono mt-1 block">{activeModel.recall}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">F1-Score</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-white font-mono mt-1 block">{activeModel.f1}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">ROC-AUC</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-[#bbf246] font-mono mt-1 block">{activeModel.rocAuc}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[11px] sm:text-[12px] text-slate-400 block uppercase font-medium">PR-AUC</span>
            <span className="text-[26px] sm:text-[28px] font-bold text-white font-mono mt-1 block">{activeModel.prAuc}</span>
          </div>
        </div>
      </div>

      {/* 2-Column: Confusion Matrix + Feature Importance Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Confusion Matrix Display */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[17px] sm:text-[18px] font-bold text-white tracking-tight">Confusion Matrix (1,000 Test Records)</h4>
              <span className="text-[11px] sm:text-[12px] px-2.5 py-0.5 rounded bg-[#181d24] text-slate-300 font-mono">
                Holdout Test Set
              </span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-slate-400 mb-4">
              Detailed breakdown of true positives, false alarms, and missed fraud cases for {activeModel.name}.
            </p>

            {/* 2x2 Matrix */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto my-2">
              {/* True Negative */}
              <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10 text-center">
                <span className="text-[11px] sm:text-[12px] text-slate-400 block font-medium">True Negative (TN)</span>
                <span className="text-[24px] sm:text-[26px] font-bold text-[#bbf246] font-mono block mt-0.5">{activeModel.tn}</span>
                <span className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5 block">Genuine Classified Correct</span>
              </div>

              {/* False Positive */}
              <div className="p-3.5 rounded-xl bg-[#181d24] border border-[#fb923c]/30 text-center">
                <span className="text-[11px] sm:text-[12px] text-[#fb923c] block font-medium">False Positive (FP)</span>
                <span className="text-[24px] sm:text-[26px] font-bold text-[#fb923c] font-mono block mt-0.5">{activeModel.fp}</span>
                <span className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5 block">False Alarm (Genuine as Fraud)</span>
              </div>

              {/* False Negative */}
              <div className="p-3.5 rounded-xl bg-[#181d24] border border-[#f43f5e]/30 text-center">
                <span className="text-[11px] sm:text-[12px] text-[#f43f5e] block font-medium">False Negative (FN)</span>
                <span className="text-[24px] sm:text-[26px] font-bold text-[#f43f5e] font-mono block mt-0.5">{activeModel.fn}</span>
                <span className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5 block">Missed Fraud Leakage</span>
              </div>

              {/* True Positive */}
              <div className="p-3.5 rounded-xl bg-[#181d24] border border-white/10 text-center">
                <span className="text-[11px] sm:text-[12px] text-[#bbf246] block font-medium">True Positive (TP)</span>
                <span className="text-[24px] sm:text-[26px] font-bold text-[#bbf246] font-mono block mt-0.5">{activeModel.tp}</span>
                <span className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5 block">Correctly Caught Fraud</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] sm:text-[12px] text-slate-400 font-mono">
            <span>Specificity: {((activeModel.tn / (activeModel.tn + activeModel.fp)) * 100).toFixed(1)}%</span>
            <span>Sensitivity / Recall: {((activeModel.tp / (activeModel.tp + activeModel.fn)) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Feature Importance Distribution */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[17px] sm:text-[18px] font-bold text-white tracking-tight">Feature Importance Weights</h4>
              <span className="text-[11px] sm:text-[12px] text-slate-400 font-mono">Gini / Permutation</span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-slate-400 mb-4">
              Top predictive attributes driving the fraud risk classification for {activeModel.name}.
            </p>

            <div className="flex flex-col gap-3">
              {activeModel.features.map((feat) => (
                <div key={feat.name}>
                  <div className="flex items-center justify-between text-[13px] sm:text-[14px] mb-1">
                    <span className="text-slate-200 font-medium">{feat.name}</span>
                    <span className="text-[12px] font-mono font-semibold text-[#bbf246]">
                      {(feat.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#181d24] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#bbf246] h-full rounded-full transition-all duration-500"
                      style={{ width: `${feat.weight * 100 * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] sm:text-[12px] text-slate-400 flex items-center justify-between">
            <span>Normalized relative importance</span>
            <span className="text-[#bbf246] font-medium">Ranked by discriminative power</span>
          </div>
        </div>
      </div>

      {/* Receiver Operating Characteristic (ROC Curve) */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-[17px] sm:text-[18px] font-bold text-white tracking-tight">Receiver Operating Characteristic (ROC Curve)</h4>
            <p className="text-[13px] sm:text-[14px] text-slate-400 mt-0.5">
              Trade-off between True Positive Rate (Sensitivity) and False Positive Rate (1 - Specificity) across probability thresholds.
            </p>
          </div>
          <span className="text-[12px] sm:text-[13px] font-mono text-[#bbf246] font-semibold self-start sm:self-center px-3 py-1 bg-[#181d24] rounded-lg border border-white/10">
            AUC = {activeModel.rocAuc}
          </span>
        </div>

        <div className="w-full h-48 sm:h-56 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
            {/* Grid lines */}
            <line stroke="rgba(255,255,255,0.05)" x1="0" x2="600" y1="45" y2="45" />
            <line stroke="rgba(255,255,255,0.05)" x1="0" x2="600" y1="90" y2="90" />
            <line stroke="rgba(255,255,255,0.05)" x1="0" x2="600" y1="135" y2="135" />
            <line stroke="rgba(255,255,255,0.1)" x1="0" x2="600" y1="180" y2="180" />

            {/* Diagonal Baseline (Random Classifier) */}
            <line stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" x1="0" y1="180" x2="600" y2="0" />

            {/* Active Model ROC Curve */}
            <path
              d="M 0,180 C 15,30 80,12 600,0"
              fill="none"
              stroke="#bbf246"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Fill under ROC curve */}
            <path
              d="M 0,180 C 15,30 80,12 600,0 L 600,180 Z"
              fill="#bbf246"
              fillOpacity="0.08"
            />
          </svg>
          <div className="flex justify-between text-[11px] sm:text-[12px] text-slate-400 font-mono pt-2">
            <span>FPR: 0.0 (High Specificity)</span>
            <span>FPR: 0.50</span>
            <span>FPR: 1.0 (Low Specificity)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
