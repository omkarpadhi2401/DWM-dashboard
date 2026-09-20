import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  X,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { FRAUD_ALERTS, getPipelineActivities } from '../services/dataService';

interface RightRailProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPipelineModal: () => void;
  datasetCount?: number;
  lastSyncTime?: string;
}

export const RightRail: React.FC<RightRailProps> = ({
  isOpen,
  onClose,
  onOpenPipelineModal,
  datasetCount = 0,
  lastSyncTime = 'Just now',
}) => {
  if (!isOpen) return null;

  const dynamicActivities = getPipelineActivities(datasetCount, lastSyncTime);

  return (
    <aside className="w-80 shrink-0 bg-[#0f1216] border-l border-white/10 flex flex-col justify-between p-5 select-none overflow-y-auto h-full z-20">
      <div className="flex flex-col gap-6">
        {/* Header with Close on Mobile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Fraud Signals & Alerts</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f43f5e]/20 text-[#f43f5e] font-bold font-mono">
              {FRAUD_ALERTS.length} Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#14181d] lg:hidden transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Overview Status Badge */}
        <div className="p-3.5 rounded-xl bg-[#14181d] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bbf246] animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-white">System Active</div>
              <div className="text-[11px] text-slate-400 font-mono">
                {datasetCount > 0 ? `${datasetCount.toLocaleString()} Records` : 'Dataset Syncing'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-[#bbf246]">Connected</div>
            <div className="text-[10px] text-slate-400">{lastSyncTime}</div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {FRAUD_ALERTS.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-xl bg-[#14181d] border transition-colors ${
                alert.severity === 'coral'
                  ? 'border-[#f43f5e]/30 hover:border-[#f43f5e]'
                  : alert.severity === 'amber'
                  ? 'border-[#fb923c]/30 hover:border-[#fb923c]'
                  : 'border-[#bbf246]/30 hover:border-[#bbf246]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
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
                <p className="text-[11px] text-slate-300 leading-snug mt-1">{alert.description}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5 inline-block">
                  {alert.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Model Pipeline Activities Timeline */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#bbf246]" />
            <h3 className="font-bold text-white text-sm">System Pipeline Activity</h3>
          </div>
          <div className="space-y-3.5 text-xs border-l-2 border-slate-800 pl-3.5 ml-1.5 font-sans">
            {dynamicActivities.map((act) => (
              <div key={act.id} className="relative">
                <span
                  className={`w-2 h-2 rounded-full absolute -left-[18px] top-1.5 ${
                    act.status === 'completed'
                      ? 'bg-[#bbf246]'
                      : act.status === 'active'
                      ? 'bg-[#fb923c] animate-pulse'
                      : 'bg-slate-600'
                  }`}
                />
                <p className="text-slate-200 font-medium text-xs">{act.title}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{act.subtitle}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Pipeline Architecture Card */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#14181d] via-[#122019] to-[#14181d] border border-[#bbf246]/30 relative overflow-hidden shadow-[0_0_20px_-3px_rgba(187,242,70,0.15)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbf246]">
              Data Stream Engine
            </span>
            <span className="w-2 h-2 rounded-full bg-[#bbf246] animate-pulse" />
          </div>
          <div className="text-lg font-bold text-white mb-1">Live Processing</div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Active schema validation and real-time risk scoring running across all loaded portfolio records.
          </p>
          <button
            onClick={onOpenPipelineModal}
            className="w-full py-2.5 px-3 rounded-xl bg-[#bbf246] text-[#0a0c0e] font-bold text-xs hover:bg-[#a3e635] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>View System Architecture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Reference Watermark */}
      <div className="pt-4 border-t border-white/10 text-xs text-slate-500 font-mono text-center">
        FraudGuard Enterprise Engine • Active
      </div>
    </aside>
  );
};
