import { FormEvent, useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate, Route } from '../lib/router';
import { Field, InlineAlert } from '../ui';
import { getHealth } from '../services/backendApi';

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><FileSearch size={18} /></span>
      <div>
        <strong>FraudGuard</strong>
        <small>Loan applications &amp; fraud risk</small>
      </div>
    </div>
  );
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const HOME = { officer: '/admin', customer: '/customer', admin: '/technical' } as const;

export function LoginPage({ route, mode = 'standard' }: { route: Route; mode?: 'standard' | 'admin' }) {
  const admin = mode === 'admin';
  const { login, expired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [officerMissing, setOfficerMissing] = useState(false);
  const [adminMissing, setAdminMissing] = useState(false);

  useEffect(() => {
    getHealth().then((health) => { setOfficerMissing(!health.officerConfigured); setAdminMissing(health.adminConfigured === false); }).catch(() => undefined);
  }, []);
  // Switching between the two sign-in pages starts with a clean form.
  useEffect(() => { setError(''); setErrors({}); setPassword(''); }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError('');
    try {
      const user = await login(email.trim(), password, mode);
      const target = route.query.get('next');
      const home = HOME[user.role];
      const allowed = target && (target === home || target.startsWith(`${home}/`));
      navigate(allowed ? target : home, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <div>
          <h1 style={{ fontSize: 22 }}>{admin ? 'Admin sign in' : 'Sign in'}</h1>
          <p className="muted">{admin ? 'Technical administrator access to the Admin / Technical panel.' : 'Customers and bank officers sign in here.'}</p>
        </div>
        {expired && <InlineAlert tone="warning">Your session has expired. Please sign in again.</InlineAlert>}
        {error && <InlineAlert>{error}</InlineAlert>}
        <form onSubmit={submit} noValidate>
          <Field label="Email" required error={errors.email} htmlFor="login-email">
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password" required error={errors.password} htmlFor="login-password">
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {admin ? (
          <p className="auth-switch">
            Customer or bank officer? <button type="button" className="link-btn" onClick={() => navigate('/login')}>Go to the main sign-in</button>
          </p>
        ) : (
          <>
            <p className="auth-switch">
              New customer? <button type="button" className="link-btn" onClick={() => navigate('/signup')}>Create an account</button>
            </p>
            <p className="auth-switch small">
              <button type="button" className="link-btn" onClick={() => navigate('/admin-login')}>Admin / Technical sign-in</button>
            </p>
          </>
        )}
        {admin && adminMissing && (
          <InlineAlert tone="info">
            No admin account is configured yet. Set FRAUDGUARD_ADMIN_EMAIL and FRAUDGUARD_ADMIN_PASSWORD in <code>.env</code> or run <code>python -m backend.manage create-admin</code>.
          </InlineAlert>
        )}
        {!admin && officerMissing && (
          <InlineAlert tone="info">
            No bank-officer account is configured yet. Set FRAUDGUARD_OFFICER_EMAIL and FRAUDGUARD_OFFICER_PASSWORD in <code>.env</code> or run <code>python -m backend.manage create-officer</code>.
          </InlineAlert>
        )}
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().split(/\s+/).join(' ').length < 2) next.name = 'Enter your full name.';
    if (!EMAIL.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'Include at least one letter and one number.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError('');
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
      navigate('/customer', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <div>
          <h1 style={{ fontSize: 22 }}>Create your account</h1>
          <p className="muted">Apply for a loan and track its status online.</p>
        </div>
        {error && <InlineAlert>{error}</InlineAlert>}
        <form onSubmit={submit} noValidate>
          <Field label="Full name" required error={errors.name} htmlFor="su-name">
            <input id="su-name" autoComplete="name" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Email" required error={errors.email} htmlFor="su-email">
            <input id="su-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Password" required error={errors.password} hint="At least 8 characters, with a letter and a number." htmlFor="su-password">
            <input id="su-password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Confirm password" required error={errors.confirm} htmlFor="su-confirm">
            <input id="su-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">
          Already registered? <button type="button" className="link-btn" onClick={() => navigate('/login')}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
