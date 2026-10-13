import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, X, XCircle } from 'lucide-react';
import type { RiskLevel, Status } from './services/backendApi';
import { RISK_LABEL, STATUS_LABEL } from './lib/format';

// ---------------------------------------------------------------- layout
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '' }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, note, tone, onClick }: { label: string; value: string; note?: string; tone?: 'purple' | 'danger' | 'success' | 'warning'; onClick?: () => void }) {
  const content = (
    <>
      <span className="kpi-label">{label}</span>
      <strong className={`kpi-value ${tone ?? ''}`}>{value}</strong>
      {note && <small className="kpi-note">{note}</small>}
    </>
  );
  return onClick ? (
    <button type="button" className="kpi kpi-link" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="kpi">{content}</div>
  );
}

// ---------------------------------------------------------------- badges
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge status-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="badge neutral">Unavailable</span>;
  return <span className={`badge risk-${level.toLowerCase()}`}>{RISK_LABEL[level]}</span>;
}

// ---------------------------------------------------------------- states
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <Loader2 className="spin" size={22} />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <Inbox size={26} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="state error" role="alert">
      <AlertTriangle size={26} />
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success' | 'warning'; children: ReactNode }) {
  return <div className={`inline-alert ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

// ---------------------------------------------------------------- dialog
export function Dialog({ title, children, onClose, footer, busy }: { title: string; children: ReactNode; onClose: () => void; footer: ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('select, textarea, input, button:not(.dialog-close)');
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [busy, onClose]);
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <div className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-btn dialog-close" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-footer">{footer}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, tone = 'primary', onConfirm, onCancel }: { title: string; message: ReactNode; confirmLabel: string; tone?: 'primary' | 'danger'; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}

// ---------------------------------------------------------------- pagination
export function Pagination({ page, pageSize, total, onPage, onPageSize, label = 'records' }: { page: number; pageSize: number; total: number; onPage: (page: number) => void; onPageSize: (size: number) => void; label?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="pagination">
      <span className="muted">Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()} {label}</span>
      <div className="pagination-controls">
        <label className="inline-label">
          Rows per page
          <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={15} /> Previous
        </button>
        <span className="muted small">Page {page} of {pages.toLocaleString()}</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- toasts
type Toast = { id: number; tone: 'success' | 'error'; message: string };
const ToastContext = createContext<(tone: Toast['tone'], message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone}`}>
            {toast.tone === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>{toast.message}</span>
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------- form field
export function Field({ label, required, error, hint, children, htmlFor }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------- data hook
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let active = true;
    setState((current) => ({ data: current.data, error: '', loading: true }));
    loader()
      .then((data) => active && setState({ data, error: '', loading: false }))
      .catch((error) => active && setState({ data: null, error: error instanceof Error ? error.message : 'Request failed', loading: false }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { ...state, reload, setData: (data: T) => setState({ data, error: '', loading: false }) };
}
