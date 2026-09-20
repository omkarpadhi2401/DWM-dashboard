import React from 'react';
import { RefreshCw, AlertTriangle, Database, ShieldAlert } from 'lucide-react';

interface LoadingSkeletonProps {
  endpoint: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ endpoint }) => {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none">
      {/* Loading banner */}
      <div className="p-4 rounded-2xl bg-[#14181d] border border-[#38bdf8]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Synchronizing dataset...</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Connecting to live REST endpoint: {endpoint}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#181e28] text-[#38bdf8] border border-[#38bdf8]/20">
          PARSING PAYLOAD
        </span>
      </div>

      {/* 5 Shimmering KPI Skeleton Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[#14181d] border border-white/5 p-4 flex flex-col justify-between">
            <div className="h-3 w-24 bg-white/10 rounded-md" />
            <div className="h-7 w-32 bg-white/15 rounded-md" />
            <div className="h-2 w-20 bg-white/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* 2 Main Visual Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 h-72 rounded-2xl bg-[#14181d] border border-white/5 p-5 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-8 border-white/10 border-t-[#38bdf8] animate-spin" />
        </div>
        <div className="lg:col-span-7 h-72 rounded-2xl bg-[#14181d] border border-white/5 p-5 flex flex-col justify-between">
          <div className="h-4 w-48 bg-white/10 rounded-md" />
          <div className="h-44 w-full bg-white/5 rounded-xl" />
          <div className="h-3 w-36 bg-white/5 rounded-md" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="h-64 rounded-2xl bg-[#14181d] border border-white/5 p-5 flex flex-col gap-3">
        <div className="h-4 w-40 bg-white/10 rounded-md" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-full bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ErrorStateCardProps {
  error: string;
  onRetry: () => void;
  endpoint: string;
}

export const ErrorStateCard: React.FC<ErrorStateCardProps> = ({ error, onRetry, endpoint }) => {
  return (
    <div className="rounded-2xl bg-[#14181d] border border-[#f43f5e]/40 p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_0_40px_-5px_rgba(244,63,94,0.15)] max-w-2xl mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-[#f43f5e]/15 border border-[#f43f5e]/30 flex items-center justify-center text-[#f43f5e] mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-lg font-bold text-white mb-1">
        Unable to synchronize dataset
      </h3>

      <p className="text-xs text-slate-400 mb-4 max-w-md">
        The application could not retrieve loan application records from the SheetDB REST API endpoint.
      </p>

      <div className="w-full bg-[#181d24] border border-white/10 rounded-xl p-3 mb-6 text-left font-mono text-xs">
        <div className="text-slate-400 mb-1 text-[11px]">TARGET ENDPOINT:</div>
        <div className="text-slate-200 break-all mb-2">{endpoint}</div>
        <div className="text-[#f43f5e] text-[11px] font-semibold">
          ERROR: {error || 'Failed to fetch array payload from remote server.'}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs transition-all shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)] flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Synchronization</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-500 mt-4">
        Technical error details have also been logged to your browser developer console for debugging.
      </p>
    </div>
  );
};
