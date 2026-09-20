import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  IndianRupee, 
  ArrowUpRight, 
  MoreVertical, 
  ShieldCheck,
  ArrowRight,
  Eye,
  Activity,
  Wallet,
  Percent
} from 'lucide-react';
import { KPIMetrics, LoanApplication } from '../types';
import { 
  getBreakdownByLoanType, 
  getBreakdownByEmployment, 
  getBreakdownByAgeGroup, 
  getMonthlyIntakeTrend 
} from '../services/api';

interface OverviewViewProps {
  kpis: KPIMetrics;
  applications: LoanApplication[];
  selectedPeriod?: string;
  onOpenDetails: (app: LoanApplication) => void;
  onNavigateToExplorer: () => void;
  onNavigateToChecker: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  kpis,
  applications,
  selectedPeriod = 'all',
  onOpenDetails,
  onNavigateToExplorer,
  onNavigateToChecker,
}) => {
  const [trendPeriod, setTrendPeriod] = useState<'year' | '6m' | '30d'>('year');

  // Dynamic calculations from applications
  const loanTypeBreakdown = useMemo(() => getBreakdownByLoanType(applications), [applications]);
  const employmentBreakdown = useMemo(() => getBreakdownByEmployment(applications), [applications]);
  const ageBreakdown = useMemo(() => getBreakdownByAgeGroup(applications), [applications]);
  const { trendData, peakMonth, lowestMonth } = useMemo(() => getMonthlyIntakeTrend(applications), [applications]);

  // Donut chart stroke calculations
  const circumference = 238.76;
  const fraudRatio = kpis.totalApplications > 0 ? kpis.fraudulentApplications / kpis.totalApplications : 0.02;
  const genuineRatio = 1 - fraudRatio;
  const fraudDash = Number((fraudRatio * circumference).toFixed(2));
  const genuineDash = Number((genuineRatio * circumference).toFixed(2));

  // Dynamic SVG Trend line points
  const visibleTrend = useMemo(() => {
    if (trendPeriod === '30d') return trendData.slice(-4);
    if (trendPeriod === '6m') return trendData.slice(-6);
    return trendData;
  }, [trendData, trendPeriod]);

  const maxTotal = useMemo(() => {
    return Math.max(...visibleTrend.map((d) => d.total), 10);
  }, [visibleTrend]);

  // Build SVG polygon/path points
  const { genuinePath, genuineArea, fraudPath, fraudArea, pointCoords } = useMemo(() => {
    const width = 700;
    const height = 190;
    const paddingX = 20;
    const usableWidth = width - paddingX * 2;
    const step = visibleTrend.length > 1 ? usableWidth / (visibleTrend.length - 1) : usableWidth;

    const gPoints = visibleTrend.map((d, i) => {
      const x = paddingX + i * step;
      const y = height - (d.genuine / maxTotal) * 140;
      return { x, y };
    });

    const fPoints = visibleTrend.map((d, i) => {
      const x = paddingX + i * step;
      const y = height - (d.fraud / maxTotal) * 140;
      return { x, y };
    });

    const gPathStr = gPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const gAreaStr = `${gPathStr} L ${width - paddingX},${height} L ${paddingX},${height} Z`;

    const fPathStr = fPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fAreaStr = `${fPathStr} L ${width - paddingX},${height} L ${paddingX},${height} Z`;

    return {
      genuinePath: gPathStr,
      genuineArea: gAreaStr,
      fraudPath: fPathStr,
      fraudArea: fAreaStr,
      pointCoords: {
        lastGenuine: gPoints[gPoints.length - 1] || { x: 600, y: 80 },
        lastFraud: fPoints[fPoints.length - 1] || { x: 600, y: 150 },
      },
    };
  }, [visibleTrend, maxTotal]);

  return (
    <section className="flex flex-col gap-6">
      {/* Top Header Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[28px] sm:text-[30px] font-bold text-white tracking-tight">
              Financial Fraud Overview
            </h2>
            {selectedPeriod !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] font-medium bg-[#bbf246]/15 text-[#bbf246] border border-[#bbf246]/30">
                Period: {selectedPeriod}
              </span>
            )}
          </div>
          <p className="text-[14px] sm:text-[15px] text-slate-400 font-normal mt-1 leading-relaxed">
            Real-time portfolio surveillance, empirical fraud patterns, and customer loan risk indicators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToChecker}
            className="px-4 py-2.5 rounded-xl bg-[#bbf246] text-[#0a0c0e] hover:bg-[#a3e635] text-[13px] sm:text-[14px] font-semibold transition-all shadow-[0_0_20px_-3px_rgba(187,242,70,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <span>Launch Risk Checker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Symmetrical KPI Grid: 8 Balanced Cards (2 Rows of 4 Cards) */}
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* Row 1: Surveillance & Volume Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Total Applications */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 hover:border-[#bbf246]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Total Applications</span>
              <span className="p-1.5 rounded-xl bg-[#1d232c] text-slate-300 shrink-0">
                <FileText className="w-4 h-4 text-[#bbf246]" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight font-mono">
              {kpis.totalApplications.toLocaleString()}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className="text-[#bbf246] flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                Active Portfolio
              </span>
              <span>• records loaded</span>
            </div>
          </div>

          {/* KPI 2: Flagged Fraud */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-[#f43f5e]/30 shadow-[0_0_20px_-3px_rgba(244,63,94,0.1)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#f43f5e] text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Flagged Fraud</span>
              <span className="p-1.5 rounded-xl bg-[#f43f5e]/10 text-[#f43f5e] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-[#f43f5e] tracking-tight font-mono">
              {kpis.fraudulentApplications.toLocaleString()}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className="text-[#f43f5e] font-medium">FraudFlag = 1</span>
              <span>• instances verified</span>
            </div>
          </div>

          {/* KPI 3: Genuine Applications */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-[#bbf246]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Genuine Applications</span>
              <span className="p-1.5 rounded-xl bg-[#bbf246]/10 text-[#bbf246] shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-[#bbf246] tracking-tight font-mono">
              {kpis.genuineApplications.toLocaleString()}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className="text-[#bbf246] font-mono font-medium">
                {kpis.totalApplications > 0 ? ((kpis.genuineApplications / kpis.totalApplications) * 100).toFixed(2) : '0.00'}%
              </span>
              <span>• approval eligible</span>
            </div>
          </div>

          {/* KPI 4: Fraud Proportion / Target */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Fraud Rate</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#181d24] text-slate-300 font-mono">
                &lt;5.0% Target
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight flex items-baseline gap-2 font-mono">
              {kpis.fraudRate}%
              <span className={`text-[12px] font-medium ${kpis.fraudRate > 5 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                ({kpis.fraudRate > 5 ? 'Elevated' : 'Controlled'})
              </span>
            </div>
            <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#bbf246] via-[#fb923c] to-[#f43f5e] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, kpis.fraudRate * 8))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Customer Risk & Financial Indicators (4 Dynamic Additional KPIs for Symmetrical Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 5: Average CIBIL Score */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 hover:border-[#bbf246]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Average CIBIL Score</span>
              <span className="p-1.5 rounded-xl bg-[#1d232c] text-slate-300 shrink-0">
                <Activity className="w-4 h-4 text-[#bbf246]" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight font-mono">
              {kpis.avgCibilScore}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className={`font-medium ${kpis.avgCibilScore >= 750 ? 'text-[#bbf246]' : kpis.avgCibilScore >= 650 ? 'text-amber-400' : 'text-[#f43f5e]'}`}>
                {kpis.avgCibilScore >= 750 ? 'Prime Standing (750+)' : kpis.avgCibilScore >= 650 ? 'Moderate Tier (650–749)' : 'High Risk (<650)'}
              </span>
              <span>• calculated live</span>
            </div>
          </div>

          {/* KPI 6: Average Monthly Income */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 hover:border-[#bbf246]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap" title="Average Monthly Income">Average Monthly Income</span>
              <span className="p-1.5 rounded-xl bg-[#1d232c] text-slate-300 shrink-0">
                <Wallet className="w-4 h-4 text-[#bbf246]" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight font-mono">
              ₹{kpis.avgMonthlyIncome.toLocaleString('en-IN')}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className="text-[#bbf246] font-medium">Stated Earnings</span>
              <span>• across active records</span>
            </div>
          </div>

          {/* KPI 7: Average Debt-to-Income Ratio */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 hover:border-[#bbf246]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap" title="Average Debt-to-Income">Average Debt-to-Income</span>
              <span className="p-1.5 rounded-xl bg-[#1d232c] text-slate-300 shrink-0">
                <Percent className="w-4 h-4 text-[#bbf246]" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight font-mono">
              {kpis.avgDtiRatio}%
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-slate-400">
              <span className={`font-medium ${kpis.avgDtiRatio < 35 ? 'text-[#bbf246]' : 'text-[#f43f5e]'}`}>
                {kpis.avgDtiRatio < 35 ? 'Healthy Leverage (<35%)' : 'Elevated Leverage (≥35%)'}
              </span>
              <span>• live calculation</span>
            </div>
          </div>

          {/* KPI 8: Average Loan Amount */}
          <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 hover:border-[#bbf246]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-300 text-[14px] sm:text-[15px] font-medium mb-2.5 gap-2">
              <span className="truncate whitespace-nowrap">Average Loan Amount</span>
              <span className="p-1.5 rounded-xl bg-[#1d232c] text-slate-300 shrink-0">
                <IndianRupee className="w-4 h-4 text-[#bbf246]" />
              </span>
            </div>
            <div className="text-[26px] sm:text-[28px] font-bold text-white tracking-tight font-mono">
              ₹{kpis.avgLoanAmount} L
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[12px] sm:text-[13px] text-slate-400 font-mono">
              <span>Gen: ₹{kpis.avgGenuineAmount}L</span>
              <span className="text-[#f43f5e]">Fraud: ₹{kpis.avgFraudAmount}L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Visual Charts Hub (Donut Distribution & Multi-Month Area Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Donut Fraud Distribution (5 Cols) - CALCULATED FROM DATA */}
        <div className="lg:col-span-5 bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">Application Distribution</h3>
              <p className="text-[14px] sm:text-[15px] text-slate-400 mt-0.5">Class composition calculated from live dataset</p>
            </div>
            <button className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer" title="More options">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* SVG Donut Chart with Center Text */}
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-2">
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" fill="none" r="38" stroke="#1d242e" strokeWidth="12" />
                {/* Genuine Segment */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  stroke="#bbf246"
                  strokeDasharray={`${genuineDash} ${circumference}`}
                  strokeDashoffset={fraudDash}
                  strokeLinecap="round"
                  strokeWidth="12"
                />
                {/* Fraud Segment */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  stroke="#f43f5e"
                  strokeDasharray={`${fraudDash} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[24px] sm:text-[26px] font-bold text-white tracking-tight font-mono">
                  {kpis.totalApplications.toLocaleString()}
                </span>
                <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Total Apps
                </span>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="flex flex-col gap-2.5 w-full sm:w-auto">
              <div className="flex items-center justify-between gap-6 p-2.5 rounded-xl bg-[#181d24]/60 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#bbf246]" />
                  <div>
                    <div className="text-[13px] sm:text-[14px] font-medium text-white">Genuine</div>
                    <div className="text-[11px] text-slate-400">Normal profile</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] sm:text-[14px] font-mono font-semibold text-[#bbf246]">
                    {kpis.genuineApplications.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {kpis.totalApplications > 0 ? ((kpis.genuineApplications / kpis.totalApplications) * 100).toFixed(2) : 0}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 p-2.5 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                  <div>
                    <div className="text-[13px] sm:text-[14px] font-medium text-[#f43f5e]">Fraudulent</div>
                    <div className="text-[11px] text-slate-400">Flagged risk</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] sm:text-[14px] font-mono font-semibold text-[#f43f5e]">
                    {kpis.fraudulentApplications.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {kpis.fraudRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] sm:text-[12px] text-slate-400 font-normal">
            <span>Class Imbalance Ratio: 1:{(kpis.genuineApplications / Math.max(1, kpis.fraudulentApplications)).toFixed(1)}</span>
            <span className="text-[#bbf246] flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              API Verified
            </span>
          </div>
        </div>

        {/* Right Chart: Monthly Fraud Detection Trend Area Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">Monthly Fraud vs Genuine Intake Trend</h3>
              <p className="text-[14px] sm:text-[15px] text-slate-400 mt-0.5">Calculated directly across ApplicationDate / Month records</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Period Selector Tabs */}
              <div className="inline-flex rounded-xl bg-[#181d24] p-1 border border-white/10 text-[12px] sm:text-[13px] font-medium">
                <button
                  onClick={() => setTrendPeriod('year')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    trendPeriod === 'year' ? 'bg-[#bbf246] text-[#0a0c0e] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Months
                </button>
                <button
                  onClick={() => setTrendPeriod('6m')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    trendPeriod === '6m' ? 'bg-[#bbf246] text-[#0a0c0e] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last 6 Mos
                </button>
                <button
                  onClick={() => setTrendPeriod('30d')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    trendPeriod === '30d' ? 'bg-[#bbf246] text-[#0a0c0e] font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last 4 Mos
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[12px] font-mono">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#bbf246]" /> Genuine
                </span>
                <span className="flex items-center gap-1.5 text-[#f43f5e]">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Fraud
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Area Trend Chart */}
          <div className="w-full h-48 sm:h-56 relative my-2">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
              <defs>
                <linearGradient id="limeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bbf246" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#bbf246" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="coralGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" x1="0" x2="700" y1="40" y2="40" />
              <line stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" x1="0" x2="700" y1="90" y2="90" />
              <line stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" x1="0" x2="700" y1="140" y2="140" />
              <line stroke="rgba(255,255,255,0.1)" x1="0" x2="700" y1="190" y2="190" />

              {/* Genuine Area & Line */}
              <path d={genuineArea} fill="url(#limeGradient)" />
              <path
                d={genuinePath}
                fill="none"
                stroke="#bbf246"
                strokeLinecap="round"
                strokeWidth="2.5"
              />

              {/* Fraud Area & Line */}
              <path d={fraudArea} fill="url(#coralGradient)" />
              <path
                d={fraudPath}
                fill="none"
                stroke="#f43f5e"
                strokeLinecap="round"
                strokeWidth="2"
              />

              {/* Indicators */}
              <circle cx={pointCoords.lastFraud.x} cy={pointCoords.lastFraud.y} fill="#f43f5e" r="4" stroke="#0f1216" strokeWidth="2" />
              <circle cx={pointCoords.lastGenuine.x} cy={pointCoords.lastGenuine.y} fill="#bbf246" r="4" stroke="#0f1216" strokeWidth="2" />
            </svg>

            {/* Month Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2">
              {visibleTrend.map((item, idx) => (
                <span key={idx}>{item.label}</span>
              ))}
            </div>
          </div>

          {/* Calculated Bottom Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div className="p-2.5 rounded-xl bg-[#181d24]/70 border border-white/10">
              <div className="text-[10px] text-slate-400">Peak Fraud Period</div>
              <div className="text-xs font-bold text-[#f43f5e] mt-0.5">
                {peakMonth.month} ({peakMonth.fraudRate}%)
              </div>
              <div className="text-[9px] text-slate-500 font-mono">{peakMonth.fraud} fraud cases</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181d24]/70 border border-white/10">
              <div className="text-[10px] text-slate-400">Lowest Fraud Period</div>
              <div className="text-xs font-bold text-[#bbf246] mt-0.5">
                {lowestMonth.month} ({lowestMonth.fraudRate}%)
              </div>
              <div className="text-[9px] text-slate-500 font-mono">{lowestMonth.fraud} fraud cases</div>
            </div>
            <div className="hidden sm:block p-2.5 rounded-xl bg-[#181d24]/70 border border-white/10">
              <div className="text-[10px] text-slate-400">Est. Fraud Exposure</div>
              <div className="text-xs font-bold text-white mt-0.5">
                ₹{kpis.estFraudPreventedCr} Crores
              </div>
              <div className="text-[9px] text-[#bbf246] font-medium font-mono">Calculated sum of fraud loans</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Breakdown Dimensions (Employment, Loan Type, Demographics) - CALCULATED FROM DATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Fraud by Employment Status */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
          <h4 className="font-bold text-white text-[16px] sm:text-[18px] mb-3 flex items-center justify-between">
            <span>Fraud by Employment</span>
            <span className="text-[11px] text-slate-400 font-mono">Calculated</span>
          </h4>
          <div className="flex flex-col gap-3.5 text-[13px] sm:text-[14px]">
            {employmentBreakdown.slice(0, 5).map((item) => (
              <div key={item.status}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 font-medium">{item.status}</span>
                  <span className={`font-mono font-semibold ${item.fraudRate > 3 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                    {item.fraudRate}% ({item.fraudCount} apps)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`${item.fraudRate > 3 ? 'bg-[#f43f5e]' : 'bg-[#bbf246]'} h-full rounded-full transition-all`} 
                    style={{ width: `${Math.min(100, Math.max(5, item.fraudRate * 8))}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Fraud by Loan Category */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
          <h4 className="font-bold text-white text-[16px] sm:text-[18px] mb-3 flex items-center justify-between">
            <span>Fraud by Loan Category</span>
            <span className="text-[11px] text-slate-400 font-mono">Calculated</span>
          </h4>
          <div className="flex flex-col gap-3.5 text-[13px] sm:text-[14px]">
            {loanTypeBreakdown.slice(0, 5).map((item) => (
              <div key={item.type}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 font-medium">{item.type}</span>
                  <span className={`font-mono font-semibold ${item.fraudRate > 3 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                    {item.fraudRate}% (₹{item.totalAmountL} L)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`${item.fraudRate > 3 ? 'bg-[#f43f5e]' : 'bg-[#bbf246]'} h-full rounded-full transition-all`} 
                    style={{ width: `${Math.min(100, Math.max(5, item.fraudRate * 8))}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Fraud by Age Group */}
        <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10">
          <h4 className="font-bold text-white text-[16px] sm:text-[18px] mb-3 flex items-center justify-between">
            <span>Fraud by Age Bracket</span>
            <span className="text-[11px] text-slate-400 font-mono">Calculated</span>
          </h4>
          <div className="flex flex-col gap-3.5 text-[13px] sm:text-[14px]">
            {ageBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-300 font-medium">{item.label} yrs</span>
                  <span className={`font-mono font-semibold ${item.fraudRate > 3 ? 'text-[#f43f5e]' : 'text-[#bbf246]'}`}>
                    {item.fraudRate}% ({item.fraudCount} / {item.total})
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`${item.fraudRate > 3 ? 'bg-[#f43f5e]' : 'bg-[#bbf246]'} h-full rounded-full transition-all`} 
                    style={{ width: `${Math.min(100, Math.max(5, item.fraudRate * 8))}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Applications Table from live dataset */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">Applications from Live Dataset</h3>
            <p className="text-[14px] sm:text-[15px] text-slate-400 mt-0.5">Verified loan applications loaded directly into surveillance engine</p>
          </div>
          <button
            onClick={onNavigateToExplorer}
            className="text-[#bbf246] hover:underline text-[13px] sm:text-[14px] font-semibold flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <span>View All {kpis.totalApplications.toLocaleString()} in Data Explorer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] sm:text-[14px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[11px] sm:text-[12px]">
                <th className="pb-3 px-3.5">Application ID</th>
                <th className="pb-3 px-3.5">Customer ID</th>
                <th className="pb-3 px-3.5">Age & Gender</th>
                <th className="pb-3 px-3.5">Loan Type</th>
                <th className="pb-3 px-3.5">Amount Requested</th>
                <th className="pb-3 px-3.5">Tenure</th>
                <th className="pb-3 px-3.5">DTI Ratio</th>
                <th className="pb-3 px-3.5">Fraud Status</th>
                <th className="pb-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {applications.slice(0, 6).map((app) => (
                <tr 
                  key={app.ApplicationID} 
                  onClick={() => onOpenDetails(app)}
                  className="hover:bg-[#181d24] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3.5 font-mono font-bold text-white group-hover:text-[#bbf246] transition-colors">
                    {app.ApplicationID}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-400">
                    {app.CustomerID}
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">
                    {app.ApplicantAge}y • {app.Gender}
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">
                    {app.LoanType}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-medium text-slate-200">
                    ₹{app.LoanAmountRequested.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-400">
                    {app.LoanTenureMonths}m
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-300">
                    {app.DebtToIncomeRatio}%
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-[12px] font-semibold ${
                        app.FraudFlag === 1
                          ? 'bg-[#f43f5e]/15 text-[#f43f5e]'
                          : 'bg-[#bbf246]/15 text-[#bbf246]'
                      }`}
                    >
                      {app.FraudFlag === 1 ? '● Fraud Flagged' : '● Genuine'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetails(app);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#181d24] group-hover:bg-[#bbf246] group-hover:text-[#0a0c0e] text-slate-300 text-[11px] sm:text-[12px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
