/**
 * Financial Fraud Detection & Customer Risk Analysis Dashboard
 * Production-quality dark-mode fintech interface
 * Connected to live SheetDB REST API endpoint: https://sheetdb.io/api/v1/jnveyifpbrsuy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavigationTab, KPIMetrics, LoanApplication, AppSettings } from './types';
import { 
  fetchLiveLoanApplications, 
  calculateDashboardMetrics, 
  SHEET_API_URL 
} from './services/api';
import { 
  generateCSVContent,
  PIPELINE_ACTIVITIES,
  FRAUD_ALERTS
} from './services/dataService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { RightRail } from './components/RightRail';
import { ApplicationDetailModal } from './components/ApplicationDetailModal';
import { LoadingSkeleton, ErrorStateCard } from './components/SyncStatusDisplay';
import { OverviewView } from './views/OverviewView';
import { AnalyticsView } from './views/AnalyticsView';
import { ModelLabView } from './views/ModelLabView';
import { FraudCheckerView } from './views/FraudCheckerView';
import { DataExplorerView } from './views/DataExplorerView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { X, CheckCircle2, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('All Records');
  
  // Live API synchronization states
  const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [kpis, setKpis] = useState<KPIMetrics>({
    totalApplications: 0,
    genuineApplications: 0,
    fraudulentApplications: 0,
    fraudRate: 0,
    avgLoanAmount: 0,
    avgGenuineAmount: 0,
    avgFraudAmount: 0,
    estFraudPreventedCr: 0,
  });
  
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  
  // Responsive / Rail controls
  const [rightRailOpen, setRightRailOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // App Settings configured with verified live endpoint
  const [settings, setSettings] = useState<AppSettings>({
    useLiveApi: true,
    sheetDbEndpoint: SHEET_API_URL,
    fraudProbabilityThreshold: 0.50,
    alertOnFraudFlag: true,
    autoRejectHighRisk: false,
  });

  // Centralized live data fetcher
  const syncLiveDataset = useCallback(async (customEndpoint?: string) => {
    setSyncStatus('loading');
    setSyncError(null);
    const endpoint = customEndpoint || settings.sheetDbEndpoint || SHEET_API_URL;
    try {
      const liveApps = await fetchLiveLoanApplications(endpoint);
      setApplications(liveApps);
      const computedKPIs = calculateDashboardMetrics(liveApps);
      setKpis(computedKPIs);
      setSyncStatus('success');
    } catch (err: any) {
      console.error('Technical error fetching live API data:', err);
      setSyncError(err?.message || 'Failed to connect to SheetDB API endpoint.');
      setSyncStatus('error');
      // Do NOT silently fall back to demo data; keep real status visible
      setApplications([]);
      setKpis(calculateDashboardMetrics([]));
    }
  }, [settings.sheetDbEndpoint]);

  // Initial synchronization on app boot
  useEffect(() => {
    syncLiveDataset();
  }, [syncLiveDataset]);

  // Test live connection in settings
  const handleTestConnection = async (): Promise<boolean> => {
    try {
      const liveApps = await fetchLiveLoanApplications(settings.sheetDbEndpoint);
      return liveApps && liveApps.length > 0;
    } catch (err) {
      console.error('Technical error during connection test:', err);
      return false;
    }
  };

  // Export CSV directly from current applications state
  const handleExportCSV = () => {
    if (applications.length === 0) return;
    const csvData = generateCSVContent(applications);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_fraud_analysis_${applications.length}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add new checked application to active queue
  const handleSaveToQueue = (newApp: LoanApplication) => {
    setApplications((prev) => {
      const updated = [newApp, ...prev];
      setKpis(calculateDashboardMetrics(updated));
      return updated;
    });
  };

  // Update status from modal
  const handleUpdateStatus = (appId: string, newStatus: 'Approved' | 'Rejected' | 'Under Review') => {
    setApplications((prev) =>
      prev.map((a) => (a.ApplicationID === appId ? { ...a, LoanStatus: newStatus } : a))
    );
  };

  const isDataDependentTab = ['overview', 'analytics', 'explorer', 'reports'].includes(activeTab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c0e] text-slate-100 antialiased font-sans">
      {/* Left Sidebar Navigation (Desktop) */}
      <div className="hidden lg:block">
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(tab: NavigationTab) => setActiveTab(tab)}
          onOpenPipelineModal={() => setPipelineModalOpen(true)}
          onOpenGuideModal={() => setGuideModalOpen(true)}
          datasetCount={applications.length}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72">
            <Sidebar
              currentTab={activeTab}
              onSelectTab={(tab: NavigationTab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
              onOpenPipelineModal={() => {
                setPipelineModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              onOpenGuideModal={() => {
                setGuideModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              datasetCount={applications.length}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          currentTab={activeTab}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleRightRail={() => setRightRailOpen((prev) => !prev)}
          onExportCSV={handleExportCSV}
          selectedPeriod={selectedPeriod}
          onChangePeriod={setSelectedPeriod}
          unreadAlertsCount={FRAUD_ALERTS.length}
          syncStatus={syncStatus}
          datasetCount={applications.length}
          onRetrySync={() => syncLiveDataset()}
        />

        {/* Dynamic Center Work Area + Collapsible Right Rail */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Scrollable Center Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 min-w-0">
            <div className="max-w-7xl mx-auto pb-12">
              {/* If data-dependent tab is loading */}
              {isDataDependentTab && syncStatus === 'loading' && (
                <LoadingSkeleton endpoint={settings.sheetDbEndpoint} />
              )}

              {/* If data-dependent tab encountered an error */}
              {isDataDependentTab && syncStatus === 'error' && (
                <ErrorStateCard
                  error={syncError || 'Network request failed'}
                  endpoint={settings.sheetDbEndpoint}
                  onRetry={() => syncLiveDataset()}
                />
              )}

              {/* Normal rendering when loaded or for independent tabs */}
              {(!isDataDependentTab || syncStatus === 'success') && (
                <>
                  {activeTab === 'overview' && (
                    <OverviewView
                      kpis={kpis}
                      applications={applications}
                      onOpenDetails={(app) => setSelectedApp(app)}
                      onNavigateToExplorer={() => setActiveTab('explorer')}
                      onNavigateToChecker={() => setActiveTab('checker')}
                    />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsView
                      applications={applications}
                      totalDatasetSize={applications.length}
                    />
                  )}

                  {activeTab === 'models' && (
                    <ModelLabView
                      onNavigateToChecker={() => setActiveTab('checker')}
                    />
                  )}

                  {activeTab === 'checker' && (
                    <FraudCheckerView
                      onSaveToQueue={handleSaveToQueue}
                      onNavigateToExplorer={() => setActiveTab('explorer')}
                    />
                  )}

                  {activeTab === 'explorer' && (
                    <DataExplorerView
                      applications={applications}
                      onOpenDetails={(app) => setSelectedApp(app)}
                      onExportCSV={handleExportCSV}
                    />
                  )}

                  {activeTab === 'reports' && (
                    <ReportsView
                      kpis={kpis}
                      onExportCSV={handleExportCSV}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      settings={settings}
                      onUpdateSettings={(newSet) => {
                        setSettings(newSet);
                        syncLiveDataset(newSet.sheetDbEndpoint);
                      }}
                      onTestConnection={handleTestConnection}
                    />
                  )}
                </>
              )}
            </div>
          </main>

          {/* Right Rail: Alert Feed, Pipeline Progress, System Health */}
          <RightRail
            isOpen={rightRailOpen}
            onClose={() => setRightRailOpen(false)}
            onOpenPipelineModal={() => setPipelineModalOpen(true)}
            datasetCount={applications.length}
          />
        </div>
      </div>

      {/* Application Drill-down Modal / Drawer */}
      <ApplicationDetailModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Pipeline Status Modal */}
      {pipelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14181d] border border-white/10 rounded-2xl w-full max-w-lg p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-[#bbf246]" />
                <h3 className="font-bold text-white text-base">ML Pipeline Orchestrator</h3>
              </div>
              <button
                onClick={() => setPipelineModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              {PIPELINE_ACTIVITIES.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-[#181d24] border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#bbf246]" />
                    <div>
                      <div className="font-bold text-white">{act.title}</div>
                      <div className="text-[11px] text-slate-400">{act.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{act.timestamp}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setPipelineModalOpen(false)}
                className="px-4 py-2 bg-[#bbf246] text-[#0a0c0e] font-bold text-xs rounded-xl"
              >
                Close Pipeline View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Project Guide Modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14181d] border border-white/10 rounded-2xl w-full max-w-xl p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#bbf246]" />
                <h3 className="font-bold text-white text-base">Project Methodology & Architecture</h3>
              </div>
              <button
                onClick={() => setGuideModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
                <div className="font-bold text-white mb-1">1. Problem Formulation</div>
                <p>
                  Retail credit fraud exhibits extreme class imbalance. We formulated risk detection as a supervised binary classification task trained on multi-attribute customer profiles.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
                <div className="font-bold text-white mb-1">2. Preprocessing & Imbalance Handling</div>
                <p>
                  Applied StandardScaler on continuous metrics (Loan Amount, Income, CIBIL). Synthetic Minority Over-sampling Technique (SMOTE) synthesized balanced positive instances in training partitions to avoid majority-class bias.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
                <div className="font-bold text-white mb-1">3. Evaluated Model Architectures</div>
                <p>
                  Compared Logistic Regression, Decision Trees, Naive Bayes, Random Forest, and XGBoost on ROC-AUC, PR-AUC, and F1-score to identify Pareto-optimal latency vs precision trade-offs.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#181d24] border border-white/10">
                <div className="font-bold text-white mb-1">4. Live Data Connector (SheetDB API)</div>
                <p>
                  Direct REST integration with SheetDB endpoint (<code>https://sheetdb.io/api/v1/jnveyifpbrsuy</code>), automatically normalizing numeric types, calculating live KPIs, and rendering dynamic analytical cohorts.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setGuideModalOpen(false)}
                className="px-4 py-2 bg-[#bbf246] text-[#0a0c0e] font-bold text-xs rounded-xl"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
