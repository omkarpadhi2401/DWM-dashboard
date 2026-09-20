import React from 'react';
import { Menu, ChevronDown, Download, Bell, Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { NavigationTab } from '../types';

interface HeaderProps {
  currentTab: NavigationTab;
  onToggleMobileSidebar: () => void;
  onToggleRightRail: () => void;
  onExportCSV: () => void;
  unreadAlertsCount?: number;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  syncStatus?: 'loading' | 'success' | 'error';
  datasetCount?: number;
  onRetrySync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onToggleMobileSidebar,
  onToggleRightRail,
  onExportCSV,
  unreadAlertsCount = 4,
  selectedPeriod,
  onChangePeriod,
  syncStatus = 'success',
  datasetCount = 5000,
  onRetrySync,
}) => {
  const getTabLabel = (tab: NavigationTab) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'analytics':
        return 'Fraud Analytics';
      case 'models':
        return 'Model Lab';
      case 'checker':
        return 'Live Fraud Checker';
      case 'explorer':
        return 'Data Explorer';
      case 'reports':
        return 'Reports & Compliance';
      case 'settings':
        return 'Settings & Data Source';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-[#0f1216]/90 backdrop-blur border-b border-white/10">
      {/* Top API Integration Announcement Banner */}
      <div className={`w-full border-b px-4 py-1.5 text-xs flex items-center justify-between transition-colors ${
        syncStatus === 'loading'
          ? 'bg-[#181e28] border-[#38bdf8]/30 text-[#38bdf8]'
          : syncStatus === 'error'
          ? 'bg-[#2a1318] border-[#f43f5e]/40 text-[#f43f5e]'
          : 'bg-[#161b22] border-white/5 text-slate-400'
      }`}>
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {syncStatus === 'loading' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38bdf8] shrink-0" />
              <span className="font-semibold text-white">Synchronizing dataset...</span>
              <span className="hidden md:inline text-slate-400">
                Fetching records from SheetDB REST API endpoint (https://sheetdb.io/api/v1/jnveyifpbrsuy)
              </span>
            </>
          )}

          {syncStatus === 'success' && (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#bbf246]/15 text-[#bbf246] tracking-wide uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Live API
              </span>
              <span className="text-white font-medium">
                Dataset synchronized
              </span>
              <span className="text-[#bbf246] font-mono font-bold">
                — {datasetCount.toLocaleString()} records
              </span>
              <span className="hidden lg:inline text-slate-500">
                (SheetDB JSON REST endpoint verified & active)
              </span>
            </>
          )}

          {syncStatus === 'error' && (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#f43f5e]/20 text-[#f43f5e] tracking-wide uppercase">
                <AlertTriangle className="w-3 h-3" />
                Sync Failure
              </span>
              <span className="text-white font-medium">
                Unable to synchronize dataset
              </span>
              <span className="hidden sm:inline text-slate-400">
                API request failed or network unavailable
              </span>
              {onRetrySync && (
                <button
                  onClick={onRetrySync}
                  className="ml-2 px-2 py-0.5 rounded bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-[11px] transition-colors"
                >
                  Retry
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#bbf246] animate-pulse" />
            RF Model v2.4 (Active)
          </span>
          <span className="hidden sm:inline-block text-[11px] text-[#bbf246] font-semibold">
            ● {syncStatus === 'success' ? `${datasetCount.toLocaleString()} Synced` : syncStatus}
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-16 px-5 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#14181d] text-slate-400 hover:text-white border border-white/10"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-slate-500">Dashboards</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold flex items-center gap-1.5">
              {getTabLabel(currentTab)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter / Period Dropdown */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => onChangePeriod(e.target.value)}
              className="bg-[#14181d] text-xs text-slate-300 font-medium py-1.5 pl-3 pr-8 rounded-xl border border-white/10 focus:outline-none focus:border-[#bbf246] cursor-pointer appearance-none"
            >
              <option value="all">Full Dataset ({datasetCount.toLocaleString()})</option>
              <option value="q1">Q1 2024 (Last 90 Days)</option>
              <option value="month">Last 30 Days (Realtime)</option>
              <option value="high-risk">High Risk Segment Only</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Action: Export Cleaned CSV */}
          <button
            onClick={onExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#181d24] border border-white/10 text-xs text-slate-300 font-medium transition-colors"
            title="Export CSV Data"
          >
            <Download className="w-3.5 h-3.5 text-[#bbf246]" />
            <span>Export CSV</span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={onToggleRightRail}
              className="p-2 rounded-xl bg-[#14181d] hover:bg-[#181d24] border border-white/10 text-slate-300 relative transition-colors"
              title="View Alerts & Timeline"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#f43f5e] animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#f43f5e]" />
                </>
              )}
            </button>
          </div>

          {/* Student Profile Pill */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-[#bbf246] border border-white/10">
              S
            </div>
            <div className="text-left leading-tight">
              <span className="text-xs font-semibold text-white block">Student</span>
              <span className="text-[10px] text-slate-400 block font-mono">Roll: FG-2024</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
