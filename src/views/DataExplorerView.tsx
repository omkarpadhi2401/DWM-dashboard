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
  RotateCcw,
  Calendar
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
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [fraudFilter, setFraudFilter] = useState('ALL');
  const [loanTypeFilter, setLoanTypeFilter] = useState('ALL');
  const [employmentFilter, setEmploymentFilter] = useState('ALL');
  const [loanStatusFilter, setLoanStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [datePeriodFilter, setDatePeriodFilter] = useState('ALL');

  const [sortField, setSortField] = useState<keyof LoanApplication>('ApplicationID');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dynamic filter options based on dataset
  const availableLoanTypes = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.LoanType).filter(Boolean))).sort();
  }, [applications]);

  const availableEmployment = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.EmploymentStatus).filter(Boolean))).sort();
  }, [applications]);

  const availableLoanStatuses = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.LoanStatus).filter(Boolean))).sort();
  }, [applications]);

  const availableGenders = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.Gender).filter(Boolean))).sort();
  }, [applications]);

  // Comprehensive filter logic based on dataset state
  const filteredRecords = useMemo(() => {
    const now = new Date('2024-04-15'); // Reference timeline for date periods

    return applications.filter((app) => {
      // 1. Search by ApplicationID or CustomerID (and name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchId = app.ApplicationID?.toLowerCase().includes(query);
        const matchCust = app.CustomerID?.toLowerCase().includes(query);
        const matchName = app.ApplicantName?.toLowerCase().includes(query);
        if (!matchId && !matchCust && !matchName) {
          return false;
        }
      }

      // 2. Fraud Status (ALL, GENUINE, FRAUD)
      if (fraudFilter === 'FRAUD' && app.FraudFlag !== 1) return false;
      if (fraudFilter === 'GENUINE' && app.FraudFlag !== 0) return false;

      // 3. Loan Type
      if (loanTypeFilter !== 'ALL' && app.LoanType !== loanTypeFilter) {
        return false;
      }

      // 4. Employment Status
      if (employmentFilter !== 'ALL' && app.EmploymentStatus !== employmentFilter) {
        return false;
      }

      // 5. Loan Status
      if (loanStatusFilter !== 'ALL' && app.LoanStatus !== loanStatusFilter) {
        return false;
      }

      // 6. Gender
      if (genderFilter !== 'ALL' && app.Gender !== genderFilter) {
        return false;
      }

      // 7. Date / Period Filter
      if (datePeriodFilter !== 'ALL' && app.ApplicationDate) {
        const appDate = new Date(app.ApplicationDate);
        if (!isNaN(appDate.getTime())) {
          if (datePeriodFilter === '30D') {
            const diffDays = (now.getTime() - appDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30 || diffDays < 0) return false;
          } else if (datePeriodFilter === '90D') {
            const diffDays = (now.getTime() - appDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 90 || diffDays < 0) return false;
          } else if (datePeriodFilter === '2024') {
            if (appDate.getFullYear() !== 2024) return false;
          } else if (datePeriodFilter === '2023') {
            if (appDate.getFullYear() !== 2023) return false;
          }
        }
      }

      return true;
    });
  }, [
    applications,
    searchQuery,
    fraudFilter,
    loanTypeFilter,
    employmentFilter,
    loanStatusFilter,
    genderFilter,
    datePeriodFilter,
  ]);

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

  // Pagination calculation
  const totalEntries = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const startRecordIndex = totalEntries > 0 ? (validPage - 1) * pageSize + 1 : 0;
  const endRecordIndex = Math.min(validPage * pageSize, totalEntries);

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

  const handleClearFilters = () => {
    setSearchQuery('');
    setFraudFilter('ALL');
    setLoanTypeFilter('ALL');
    setEmploymentFilter('ALL');
    setLoanStatusFilter('ALL');
    setGenderFilter('ALL');
    setDatePeriodFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = Boolean(
    searchQuery ||
    fraudFilter !== 'ALL' ||
    loanTypeFilter !== 'ALL' ||
    employmentFilter !== 'ALL' ||
    loanStatusFilter !== 'ALL' ||
    genderFilter !== 'ALL' ||
    datePeriodFilter !== 'ALL'
  );

  return (
    <section className="flex flex-col gap-6 sm:gap-7">
      {/* Page Header (32-36px font title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Data Explorer
          </h2>
          <p className="text-base text-slate-400 mt-1.5 leading-relaxed">
            Browse, search, filter, and inspect verified loan application records. Click any row to view full dossier.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-mono px-4 py-2.5 rounded-xl bg-[#14181d] border border-white/10 text-[#bbf246] font-bold">
            ● {applications.length.toLocaleString()} Active Records
          </span>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#bbf246] hover:bg-[#a3e635] text-[#0a0c0e] font-bold text-[15px] transition-colors cursor-pointer shadow-[0_0_20px_-3px_rgba(187,242,70,0.25)]"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table & Filter Controls Container */}
      <div className="bg-[#14181d] rounded-2xl p-6 border border-white/10 flex flex-col gap-5 shadow-sm">
        {/* Filter Controls Row */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* 1. Search (ApplicationID, CustomerID) */}
            <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ApplicationID or CustomerID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-[#bbf246] focus:outline-none placeholder-slate-500 font-mono"
              />
            </div>

            {/* 2. Fraud Status Filter */}
            <div>
              <select
                value={fraudFilter}
                onChange={(e) => {
                  setFraudFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-300 py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Fraud Status: All</option>
                <option value="GENUINE">Genuine (Flag = 0)</option>
                <option value="FRAUD">Fraud Flagged (Flag = 1)</option>
              </select>
            </div>

            {/* 3. Loan Type Filter */}
            <div>
              <select
                value={loanTypeFilter}
                onChange={(e) => {
                  setLoanTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-300 py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Loan Type: All</option>
                {availableLoanTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Employment Status Filter */}
            <div>
              <select
                value={employmentFilter}
                onChange={(e) => {
                  setEmploymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-300 py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Employment: All</option>
                {availableEmployment.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Loan Status Filter */}
            <div>
              <select
                value={loanStatusFilter}
                onChange={(e) => {
                  setLoanStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-300 py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Loan Status: All</option>
                {availableLoanStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Gender Filter */}
            <div>
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181d24] text-[15px] text-slate-300 py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Gender: All</option>
                {availableGenders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-row: Period Filter, Rows Per Page, Clear Filters, and Record Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date / Period Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Period:</span>
                <select
                  value={datePeriodFilter}
                  onChange={(e) => {
                    setDatePeriodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#181d24] text-[15px] text-slate-300 py-1.5 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none cursor-pointer"
                >
                  <option value="ALL">All Periods</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="2024">Year 2024</option>
                  <option value="2023">Year 2023</option>
                </select>
              </div>

              {/* Rows Per Page Selector: 10, 25, 50, 100 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#181d24] text-[15px] text-slate-300 py-1.5 px-3 rounded-xl border border-white/10 focus:border-[#bbf246] outline-none font-mono cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* "Showing X–Y of Z records" Count */}
            <div className="text-[15px] font-mono text-slate-300">
              Showing <span className="text-white font-bold">{startRecordIndex}–{endRecordIndex}</span> of <span className="text-[#bbf246] font-bold">{applications.length.toLocaleString()}</span> records
              {totalEntries !== applications.length && (
                <span className="text-slate-400 text-xs ml-1.5">
                  ({totalEntries.toLocaleString()} matching criteria)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Database Table with Exact Required Fields and Column Sorting */}
        <div className="overflow-x-auto border border-white/10 rounded-xl">
          <table className="w-full text-left text-[15px] whitespace-nowrap">
            <thead className="bg-[#181d24]/90 text-slate-400 uppercase tracking-wider font-semibold text-xs select-none">
              <tr>
                <th
                  onClick={() => handleSort('ApplicationID')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ApplicationID</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('CustomerID')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CustomerID</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ApplicantAge')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Age</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-3.5">Gender</th>
                <th className="py-3.5 px-3.5">Employment</th>
                <th className="py-3.5 px-3.5">LoanType</th>
                <th
                  onClick={() => handleSort('LoanAmountRequested')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>LoanAmount</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-3.5">Tenure</th>
                <th
                  onClick={() => handleSort('InterestRateOffered')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Interest%</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('MonthlyIncome')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MonthlyIncome</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('DebtToIncomeRatio')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DTI</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-3.5">Status</th>
                <th
                  onClick={() => handleSort('FraudFlag')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>FraudFlag</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-3.5">FraudType</th>
                <th className="py-3.5 px-3.5 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#14181d]">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-14 text-center text-slate-400 text-base">
                    No applications match the active filters or search criteria.
                  </td>
                </tr>
              ) : (
                pageData.map((app) => (
                  <tr
                    key={app.ApplicationID}
                    onClick={() => onOpenDetails(app)}
                    className="hover:bg-[#181d24] transition-colors cursor-pointer group"
                    title="Click row to open application details dossier"
                  >
                    {/* ApplicationID */}
                    <td className="py-3.5 px-3.5 font-mono font-bold text-white group-hover:text-[#bbf246] transition-colors">
                      {app.ApplicationID}
                    </td>
                    {/* CustomerID */}
                    <td className="py-3.5 px-3.5 font-mono text-slate-400">
                      {app.CustomerID}
                    </td>
                    {/* ApplicantAge */}
                    <td className="py-3.5 px-3.5 font-mono text-slate-300">
                      {app.ApplicantAge}
                    </td>
                    {/* Gender */}
                    <td className="py-3.5 px-3.5 text-slate-300">
                      {app.Gender}
                    </td>
                    {/* EmploymentStatus */}
                    <td className="py-3.5 px-3.5 text-slate-300">
                      {app.EmploymentStatus}
                    </td>
                    {/* LoanType */}
                    <td className="py-3.5 px-3.5 text-slate-300">
                      {app.LoanType}
                    </td>
                    {/* LoanAmountRequested */}
                    <td className="py-3.5 px-3.5 font-mono font-semibold text-slate-100">
                      ₹{app.LoanAmountRequested.toLocaleString('en-IN')}
                    </td>
                    {/* LoanTenureMonths */}
                    <td className="py-3.5 px-3.5 font-mono text-slate-400">
                      {app.LoanTenureMonths}m
                    </td>
                    {/* InterestRateOffered */}
                    <td className="py-3.5 px-3.5 font-mono text-slate-300">
                      {app.InterestRateOffered}%
                    </td>
                    {/* MonthlyIncome */}
                    <td className="py-3.5 px-3.5 font-mono text-slate-300">
                      ₹{app.MonthlyIncome.toLocaleString('en-IN')}
                    </td>
                    {/* DebtToIncomeRatio */}
                    <td className="py-3.5 px-3.5 font-mono">
                      <span className={app.DebtToIncomeRatio > 40 ? 'text-[#f43f5e] font-bold' : 'text-slate-300'}>
                        {app.DebtToIncomeRatio}%
                      </span>
                    </td>
                    {/* LoanStatus */}
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                    <td className="py-3.5 px-3.5 font-mono">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          app.FraudFlag === 1
                            ? 'bg-[#f43f5e] text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {app.FraudFlag}
                      </span>
                    </td>
                    {/* FraudType */}
                    <td className="py-3.5 px-3.5 text-slate-400 text-xs">
                      {app.FraudType || 'None'}
                    </td>
                    {/* Action */}
                    <td className="py-3.5 px-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(app);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#181d24] group-hover:bg-[#bbf246] group-hover:text-[#0a0c0e] text-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                        title="View Full Application Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-[15px] text-slate-300 font-mono">
            Showing <span className="text-white font-bold">{startRecordIndex}–{endRecordIndex}</span> of <span className="text-[#bbf246] font-bold">{totalEntries.toLocaleString()}</span> records &bull; Page {validPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="px-4 py-2 rounded-xl bg-[#181d24] hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-sm text-slate-200 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Quick Page Jump indicators */}
            <div className="hidden sm:flex items-center gap-1 font-mono text-sm">
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
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
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
              className="px-4 py-2 rounded-xl bg-[#181d24] hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-sm text-slate-200 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
