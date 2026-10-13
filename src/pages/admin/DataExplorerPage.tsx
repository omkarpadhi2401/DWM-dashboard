import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Search, X } from 'lucide-react';
import { RecordRow, Reference, getRecords, getReference } from '../../services/backendApi';
import { money, pretty } from '../../lib/format';
import { navigate, Route, useQueryState } from '../../lib/router';
import { Card, Dialog, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, useAsync } from '../../ui';

const DEFAULTS = { search: '', fraud: 'all', loan_type: 'all', employment: 'all', gender: 'all', loan_status: 'all', sort: 'ApplicationID', order: 'asc', page: '1', page_size: '25' };
const FILTER_LABELS: Record<string, string> = { fraud: 'Fraud label', loan_type: 'Loan type', employment: 'Employment', gender: 'Gender', loan_status: 'Loan status' };
const LOAN_STATUSES = ['Approved', 'Declined', 'Fraudulent - Detected', 'Fraudulent - Undetected'];
const COLUMNS: { key: string; label: string; sortable: boolean; num?: boolean }[] = [
  { key: 'ApplicationID', label: 'Application ID', sortable: true },
  { key: 'CustomerID', label: 'Customer ID', sortable: true },
  { key: 'ApplicationDate', label: 'Date', sortable: true },
  { key: 'LoanType', label: 'Loan type', sortable: true },
  { key: 'EmploymentStatus', label: 'Employment', sortable: true },
  { key: 'LoanAmountRequested', label: 'Loan amount', sortable: true, num: true },
  { key: 'MonthlyIncome', label: 'Monthly income', sortable: true, num: true },
  { key: 'DebtToIncomeRatio', label: 'DTI %', sortable: true, num: true },
  { key: 'FraudFlag', label: 'Fraud label', sortable: true },
  { key: 'LoanStatus', label: 'Loan status', sortable: true },
];

export function DataExplorerPage({ route, canOpenApplication = true }: { route: Route; canOpenApplication?: boolean }) {
  const [query, update] = useQueryState(route, DEFAULTS);
  const [searchInput, setSearchInput] = useState(query.search);
  const [reference, setReference] = useState<Reference | null>(null);
  const [selected, setSelected] = useState<RecordRow | null>(null);

  useEffect(() => { getReference().then(setReference).catch(() => undefined); }, []);
  useEffect(() => setSearchInput(query.search), [query.search]);
  useEffect(() => {
    if (searchInput === query.search) return;
    const timer = window.setTimeout(() => update({ search: searchInput, page: '1' }), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const key = JSON.stringify(query);
  const records = useAsync(() => getRecords(query), [key]);
  const active = useMemo(() => Object.keys(FILTER_LABELS).filter((name) => query[name] !== 'all'), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = active.length > 0 || query.search !== '';
  const clearAll = () => {
    setSearchInput('');
    update({ search: '', fraud: 'all', loan_type: 'all', employment: 'all', gender: 'all', loan_status: 'all', page: '1' });
  };
  const chipValue = (name: string) => (name === 'fraud' ? (query.fraud === '1' ? 'Fraud' : 'Genuine') : query[name]);
  const select = (name: string, label: string, options: { value: string; label: string }[]) => (
    <select value={query[name]} onChange={(event) => update({ [name]: event.target.value, page: '1' })} aria-label={label}>
      <option value="all">{label}: All</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
  const opts = (values: string[] | undefined) => (values ?? []).map((value) => ({ value, label: value }));
  const cell = (row: RecordRow, key: string) => {
    const value = row[key];
    if (key === 'LoanAmountRequested' || key === 'MonthlyIncome') return money(Number(value));
    if (key === 'FraudFlag') return Number(value) === 1 ? <span className="badge risk-high">Fraud</span> : <span className="badge neutral">Genuine</span>;
    return String(value ?? '');
  };

  return (
    <>
      <PageHeader
        title="Data Explorer"
        description="Browse the raw historical dataset exactly as stored in data/cleaned_dataset.csv."
        actions={<button type="button" className="btn btn-secondary" onClick={records.reload}><RefreshCw size={15} /> Refresh</button>}
      />
      <Card className="flush">
        <div style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
          <div className="toolbar">
            <div className="search">
              <Search size={16} />
              <input placeholder="Search application ID or customer ID" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} aria-label="Search records" />
              {searchInput && <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => { setSearchInput(''); update({ search: '', page: '1' }); }}><X size={15} /></button>}
            </div>
            {select('fraud', 'Fraud label', [{ value: '1', label: 'Fraud' }, { value: '0', label: 'Genuine' }])}
            {select('loan_type', 'Loan type', opts(reference?.loanTypes))}
            {select('employment', 'Employment', opts(reference?.employment))}
            {select('gender', 'Gender', opts(reference?.genders))}
            {select('loan_status', 'Loan status', opts(LOAN_STATUSES))}
            {filtered && <button type="button" className="btn btn-ghost" onClick={clearAll}>Clear filters</button>}
          </div>
          {active.length > 0 && (
            <div className="chips">
              {active.map((name) => (
                <span className="chip" key={name}>
                  {FILTER_LABELS[name]}: {chipValue(name)}
                  <button type="button" aria-label={`Remove ${FILTER_LABELS[name]} filter`} onClick={() => update({ [name]: 'all', page: '1' })}><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        {records.error ? (
          <ErrorState title="Unable to load records" message={records.error} onRetry={records.reload} />
        ) : records.loading && !records.data ? (
          <LoadingState label="Loading records…" />
        ) : records.data && records.data.total === 0 ? (
          <EmptyState title="No records found" message="No records match the current search or filters." action={filtered ? <button type="button" className="btn btn-secondary" onClick={clearAll}>Clear filters</button> : undefined} />
        ) : records.data ? (
          <>
            <div className={`table-wrap ${records.loading ? 'is-loading' : ''}`} aria-busy={records.loading}>
              <table>
                <thead>
                  <tr>
                    {COLUMNS.map((column) => {
                      const isActive = query.sort === column.key;
                      return (
                        <th key={column.key} className={column.num ? 'num' : ''}>
                          <button type="button" className={`sort ${isActive ? 'active' : ''}`} onClick={() => update({ sort: column.key, order: isActive && query.order === 'asc' ? 'desc' : 'asc', page: '1' })}>
                            {column.label}
                            {isActive ? (query.order === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} opacity={0.45} />}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {records.data.records.map((row) => (
                    <tr key={String(row.ApplicationID)} className="clickable" onClick={() => setSelected(row)}>
                      {COLUMNS.map((column) => <td key={column.key} className={column.num ? 'num' : column.key.endsWith('ID') ? 'mono' : ''}>{cell(row, column.key)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={Number(query.page)}
              pageSize={Number(query.page_size)}
              total={records.data.total}
              onPage={(page) => update({ page: String(page) })}
              onPageSize={(size) => update({ page_size: String(size), page: '1' })}
            />
          </>
        ) : null}
      </Card>
      {selected && (
        <Dialog
          title={`Record ${selected.ApplicationID}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {canOpenApplication && <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/applications/${encodeURIComponent(String(selected.ApplicationID))}`)}>Open application</button>}
            </>
          }
        >
          <dl className="dl">
            {Object.entries(selected).map(([name, value]) => (
              <div key={name} className={name === 'ResidentialAddress' ? 'span-2' : ''}>
                <dt>{pretty(name)}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </>
  );
}
