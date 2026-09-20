import React, { useState } from 'react';
import { 
  Database, 
  Sliders, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onTestConnection: () => Promise<boolean>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onTestConnection,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await onTestConnection();
      setTestResult(ok ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 3000);
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          System & Model Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage data source feeds, classification probability thresholds, and alert parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Data Source & API Integration */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-[#bbf246]" />
              <h3 className="font-bold text-white text-base">Data Feed Mode</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Switch between offline synthetic 5,000-application benchmark cohort and the remote Google Sheet API via SheetDB.
            </p>

            <div className="space-y-4 text-xs">
              {/* Toggle Mode */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, useLiveApi: false })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !localSettings.useLiveApi
                      ? 'bg-[#181d24] border-[#bbf246] text-white font-bold'
                      : 'bg-[#181d24]/50 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">Demo Dataset</div>
                  <div className="text-[10px] text-slate-400 font-normal">5,000 Synthetic Apps (SMOTE Balanced)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, useLiveApi: true })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    localSettings.useLiveApi
                      ? 'bg-[#181d24] border-[#bbf246] text-white font-bold'
                      : 'bg-[#181d24]/50 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">Live Google Sheet</div>
                  <div className="text-[10px] text-slate-400 font-normal">SheetDB API Endpoint</div>
                </button>
              </div>

              {/* Endpoint Input */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">SheetDB API Endpoint URL</label>
                <input
                  type="text"
                  value={localSettings.sheetDbEndpoint}
                  onChange={(e) => setLocalSettings({ ...localSettings, sheetDbEndpoint: e.target.value })}
                  className="w-full bg-[#181d24] rounded-xl border border-white/10 text-slate-200 text-xs px-3 py-2.5 font-mono focus:border-[#bbf246] focus:outline-none"
                  placeholder="https://sheetdb.io/api/v1/..."
                />
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3.5 py-2 rounded-xl bg-[#181d24] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#bbf246] ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing Endpoint...' : 'Test Connection'}</span>
                </button>

                {testResult === 'success' && (
                  <span className="text-xs text-[#bbf246] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected successfully
                  </span>
                )}
                {testResult === 'fail' && (
                  <span className="text-xs text-[#f43f5e] font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Endpoint unreachable (Falling back to demo data)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-[11px] text-slate-500 font-mono mt-6">
            Default API: https://sheetdb.io/api/v1/jnveyifpbrsuy
          </div>
        </div>

        {/* Card 2: Fraud Scoring Thresholds */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-[#bbf246]" />
              <h3 className="font-bold text-white text-base">Model Probability Cutoffs</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Adjust classification cut-off limits to balance false positives against missed fraudulent loans.
            </p>

            <div className="space-y-4 text-xs">
              {/* Probability Threshold Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-medium">Binary Fraud Cut-Off Threshold</label>
                  <span className="font-mono font-bold text-[#bbf246]">
                    {(localSettings.fraudProbabilityThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={localSettings.fraudProbabilityThreshold}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, fraudProbabilityThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#bbf246] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>10% (High Recall)</span>
                  <span>50% (Standard)</span>
                  <span>90% (High Precision)</span>
                </div>
              </div>

              {/* Automated Action Rules */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.alertOnFraudFlag}
                    onChange={(e) => setLocalSettings({ ...localSettings, alertOnFraudFlag: e.target.checked })}
                    className="rounded accent-[#bbf246] w-4 h-4"
                  />
                  <span>Dispatch immediate push warning on High Risk (&gt;75%) detection</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoRejectHighRisk}
                    onChange={(e) => setLocalSettings({ ...localSettings, autoRejectHighRisk: e.target.checked })}
                    className="rounded accent-[#bbf246] w-4 h-4"
                  />
                  <span>Automate rejection status for applications exceeding 90% risk</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-6">
            <span className="text-[11px] text-slate-500 font-mono">Changes persist across session</span>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#bbf246] text-[#0a0c0e] text-xs font-bold rounded-xl hover:bg-[#a3e635] transition-all flex items-center gap-1.5 shadow-[0_0_15px_-2px_rgba(187,242,70,0.3)]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveMessage ? 'Settings Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* College Project Academic Information Card */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
          <Info className="w-4 h-4 text-[#bbf246]" />
          <span>Academic Project Metadata</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Title</span>
            <span className="font-semibold text-white">Financial Fraud Detection & Customer Risk Analysis</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Domain</span>
            <span className="font-semibold text-white">Fintech Analytics / Retail Lending</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Algorithms</span>
            <span className="font-semibold text-white">Logistic Regression, DT, NB, RF, XGBoost</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Preprocessing</span>
            <span className="font-semibold text-white">SMOTE Oversampling, StandardScaler, OHE</span>
          </div>
        </div>
      </div>
    </section>
  );
};
