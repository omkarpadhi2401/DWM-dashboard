import React from 'react';
import { 
  ShieldCheck, 
  Search, 
  LayoutDashboard, 
  BarChart3, 
  FlaskConical, 
  AlertOctagon, 
  Database, 
  FileText, 
  Settings, 
  Sliders, 
  HelpCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenPipelineModal: () => void;
  onOpenGuideModal: () => void;
  datasetCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenPipelineModal,
  onOpenGuideModal,
  datasetCount = 5000,
}) => {
  return (
    <aside className="w-64 shrink-0 bg-[#0f1216] border-r border-white/10 flex flex-col justify-between select-none h-screen sticky top-0">
      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        {/* App Logo & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#14181d] border border-white/10 flex items-center justify-center text-[#bbf246] shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
              FraudGuard <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#bbf246] text-[#0a0c0e] font-extrabold">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Financial Risk Intelligence</p>
          </div>
        </div>

        {/* Search Bar with Shortcut ⌘K */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search apps, logs..."
            className="w-full bg-[#14181d] text-xs text-slate-300 pl-9 pr-12 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#bbf246] placeholder-slate-500 transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-[#1f252e] text-slate-400 px-1.5 py-0.5 rounded border border-white/10">
            ⌘K
          </kbd>
        </div>

        {/* Navigation Section: Dashboards */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
            Dashboards
          </p>

          {/* Overview */}
          <button
            onClick={() => onSelectTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'overview'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              currentTab === 'overview' ? 'bg-[#0a0c0e]/30 text-current' : 'bg-[#181d24] text-slate-400'
            }`}>
              Live
            </span>
          </button>

          {/* Fraud Analytics */}
          <button
            onClick={() => onSelectTab('analytics')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'analytics'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4" />
              <span>Fraud Analytics</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              currentTab === 'analytics' ? 'bg-[#0a0c0e]/30 text-current' : 'text-[#f43f5e] bg-[#f43f5e]/10'
            }`}>
              9.72%
            </span>
          </button>

          {/* Model Lab */}
          <button
            onClick={() => onSelectTab('models')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'models'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="w-4 h-4" />
              <span>Model Lab</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              currentTab === 'models' ? 'bg-[#0a0c0e]/30 text-current' : 'bg-[#181d24] text-slate-400'
            }`}>
              5 ML
            </span>
          </button>

          {/* Fraud Checker */}
          <button
            onClick={() => onSelectTab('checker')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'checker'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-4 h-4" />
              <span>Fraud Checker</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${
              currentTab === 'checker' ? 'bg-[#0a0c0e]' : 'bg-[#bbf246]'
            }`} />
          </button>

          {/* Data Explorer */}
          <button
            onClick={() => onSelectTab('explorer')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'explorer'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4" />
              <span>Data Explorer</span>
            </div>
            <span className={`text-[10px] font-mono ${
              currentTab === 'explorer' ? 'text-current' : 'text-slate-400'
            }`}>
              5.0k
            </span>
          </button>

          {/* Reports */}
          <button
            onClick={() => onSelectTab('reports')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'reports'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Reports</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              currentTab === 'reports' ? 'bg-[#0a0c0e]/30 text-current' : 'bg-[#181d24] text-slate-400'
            }`}>
              PDF
            </span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              currentTab === 'settings'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-slate-600" />
          </button>
        </div>

        {/* Navigation Section: Configurations */}
        <div className="flex flex-col gap-1 pt-3 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
            Configuration
          </p>
          <button
            onClick={onOpenPipelineModal}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#14181d] transition-colors text-left"
          >
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Model Config (SMOTE)</span>
          </button>
          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#14181d] transition-colors text-left"
          >
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Evaluation Guide</span>
          </button>
        </div>

        {/* Dataset Status Banner */}
        <div className="p-3 rounded-xl bg-[#14181d] border border-white/10 mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Dataset Status</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#bbf246]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bbf246] animate-pulse" />
              Connected
            </span>
          </div>
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>Google Sheet</span>
            <span className="font-mono text-[11px] text-slate-300">{datasetCount.toLocaleString()} Records</span>
          </div>
        </div>
      </div>

      {/* Bottom Profile / Lab Credentials */}
      <div className="p-4 border-t border-white/10 bg-[#181d24]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-[#bbf246] border border-white/10">
                ML
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#bbf246] border-2 border-[#0f1216] absolute bottom-0 right-0" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Prof. & Team</p>
              <p className="text-[10px] text-slate-400">Risk Analytics Lab</p>
            </div>
          </div>
          <button 
            onClick={onOpenPipelineModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#14181d] transition-colors"
            title="System Info"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>API: READY (200 OK)</span>
          <span className="text-[#bbf246] font-medium">DWISON LABS</span>
        </div>
      </div>
    </aside>
  );
};
