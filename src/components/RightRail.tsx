import React from 'react';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  Radio, 
  X,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { FRAUD_ALERTS, PIPELINE_ACTIVITIES } from '../services/dataService';

interface RightRailProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPipelineModal: () => void;
  datasetCount?: number;
}

export const RightRail: React.FC<RightRailProps> = ({
  isOpen,
  onClose,
  onOpenPipelineModal,
  datasetCount = 5000,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 shrink-0 bg-[#0f1216] border-l border-white/10 flex flex-col justify-between p-5 select-none overflow-y-auto h-full z-20">
      <div className="flex flex-col gap-6">
        {/* Header with Close on Mobile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">Fraud Alerts</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f43f5e]/20 text-[#f43f5e] font-bold font-mono">
              {FRAUD_ALERTS.length} New
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#14181d] lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Overview Status Badge */}
        <div className="p-3 rounded-xl bg-[#14181d] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bbf246] animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-white">System Active</div>
              <div className="text-[10px] text-slate-400 font-mono">{datasetCount.toLocaleString()} Records</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-[#bbf246]">Connected</div>
            <div className="text-[9px] text-slate-500">2 mins ago</div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {FRAUD_ALERTS.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-2.5 rounded-xl bg-[#14181d] border transition-colors ${
                alert.severity === 'coral'
                  ? 'border-[#f43f5e]/30 hover:border-[#f43f5e]'
                  : alert.severity === 'amber'
                  ? 'border-[#fb923c]/30 hover:border-[#fb923c]'
                  : 'border-[#bbf246]/30 hover:border-[#bbf246]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                  alert.severity === 'coral'
                    ? 'bg-[#f43f5e]/15 text-[#f43f5e]'
                    : alert.severity === 'amber'
                    ? 'bg-[#fb923c]/15 text-[#fb923c]'
                    : 'bg-[#bbf246]/15 text-[#bbf246]'
                }`}
              >
                {alert.severity === 'coral' ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : alert.severity === 'amber' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{alert.title}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{alert.description}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1 inline-block">
                  {alert.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Model Pipeline Activities Timeline */}
        <div>
          <h3 className="font-bold text-white text-sm mb-3">Model Pipeline Activities</h3>
          <div className="space-y-3 text-xs border-l-2 border-slate-800 pl-3 ml-1.5 font-sans">
            {PIPELINE_ACTIVITIES.map((act) => (
              <div key={act.id} className="relative">
                <span
                  className={`w-2 h-2 rounded-full absolute -left-[17px] top-1.5 ${
                    act.status === 'completed'
                      ? 'bg-[#bbf246]'
                      : act.status === 'active'
                      ? 'bg-[#fb923c] animate-pulse'
                      : 'bg-slate-600'
                  }`}
                />
                <p className="text-slate-300 font-medium">{act.title}</p>
                <p className="text-[10px] text-slate-500 font-mono">{act.subtitle}</p>
                <span className="text-[9px] text-slate-600 font-mono">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Google Sheet API Zero Latency Plan Card (Matching reference design card) */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#14181d] via-[#122019] to-[#14181d] border border-[#bbf246]/30 relative overflow-hidden shadow-[0_0_20px_-3px_rgba(187,242,70,0.15)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbf246]">
              Google Sheet API
            </span>
            <span className="w-2 h-2 rounded-full bg-[#bbf246] animate-pulse" />
          </div>
          <div className="text-xl font-bold text-white mb-1">Zero Latency</div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Deploy as backend API in 1 click. Connect real-world financial feeds or Google Form entries directly.
          </p>
          <button
            onClick={onOpenPipelineModal}
            className="w-full py-2 px-3 rounded-xl bg-[#bbf246] text-[#0a0c0e] font-bold text-xs hover:bg-[#a3e635] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>View Architecture Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Academic Guides & Evaluators */}
        <div>
          <h4 className="font-bold text-white text-xs mb-3">Evaluators & Academic Guides</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#14181d] border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-700 text-xs font-bold text-white flex items-center justify-center">
                  DR
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Dr. R. K. Verma</p>
                  <p className="text-[10px] text-slate-400">Project Mentor & Guide</p>
                </div>
              </div>
              <span className="text-[10px] text-[#bbf246] font-mono">Lead</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#14181d] border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-700 text-xs font-bold text-white flex items-center justify-center">
                  SG
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">S. Ganguly</p>
                  <p className="text-[10px] text-slate-400">Head of Department</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Reference Watermark */}
      <div className="pt-4 border-t border-white/10 text-[10px] text-slate-500 font-mono text-center">
        FraudGuard AI Platform • v2.4 Release
      </div>
    </aside>
  );
};
