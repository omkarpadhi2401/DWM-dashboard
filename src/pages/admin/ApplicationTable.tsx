import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Application } from '../../services/backendApi';
import { appDate, applicantLabel, money, percent } from '../../lib/format';
import { navigate } from '../../lib/router';
import { RiskBadge, StatusBadge } from '../../ui';

export type SortState = { sort: string; order: 'asc' | 'desc' };

const COLUMNS: { key: string; label: string; sortKey?: string; num?: boolean }[] = [
  { key: 'id', label: 'App ID', sortKey: 'applicationId' },
  { key: 'applicant', label: 'Applicant', sortKey: 'applicant' },
  { key: 'date', label: 'Date', sortKey: 'applicationDate' },
  { key: 'loanType', label: 'Loan type', sortKey: 'loanType' },
  { key: 'amount', label: 'Loan amount', sortKey: 'loanAmount', num: true },
  { key: 'cibil', label: 'CIBIL', sortKey: 'cibilScore', num: true },
  { key: 'dti', label: 'DTI', sortKey: 'dti', num: true },
  { key: 'prob', label: 'Fraud prob.', sortKey: 'fraudProbability', num: true },
  { key: 'risk', label: 'Risk' },
  { key: 'status', label: 'Status', sortKey: 'status' },
  { key: 'action', label: '' },
];

export function ApplicationTable({ items, sort, onSort, actionLabel = 'Review' }: { items: Application[]; sort?: SortState; onSort?: (sort: SortState) => void; actionLabel?: string }) {
  const open = (id: string) => navigate(`/admin/applications/${encodeURIComponent(id)}`);
  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const active = sort && column.sortKey === sort.sort;
            return (
              <th key={column.key} className={column.num ? 'num' : ''} aria-sort={active ? (sort!.order === 'asc' ? 'ascending' : 'descending') : undefined}>
                {column.sortKey && onSort ? (
                  <button
                    type="button"
                    className={`sort ${active ? 'active' : ''}`}
                    onClick={() => onSort({ sort: column.sortKey!, order: active && sort!.order === 'desc' ? 'asc' : 'desc' })}
                  >
                    {column.label}
                    {active ? sort!.order === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ArrowUpDown size={13} opacity={0.45} />}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.applicationId} className="clickable" onClick={() => open(item.applicationId)}>
            <td className="mono">{item.applicationId}</td>
            <td>
              {applicantLabel(item.applicantName, item.customerId)}
              {item.applicantName && <div className="muted small">{item.customerId}</div>}
            </td>
            <td>{appDate(item)}</td>
            <td>{item.loanType}</td>
            <td className="num">{money(item.loanAmount)}</td>
            <td className="num">{item.cibilScore ?? <span className="muted" title="Not provided / not in the historical dataset">—</span>}</td>
            <td className="num">{item.dti.toFixed(1)}%</td>
            <td className="num">{item.fraudProbability === null ? <span className="muted">—</span> : percent(item.fraudProbability)}</td>
            <td><RiskBadge level={item.riskLevel} /></td>
            <td><StatusBadge status={item.status} /></td>
            <td>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  open(item.applicationId);
                }}
              >
                {item.source === 'portal' && (item.status === 'NEW' || item.status === 'UNDER_REVIEW') ? actionLabel : 'View'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
