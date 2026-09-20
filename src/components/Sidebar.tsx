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
    <aside className="w-68 shrink-0 bg-[#0f1216] border-r border-white/10 flex flex-col justify-between select-none h-screen sticky top-0">
      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        {/* App Logo & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#14181d] border border-white/10 flex items-center justify-center text-[#bbf246] shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-[17px] tracking-tight flex items-center gap-1.5">
              FraudGuard <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#bbf246] text-[#0a0c0e] font-bold">AI</span>
            </h1>
            <p className="text-[12px] text-slate-400 font-normal">Financial Risk Intelligence</p>
          </div>
        </div>

        {/* Clean Search Bar without KBD shortcut */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search apps, logs..."
            className="w-full bg-[#14181d] text-[13px] sm:text-[14px] text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#bbf246] placeholder-slate-500 transition-colors"
          />
        </div>

        {/* Navigation Section: Dashboards */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1">
            Dashboards
          </p>

          {/* Overview */}
          <button
            onClick={() => onSelectTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'overview'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
              <span>Overview</span>
            </div>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
              currentTab === 'overview' ? 'bg-[#0a0c0e]/30 text-current font-semibold' : 'bg-[#181d24] text-slate-400'
            }`}>
              Live
            </span>
          </button>

          {/* Fraud Analytics */}
          <button
            onClick={() => onSelectTab('analytics')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'analytics'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4.5 h-4.5 shrink-0" />
              <span>Fraud Analytics</span>
            </div>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
              currentTab === 'analytics' ? 'bg-[#0a0c0e]/30 text-current font-semibold' : 'text-[#f43f5e] bg-[#f43f5e]/10'
            }`}>
              9.72%
            </span>
          </button>

          {/* Model Lab */}
          <button
            onClick={() => onSelectTab('models')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'models'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="w-4.5 h-4.5 shrink-0" />
              <span>Model Lab</span>
            </div>
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${
              currentTab === 'models' ? 'bg-[#0a0c0e]/30 text-current font-semibold' : 'bg-[#181d24] text-slate-400'
            }`}>
              5 ML
            </span>
          </button>

          {/* Fraud Checker */}
          <button
            onClick={() => onSelectTab('checker')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'checker'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-4.5 h-4.5 shrink-0" />
              <span>Fraud Checker</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${
              currentTab === 'checker' ? 'bg-[#0a0c0e]' : 'bg-[#bbf246]'
            }`} />
          </button>

          {/* Data Explorer */}
          <button
            onClick={() => onSelectTab('explorer')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'explorer'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-4.5 h-4.5 shrink-0" />
              <span>Data Explorer</span>
            </div>
            <span className={`text-[11px] font-mono ${
              currentTab === 'explorer' ? 'text-current font-semibold' : 'text-slate-400'
            }`}>
              {datasetCount > 0 ? datasetCount.toLocaleString() : 'Loaded'}
            </span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-medium transition-all duration-200 cursor-pointer ${
              currentTab === 'settings'
                ? 'neon-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-[#14181d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4.5 h-4.5 shrink-0" />
              <span>Settings</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-slate-600" />
          </button>
        </div>

        {/* Navigation Section: Configurations */}
        <div className="flex flex-col gap-1 pt-3 border-t border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1">
            System & Reference
          </p>
          <button
            onClick={onOpenPipelineModal}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] sm:text-[14px] font-medium text-slate-400 hover:text-white hover:bg-[#14181d] transition-colors text-left cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Model Config (SMOTE)</span>
          </button>
          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] sm:text-[14px] font-medium text-slate-400 hover:text-white hover:bg-[#14181d] transition-colors text-left cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Evaluation Methodology</span>
          </button>
        </div>

        {/* Dataset Status Banner */}
        <div className="p-3 rounded-xl bg-[#14181d] border border-white/10 mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Dataset Status</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#bbf246]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bbf246] animate-pulse" />
              Connected
            </span>
          </div>
          <div className="text-[13px] font-semibold text-white flex items-center justify-between">
            <span>Google Sheet</span>
            <span className="font-mono text-[12px] text-slate-300">{datasetCount.toLocaleString()} Records</span>
          </div>
        </div>
      </div>

      {/* Clean System Status Footer (No roles, no Admin Risk Operations) */}
      <div className="p-4 border-t border-white/10 bg-[#14181d]/50">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#bbf246]" />
            <span className="text-slate-300 font-medium">FRAUDGUARD ENGINE</span>
          </div>
          <button 
            onClick={onOpenPipelineModal}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181d24] transition-colors cursor-pointer"
            title="System Specifications"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>Surveillance Active</span>
          <span className="text-[#bbf246]">200 OK</span>
        </div>
      </div>
    </aside>
  );
};
