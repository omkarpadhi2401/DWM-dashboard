import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { getApplications, getReference, Reference } from '../../services/backendApi';
import { STATUS_LABEL } from '../../lib/format';
import { navigate, Route, useQueryState } from '../../lib/router';
import { useStats } from '../../lib/stats';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, useAsync } from '../../ui';
import { ApplicationTable } from './ApplicationTable';

const FILTER_DEFAULTS = {
  status: 'all', search: '', loan_type: 'all', employment: 'all', gender: 'all', risk: 'all', fraud: 'all', source: 'all',
  date_from: '', date_to: '', sort: 'applicationDate', order: 'desc', page: '1', page_size: '25',
};
const NEW_DEFAULTS = { ...FILTER_DEFAULTS, sort: 'applicationDate', order: 'asc' };

const FILTER_LABELS: Record<string, string> = {
  loan_type: 'Loan type', employment: 'Employment', gender: 'Gender', risk: 'Risk', fraud: 'Fraud status', source: 'Source', date_from: 'From', date_to: 'To',
};
const FRAUD_LABELS: Record<string, string> = { flagged: 'Fraud flagged', not_flagged: 'Not flagged' };
const SOURCE_LABELS: Record<string, string> = { portal: 'Customer portal', dataset: 'Historical dataset' };

let referenceCache: Reference | null = null;

export function ApplicationsPage({ mode, route }: { mode: 'new' | 'all'; route: Route }) {
  const defaults = mode === 'new' ? NEW_DEFAULTS : FILTER_DEFAULTS;
  const [query, update] = useQueryState(route, defaults);
  const { stats, refresh: refreshStats } = useStats();
  const [reference, setReference] = useState<Reference | null>(referenceCache);
  const [searchInput, setSearchInput] = useState(query.search);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!referenceCache) getReference().then((value) => { referenceCache = value; setReference(value); }).catch(() => undefined);
  }, []);
  // Keep the text box in sync when the URL changes (clear filters, back button).
  useEffect(() => setSearchInput(query.search), [query.search]);
  // Debounce typing into the URL.
  useEffect(() => {
    if (searchInput === query.search) return;
    const timer = window.setTimeout(() => update({ search: searchInput, page: '1' }), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const status = mode === 'new' ? 'NEW' : query.status;
  const params = { ...query, status };
  const key = JSON.stringify(params);
  const list = useAsync(() => getApplications(params), [key]);

  const active = useMemo(
    () => Object.keys(FILTER_LABELS).filter((name) => query[name] !== defaults[name as keyof typeof defaults]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const hasAnyFilter = active.length > 0 || query.search !== '' || (mode === 'all' && query.status !== 'all');
  const clearAll = () => {
    setSearchInput('');
    const reset: Record<string, string> = {};
    for (const name of Object.keys(defaults)) if (name !== 'page_size') reset[name] = defaults[name as keyof typeof defaults];
    update(reset);
  };
  const chipValue = (name: string) => {
    const value = query[name];
    if (name === 'fraud') return FRAUD_LABELS[value] ?? value;
    if (name === 'source') return SOURCE_LABELS[value] ?? value;
    if (name === 'risk') return value.charAt(0) + value.slice(1).toLowerCase();
    return value;
  };

  const tabs: { value: string; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats?.total },
    { value: 'NEW', label: 'New', count: stats?.new },
    { value: 'UNDER_REVIEW', label: 'Under Review', count: stats?.underReview },
    { value: 'APPROVED', label: 'Approved', count: stats?.approved },
    { value: 'REJECTED', label: 'Rejected', count: stats?.rejected },
  ];

  const select = (name: string, label: string, options: { value: string; label: string }[]) => (
    <label className="field">
      <span className="field-hint">{label}</span>
      <select value={query[name]} onChange={(event) => update({ [name]: event.target.value, page: '1' })} aria-label={label}>
        <option value="all">All</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
  const opts = (values: string[] | undefined) => (values ?? []).map((value) => ({ value, label: value }));

  const reload = () => {
    list.reload();
    refreshStats();
  };

  return (
    <>
      <PageHeader
        title={mode === 'new' ? 'New Applications' : 'All Applications'}
        description={
          mode === 'new'
            ? 'Your work queue: applications submitted through the customer portal that are waiting for a first decision. Oldest first.'
            : 'Historical and current applications. Historical dataset records are read-only; decisions can be made on portal applications.'
        }
        actions={
          <>
            {mode === 'new' && stats && stats.underReview > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/applications?status=UNDER_REVIEW')}>
                Under review ({stats.underReview}) <ArrowRight size={15} />
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={reload}><RefreshCw size={15} /> Refresh</button>
          </>
        }
      />

      <Card className="flush">
        {mode === 'all' && (
          <div className="tabs" role="tablist" style={{ padding: '0 12px' }}>
            {tabs.map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={query.status === tab.value}
                key={tab.value}
                className={`tab ${query.status === tab.value ? 'active' : ''}`}
                onClick={() => update({ status: tab.value, page: '1' })}
              >
                {tab.label}
                {tab.count !== undefined && <span className="count">{tab.count.toLocaleString()}</span>}
              </button>
            ))}
          </div>
        )}
        <div style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
          <div className="toolbar">
            <div className="search">
              <Search size={16} />
              <input
                placeholder="Search application ID, customer ID or applicant name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search applications"
              />
              {searchInput && (
                <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => { setSearchInput(''); update({ search: '', page: '1' }); }}>
                  <X size={15} />
                </button>
              )}
            </div>
            <button type="button" className={`btn btn-secondary ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>
              <SlidersHorizontal size={15} /> Filters{active.length ? ` (${active.length})` : ''}
            </button>
            {hasAnyFilter && <button type="button" className="btn btn-ghost" onClick={clearAll}>Clear filters</button>}
          </div>
          {active.length > 0 && (
            <div className="chips" aria-label="Active filters">
              {active.map((name) => (
                <span className="chip" key={name}>
                  {FILTER_LABELS[name]}: {chipValue(name)}
                  <button type="button" aria-label={`Remove ${FILTER_LABELS[name]} filter`} onClick={() => update({ [name]: defaults[name as keyof typeof defaults], page: '1' })}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {showFilters && (
            <div className="filters-panel">
              {select('loan_type', 'Loan type', opts(reference?.loanTypes))}
              {select('employment', 'Employment', opts(reference?.employment))}
              {select('gender', 'Gender', opts(reference?.genders))}
              {select('risk', 'Risk level', [{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }])}
              {select('fraud', 'Fraud status', [{ value: 'flagged', label: 'Fraud flagged' }, { value: 'not_flagged', label: 'Not flagged' }])}
              {mode === 'all' && select('source', 'Source', [{ value: 'portal', label: 'Customer portal' }, { value: 'dataset', label: 'Historical dataset' }])}
              <label className="field">
                <span className="field-hint">Date from</span>
                <input type="date" value={query.date_from} max={query.date_to || undefined} onChange={(event) => update({ date_from: event.target.value, page: '1' })} />
              </label>
              <label className="field">
                <span className="field-hint">Date to</span>
                <input type="date" value={query.date_to} min={query.date_from || undefined} onChange={(event) => update({ date_to: event.target.value, page: '1' })} />
              </label>
            </div>
          )}
        </div>

        {list.error ? (
          <ErrorState title="Unable to load applications" message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <LoadingState label="Loading applications…" />
        ) : list.data && list.data.total === 0 ? (
          hasAnyFilter ? (
            <EmptyState title="No applications found" message="No applications match the current search or filters." action={<button type="button" className="btn btn-secondary" onClick={clearAll}>Clear filters</button>} />
          ) : mode === 'new' ? (
            <EmptyState title="No new applications" message="New applications submitted by customers will appear here." />
          ) : (
            <EmptyState title={`No ${query.status === 'all' ? '' : STATUS_LABEL[query.status as keyof typeof STATUS_LABEL]?.toLowerCase() + ' '}applications`} />
          )
        ) : list.data ? (
          <>
            <div className={`table-wrap ${list.loading ? 'is-loading' : ''}`} aria-busy={list.loading}>
              <ApplicationTable
                items={list.data.items}
                sort={{ sort: query.sort, order: query.order as 'asc' | 'desc' }}
                onSort={(next) => update({ sort: next.sort, order: next.order, page: '1' })}
              />
            </div>
            <Pagination
              page={Number(query.page)}
              pageSize={Number(query.page_size)}
              total={list.data.total}
              label="applications"
              onPage={(page) => update({ page: String(page) })}
              onPageSize={(size) => update({ page_size: String(size), page: '1' })}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}
