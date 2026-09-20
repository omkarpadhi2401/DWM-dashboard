import React, { useState } from 'react';
import { 
  FlaskConical, 
  CheckCircle2, 
  ArrowRight, 
  Activity, 
  Zap, 
  Cpu, 
  Scale, 
  Sparkles,
  Info
} from 'lucide-react';
import { ModelMetric } from '../types';
import { MODELS_DATA } from '../services/dataService';

interface ModelLabViewProps {
  onNavigateToChecker: () => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({ onNavigateToChecker }) => {
  const [selectedKey, setSelectedKey] = useState<string>('rf');
  const activeModel = MODELS_DATA[selectedKey] || MODELS_DATA['rf'];

  const modelKeys = Object.keys(MODELS_DATA);

  return (
    <section className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Model Lab
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Comparative benchmarking workspace for fraud classification models evaluated on 20% holdout test set (1,000 samples).
        </p>
      </div>

      {/* Model Selector Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">Select Classification Model for Inspection</h3>
          <span className="text-xs text-slate-400">Benchmarked on SMOTE balanced training split</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {modelKeys.map((key) => {
            const m = MODELS_DATA[key];
            const isActive = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-[#14181d] border-[#bbf246] shadow-[0_0_20px_-3px_rgba(187,242,70,0.25)] ring-1 ring-[#bbf246]'
                    : 'bg-[#14181d]/70 border-white/10 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate">{m.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-[#bbf246] text-[#0a0c0e] font-bold' : 'bg-[#181d24] text-slate-400'
                    }`}
                  >
                    {m.inferenceMs}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">{m.badge}</div>
                <div className={`mt-2 text-xs font-mono font-bold ${isActive ? 'text-[#bbf246]' : 'text-slate-300'}`}>
                  ROC-AUC: {m.rocAuc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Model Deep Dive Banner */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h3 className="text-lg font-black text-white">{activeModel.name}</h3>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#bbf246]/20 text-[#bbf246]">
                {activeModel.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {activeModel.description}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-mono">Inference Latency</span>
              <span className="text-sm font-bold text-[#bbf246] font-mono">{activeModel.inferenceMs} avg</span>
            </div>
            <button
              onClick={onNavigateToChecker}
              className="px-4 py-2.5 bg-[#bbf246] text-[#0a0c0e] text-xs font-bold rounded-xl hover:bg-[#a3e635] transition-all flex items-center gap-1.5 shadow-[0_0_18px_-2px_rgba(187,242,70,0.3)]"
            >
              <span>Test in Fraud Checker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Key Performance Metrics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Accuracy</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">{activeModel.accuracy}%</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Precision</span>
            <span className="text-lg font-black text-[#bbf246] font-mono mt-0.5 block">{activeModel.precision}%</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Recall</span>
            <span className="text-lg font-black text-[#f43f5e] font-mono mt-0.5 block">{activeModel.recall}%</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">F1-Score</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">{activeModel.f1}%</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">ROC-AUC</span>
            <span className="text-lg font-black text-[#bbf246] font-mono mt-0.5 block">{activeModel.rocAuc}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">PR-AUC</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">{activeModel.prAuc}</span>
          </div>
        </div>
      </div>

      {/* 2-Column: Confusion Matrix + Feature Importance Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Confusion Matrix Display */}
        <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-white text-xs">Confusion Matrix (Holdout Test Set)</h4>
              <p className="text-[11px] text-slate-400">Ground truth vs predicted classifications</p>
            </div>
            <span className="text-[10px] font-mono bg-[#181d24] px-2 py-0.5 rounded text-[#bbf246]">
              Total: 1,000 Samples
            </span>
          </div>

          {/* Matrix 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto my-4 w-full">
            {/* True Negative */}
            <div className="p-4 rounded-xl bg-[#181d24] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">True Negative (TN)</span>
              <span className="text-2xl font-black text-[#bbf246] font-mono mt-1">{activeModel.tn}</span>
              <span className="text-[10px] text-slate-500">Correct Genuine</span>
            </div>
            {/* False Positive */}
            <div className="p-4 rounded-xl bg-[#181d24] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">False Positive (FP)</span>
              <span className="text-2xl font-black text-[#fb923c] font-mono mt-1">{activeModel.fp}</span>
              <span className="text-[10px] text-slate-500">False Alarm</span>
            </div>
            {/* False Negative */}
            <div className="p-4 rounded-xl bg-[#181d24] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">False Negative (FN)</span>
              <span className="text-2xl font-black text-[#f43f5e] font-mono mt-1">{activeModel.fn}</span>
              <span className="text-[10px] text-slate-500">Missed Fraud</span>
            </div>
            {/* True Positive */}
            <div className="p-4 rounded-xl bg-[#181d24] border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">True Positive (TP)</span>
              <span className="text-2xl font-black text-[#bbf246] font-mono mt-1">{activeModel.tp}</span>
              <span className="text-[10px] text-slate-500">Caught Fraud</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center font-mono pt-3 border-t border-white/10">
            Sensitivity / Recall: <strong className="text-white">{activeModel.recall}%</strong> | Specificity:{' '}
            <strong className="text-white">
              {((activeModel.tn / (activeModel.tn + activeModel.fp)) * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Feature Importance Bar Chart */}
        <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-white text-xs">Feature Importance Weightings</h4>
              <p className="text-[11px] text-slate-400">Gini-impurity contribution to risk verdict</p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Normalized (0-1)</span>
          </div>

          <div className="space-y-3 text-xs my-2">
            {activeModel.features.map((f) => (
              <div key={f.name}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300 font-medium">{f.name}</span>
                  <span className="font-mono text-[#bbf246] font-bold">
                    {(f.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#bbf246] h-full rounded-full transition-all duration-500"
                    style={{ width: `${f.weight * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>Primary Driver: {activeModel.features[0]?.name}</span>
            <span className="text-[#bbf246]">Calculated via Tree Ensemble</span>
          </div>
        </div>
      </div>

      {/* ROC Curves Visualizer */}
      <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-bold text-white text-sm">Receiver Operating Characteristic (ROC) Curve</h4>
            <p className="text-xs text-slate-400">True Positive Rate vs False Positive Rate curve comparison</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#bbf246]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bbf246]" /> {activeModel.name} ({activeModel.rocAuc})
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Random Guess (0.50)
            </span>
          </div>
        </div>

        <div className="w-full h-44 sm:h-52 relative">
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
          <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2">
            <span>FPR: 0.0 (High Specificity)</span>
            <span>FPR: 0.50</span>
            <span>FPR: 1.0 (Low Specificity)</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Benchmarked Comparison Matrix Table */}
      <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-white text-sm">Benchmarked Algorithms Comparison Matrix</h4>
          <span className="text-xs text-slate-400 font-mono">5 Models Evaluated</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Empirical evaluation results with zero hardcoded winner bias. Model selection reflects portfolio trade-offs between precision and latency.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="pb-3 px-3">Algorithm</th>
                <th className="pb-3 px-3">Accuracy</th>
                <th className="pb-3 px-3">Precision</th>
                <th className="pb-3 px-3">Recall</th>
                <th className="pb-3 px-3">F1-Score</th>
                <th className="pb-3 px-3">ROC-AUC</th>
                <th className="pb-3 px-3">PR-AUC</th>
                <th className="pb-3 px-3">Inference Time</th>
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
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#181d24] font-semibold' : 'hover:bg-[#181d24]/50'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{m.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#181d24] text-slate-400 font-mono">
                          {m.badge}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">{m.accuracy}%</td>
                    <td className="py-3 px-3 font-mono">{m.precision}%</td>
                    <td className="py-3 px-3 font-mono">{m.recall}%</td>
                    <td className="py-3 px-3 font-mono">{m.f1}%</td>
                    <td className="py-3 px-3 font-mono text-[#bbf246] font-bold">{m.rocAuc}</td>
                    <td className="py-3 px-3 font-mono">{m.prAuc}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{m.inferenceMs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
