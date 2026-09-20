import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { LoanApplication } from '../types';

interface DataExplorerViewProps {
  applications: LoanApplication[];
  onOpenDetails: (app: LoanApplication) => void;
  onExportCSV: () => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  applications,
  onOpenDetails,
  onExportCSV,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('ALL');
  const [employmentFilter, setEmploymentFilter] = useState('ALL');
  const [fraudFilter, setFraudFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof LoanApplication>('ApplicationID');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dynamic filter options based on real data
  const availableLoanTypes = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.LoanType).filter(Boolean)));
  }, [applications]);

  const availableEmployment = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.EmploymentStatus).filter(Boolean)));
  }, [applications]);

  // In-memory filter on actual applications array
  const filteredRecords = useMemo(() => {
    return applications.filter((app) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchId = app.ApplicationID?.toLowerCase().includes(query);
        const matchCust = app.CustomerID?.toLowerCase().includes(query);
        const matchName = app.ApplicantName?.toLowerCase().includes(query);
        const matchType = app.LoanType?.toLowerCase().includes(query);
        const matchEmp = app.EmploymentStatus?.toLowerCase().includes(query);
        const matchFraudType = app.FraudType?.toLowerCase().includes(query);
        if (!matchId && !matchCust && !matchName && !matchType && !matchEmp && !matchFraudType) {
          return false;
        }
      }

      // Loan Type
      if (loanTypeFilter !== 'ALL' && app.LoanType !== loanTypeFilter) {
        return false;
      }

      // Employment
      if (employmentFilter !== 'ALL' && app.EmploymentStatus !== employmentFilter) {
        return false;
      }

      // Fraud Status
      if (fraudFilter === 'FRAUD' && app.FraudFlag !== 1) return false;
      if (fraudFilter === 'GENUINE' && app.FraudFlag !== 0) return false;

      return true;
    });
  }, [applications, searchQuery, loanTypeFilter, employmentFilter, fraudFilter]);

  // Sort filtered records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortOrder]);

  // Pagination
  const totalEntries = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const pageData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, validPage, pageSize]);

  const handleSort = (field: keyof LoanApplication) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setLoanTypeFilter('ALL');
    setEmploymentFilter('ALL');
    setFraudFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Data Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified records fetched directly from the SheetDB REST API endpoint.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#14181d] border border-white/10 text-[#bbf246]">
            ● {applications.length.toLocaleString()} Live Records Loaded
          </span>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#bbf246] hover:bg-[#a3e635] text-[#0a0c0e] font-bold text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-[#14181d] rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, Customer, Type, Fraud..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-xs text-slate-200 pl-9 pr-4 py-2 rounded-xl border border-white/10 focus:border-[#bbf246] focus:outline-none placeholder-slate-500"
              />
            </div>

            {/* Loan Type Filter */}
            <select
              value={loanTypeFilter}
              onChange={(e) => {
                setLoanTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#181d24] text-xs text-slate-300 py-2 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none"
            >
              <option value="ALL">All Loan Types</option>
              {availableLoanTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Employment Filter */}
            <select
              value={employmentFilter}
              onChange={(e) => {
                setEmploymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#181d24] text-xs text-slate-300 py-2 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none"
            >
              <option value="ALL">All Employment</option>
              {availableEmployment.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>

            {/* Fraud Filter */}
            <select
              value={fraudFilter}
              onChange={(e) => {
                setFraudFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#181d24] text-xs text-slate-300 py-2 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none"
            >
              <option value="ALL">All Fraud Statuses</option>
              <option value="FRAUD">Fraud Flagged Only (1)</option>
              <option value="GENUINE">Genuine Only (0)</option>
            </select>

            {/* Rows per page */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#181d24] text-xs text-slate-300 py-2 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none font-mono"
            >
              <option value={10}>10 rows</option>
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Showing <span className="text-white font-bold">{totalEntries.toLocaleString()}</span> of {applications.length.toLocaleString()}
            </span>
            {(searchQuery || loanTypeFilter !== 'ALL' || employmentFilter !== 'ALL' || fraudFilter !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 underline transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Table with Exact Required Fields */}
        <div className="overflow-x-auto border border-white/10 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#181d24]/90 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th
                  onClick={() => handleSort('ApplicationID')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>ApplicationID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('CustomerID')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>CustomerID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ApplicantAge')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Gender</th>
                <th className="py-3 px-3">EmploymentStatus</th>
                <th className="py-3 px-3">LoanType</th>
                <th
                  onClick={() => handleSort('LoanAmountRequested')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>LoanAmount</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Tenure</th>
                <th
                  onClick={() => handleSort('InterestRateOffered')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Interest%</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('MonthlyIncome')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>MonthlyIncome</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">ExistingEMIs</th>
                <th
                  onClick={() => handleSort('DebtToIncomeRatio')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>DTI</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">LoanStatus</th>
                <th
                  onClick={() => handleSort('FraudFlag')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>FraudFlag</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">FraudType</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#14181d]">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    No applications match the active filters or search query.
                  </td>
                </tr>
              ) : (
                pageData.map((app) => (
                  <tr
                    key={app.ApplicationID}
                    className="hover:bg-[#181d24]/60 transition-colors"
                  >
                    {/* ApplicationID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {app.ApplicationID}
                    </td>
                    {/* CustomerID */}
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {app.CustomerID}
                    </td>
                    {/* ApplicantAge */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {app.ApplicantAge}
                    </td>
                    {/* Gender */}
                    <td className="py-2.5 px-3 text-slate-300">
                      {app.Gender}
                    </td>
                    {/* EmploymentStatus */}
                    <td className="py-2.5 px-3 text-slate-300">
                      {app.EmploymentStatus}
                    </td>
                    {/* LoanType */}
                    <td className="py-2.5 px-3 text-slate-300">
                      {app.LoanType}
                    </td>
                    {/* LoanAmountRequested */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-100">
                      ₹{app.LoanAmountRequested.toLocaleString('en-IN')}
                    </td>
                    {/* LoanTenureMonths */}
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {app.LoanTenureMonths}m
                    </td>
                    {/* InterestRateOffered */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {app.InterestRateOffered}%
                    </td>
                    {/* MonthlyIncome */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      ₹{app.MonthlyIncome.toLocaleString('en-IN')}
                    </td>
                    {/* ExistingEMIs */}
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      ₹{app.ExistingEMIs.toLocaleString('en-IN')}
                    </td>
                    {/* DebtToIncomeRatio */}
                    <td className="py-2.5 px-3 font-mono">
                      <span className={app.DebtToIncomeRatio > 40 ? 'text-[#f43f5e] font-bold' : 'text-slate-300'}>
                        {app.DebtToIncomeRatio}%
                      </span>
                    </td>
                    {/* LoanStatus */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          app.LoanStatus === 'Approved'
                            ? 'bg-[#bbf246]/15 text-[#bbf246]'
                            : app.LoanStatus === 'Rejected'
                            ? 'bg-[#f43f5e]/15 text-[#f43f5e]'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {app.LoanStatus}
                      </span>
                    </td>
                    {/* FraudFlag */}
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.FraudFlag === 1
                            ? 'bg-[#f43f5e] text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {app.FraudFlag}
                      </span>
                    </td>
                    {/* FraudType */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {app.FraudType || 'None'}
                    </td>
                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onOpenDetails(app)}
                        className="p-1.5 rounded-lg bg-[#181d24] hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-1"
                        title="View Full Application Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 font-mono">
            Page <span className="text-white font-bold">{validPage}</span> of {totalPages} ({totalEntries.toLocaleString()} items)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="px-3 py-1.5 rounded-xl bg-[#181d24] hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs text-slate-300 font-medium transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Quick Page Jump indicators */}
            <div className="hidden sm:flex items-center gap-1 font-mono text-xs">
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let p = idx + 1;
                if (validPage > 3 && totalPages > 5) {
                  p = validPage - 3 + idx;
                  if (p > totalPages) p = totalPages - 4 + idx;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      validPage === p
                        ? 'bg-[#bbf246] text-[#0a0c0e]'
                        : 'bg-[#181d24] text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="px-3 py-1.5 rounded-xl bg-[#181d24] hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs text-slate-300 font-medium transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
