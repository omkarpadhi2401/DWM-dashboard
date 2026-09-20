import React from 'react';
import { Menu, ChevronDown, Download, Bell, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  isRefreshing?: boolean;
  datasetCount?: number;
  dataSourceMode?: 'live' | 'demo';
  onRefreshData: () => void;
  refreshToastMessage?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onToggleMobileSidebar,
  onToggleRightRail,
  onExportCSV,
  unreadAlertsCount = 0,
  selectedPeriod,
  onChangePeriod,
  syncStatus = 'success',
  isRefreshing = false,
  datasetCount = 0,
  dataSourceMode = 'live',
  onRefreshData,
  refreshToastMessage = null,
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
        return 'Fraud Checker';
      case 'explorer':
        return 'Data Explorer';
      case 'settings':
        return 'Settings';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0f1216]/95 backdrop-blur-md border-b border-white/10">
      {/* Main Clean Header Bar without promotional/large API banners */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left Section: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#14181d] text-slate-400 hover:text-white border border-white/10 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-[13px] sm:text-[14px] font-medium whitespace-nowrap">
            <span className="text-slate-500">Dashboard</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium flex items-center gap-1.5">
              {getTabLabel(currentTab)}
            </span>
          </div>

          {/* Refresh Notification Pill if recently refreshed */}
          {refreshToastMessage && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-[12px] font-medium bg-[#bbf246]/15 text-[#bbf246] border border-[#bbf246]/30 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {refreshToastMessage}
            </span>
          )}
        </div>

        {/* Right Section: Status Indicator, Period Filter, Refresh Button, Export */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Subtle Data Connected Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#14181d] border border-white/10 text-[11px] sm:text-[12px] font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'loading' || isRefreshing
                  ? 'bg-[#38bdf8] animate-ping'
                  : syncStatus === 'error'
                  ? 'bg-[#f43f5e]'
                  : 'bg-[#bbf246] animate-pulse'
              }`}
            />
            <span className="text-slate-300">
              {syncStatus === 'loading' || isRefreshing
                ? 'Refreshing...'
                : syncStatus === 'error'
                ? 'Connection Error'
                : 'Data Connected'}
            </span>
            <span className="text-slate-500 font-mono text-[11px] hidden md:inline">
              ({dataSourceMode === 'demo' ? 'Demo' : 'Live'})
            </span>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing || syncStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#192028] disabled:opacity-50 text-slate-200 hover:text-white border border-white/10 text-[13px] sm:text-[14px] font-medium transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh dataset and recalculate metrics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#bbf246] ${isRefreshing || syncStatus === 'loading' ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {isRefreshing || syncStatus === 'loading' ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* Overview Date-Period Filter */}
          {currentTab === 'overview' && (
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => onChangePeriod(e.target.value)}
                className="bg-[#14181d] hover:bg-[#192028] text-[13px] sm:text-[14px] text-slate-200 font-medium py-1.5 pl-3 pr-8 rounded-xl border border-white/10 focus:outline-none focus:border-[#bbf246] cursor-pointer appearance-none transition-colors"
                title="Filter dataset period"
              >
                <option value="all">All Time</option>
                <option value="latest-month">Latest Month</option>
                <option value="last-3-months">Last 3 Months</option>
                <option value="last-6-months">Last 6 Months</option>
                <option value="this-year">This Year</option>
                <option value="q1">Quarter 1</option>
                <option value="q2">Quarter 2</option>
                <option value="q3">Quarter 3</option>
                <option value="q4">Quarter 4</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            onClick={onExportCSV}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14181d] hover:bg-[#192028] border border-white/10 text-[13px] sm:text-[14px] text-slate-300 font-medium transition-colors cursor-pointer"
            title="Export Cleaned CSV Data"
          >
            <Download className="w-3.5 h-3.5 text-[#bbf246]" />
            <span>Export CSV</span>
          </button>

          {/* Notification / Activity Rail Toggle */}
          <button
            onClick={onToggleRightRail}
            className="p-2.5 rounded-xl bg-[#14181d] hover:bg-[#192028] border border-white/10 text-slate-300 relative transition-colors cursor-pointer"
            title="View System Activity & Signals"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f43f5e] animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f43f5e]" />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
