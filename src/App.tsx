import { ReactNode, useEffect, useState } from 'react';
import { Activity, BarChart3, Boxes, ClipboardList, Cpu, Database, FileSearch, FilePlus2, Files, FlaskConical, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Server, Settings, ShieldCheck, Table2 } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth';
import { navigate, useRoute, Route } from './lib/router';
import { StatsProvider, useStats } from './lib/stats';
import { ConfirmDialog, LoadingState, ToastProvider } from './ui';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ApplicationsPage } from './pages/admin/ApplicationsPage';
import { ApplicationReview } from './pages/admin/ApplicationReview';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { FraudCheckerPage } from './pages/admin/FraudCheckerPage';
import { DataExplorerPage } from './pages/admin/DataExplorerPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { ModelLabPage } from './pages/admin/ModelLabPage';
import { TechDashboard } from './pages/technical/TechDashboard';
import { DatasetOverviewPage } from './pages/technical/DatasetOverviewPage';
import { DataQualityPage } from './pages/technical/DataQualityPage';
import { ModelComparisonPage } from './pages/technical/ModelComparisonPage';
import { ModelPerformancePage } from './pages/technical/ModelPerformancePage';
import { FeatureAnalysisPage } from './pages/technical/FeatureAnalysisPage';
import { OlapPage } from './pages/technical/OlapPage';
import { SystemPage } from './pages/technical/SystemPage';
import { TechSettingsPage } from './pages/technical/TechSettingsPage';
import { ApplyPage } from './pages/customer/ApplyPage';
import { CustomerApplicationDetail, CustomerDashboard, MyApplicationsPage } from './pages/customer/CustomerPages';

// ---------------------------------------------------------------- navigation
type NavItem = { path: string; label: string; icon: typeof LayoutDashboard; match: (path: string) => boolean; badge?: 'new' };
const officerNav: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { path: '/admin/new', label: 'New Applications', icon: Inbox, match: (p) => p === '/admin/new', badge: 'new' },
  { path: '/admin/applications', label: 'All Applications', icon: Files, match: (p) => p.startsWith('/admin/applications') },
  { path: '/admin/analytics', label: 'Fraud Analytics', icon: BarChart3, match: (p) => p === '/admin/analytics' },
  { path: '/admin/checker', label: 'Fraud Checker', icon: ShieldCheck, match: (p) => p === '/admin/checker' },
  { path: '/admin/explorer', label: 'Data Explorer', icon: Table2, match: (p) => p === '/admin/explorer' },
  { path: '/admin/settings', label: 'Settings', icon: Settings, match: (p) => p === '/admin/settings' || p === '/admin/model-lab' },
];
// Admin / Technical panel: a separate area (role "admin"), distinct from the Bank Officer workspace above.
const technicalNav: NavItem[] = [
  { path: '/technical', label: 'Admin Dashboard', icon: LayoutDashboard, match: (p) => p === '/technical' },
  { path: '/technical/dataset', label: 'Dataset Overview', icon: Database, match: (p) => p === '/technical/dataset' },
  { path: '/technical/explorer', label: 'Data Explorer', icon: Table2, match: (p) => p === '/technical/explorer' },
  { path: '/technical/analytics', label: 'Fraud Analytics', icon: BarChart3, match: (p) => p === '/technical/analytics' },
  { path: '/technical/models', label: 'ML Model Comparison', icon: FlaskConical, match: (p) => p === '/technical/models' },
  { path: '/technical/performance', label: 'Model Performance', icon: Activity, match: (p) => p === '/technical/performance' },
  { path: '/technical/features', label: 'Feature Analysis', icon: Cpu, match: (p) => p === '/technical/features' },
  { path: '/technical/quality', label: 'Data Quality', icon: ListChecks, match: (p) => p === '/technical/quality' },
  { path: '/technical/olap', label: 'DWM / OLAP Analysis', icon: Boxes, match: (p) => p === '/technical/olap' },
  { path: '/technical/system', label: 'System / Technical Info', icon: Server, match: (p) => p === '/technical/system' },
  { path: '/technical/settings', label: 'Settings', icon: Settings, match: (p) => p === '/technical/settings' },
];
const HOME: Record<string, string> = { officer: '/admin', customer: '/customer', admin: '/technical' };
const customerNav: NavItem[] = [
  { path: '/customer', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/customer' },
  { path: '/customer/apply', label: 'Apply for Loan', icon: FilePlus2, match: (p) => p === '/customer/apply' },
  { path: '/customer/applications', label: 'My Applications', icon: ClipboardList, match: (p) => p.startsWith('/customer/applications') },
];

function NewCount() {
  const { stats } = useStats();
  if (!stats) return null;
  return <span className={`nav-count ${stats.new === 0 ? 'zero' : ''}`} aria-label={`${stats.new} new applications`}>{stats.new}</span>;
}

function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const items = user?.role === 'officer' ? officerNav : user?.role === 'admin' ? technicalNav : customerNav;
  const initials = (user?.name ?? '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  useEffect(() => setOpen(false), [route.path]);
  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><FileSearch size={18} /></span>
          <div>
            <strong>FraudGuard</strong>
            <small>{user?.role === 'officer' ? 'Bank officer workspace' : user?.role === 'admin' ? 'Admin / Technical panel' : 'Customer loan portal'}</small>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {items.map(({ path, label, icon: Icon, match, badge }) => (
            <button type="button" key={path} className={`nav-item ${match(route.path) ? 'active' : ''}`} aria-current={match(route.path) ? 'page' : undefined} onClick={() => navigate(path)}>
              <Icon size={17} />
              <span>{label}</span>
              {badge === 'new' && <NewCount />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role === 'officer' ? 'Bank officer' : user?.role === 'admin' ? 'Admin / Technical' : `Customer · ${user?.customerId}`}</small>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmLogout(true)}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <strong>FraudGuard</strong>
        </header>
        <main className="content">{children}</main>
      </div>
      {confirmLogout && (
        <ConfirmDialog
          title="Sign out?"
          message={<p>You will need to sign in again to continue.</p>}
          confirmLabel="Sign out"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={async () => {
            setConfirmLogout(false);
            await logout();
            navigate('/login', { replace: true });
          }}
        />
      )}
    </div>
  );
}

function NotFound({ home }: { home: string }) {
  return (
    <div className="card">
      <div className="state">
        <h3>Page not found</h3>
        <p>The page you requested does not exist or you do not have access to it.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate(home)}>Go to dashboard</button>
      </div>
    </div>
  );
}

function officerPage(route: Route) {
  const [, section, id] = route.segments;
  if (!section) return <AdminDashboard />;
  if (section === 'new') return <ApplicationsPage mode="new" route={route} />;
  if (section === 'applications' && id) return <ApplicationReview id={id} />;
  if (section === 'applications') return <ApplicationsPage mode="all" route={route} />;
  if (section === 'analytics') return <AnalyticsPage />;
  if (section === 'checker') return <FraudCheckerPage />;
  if (section === 'explorer') return <DataExplorerPage route={route} />;
  if (section === 'settings') return <SettingsPage />;
  if (section === 'model-lab') return <ModelLabPage />;
  return <NotFound home="/admin" />;
}

function technicalPage(route: Route) {
  const [, section] = route.segments;
  if (!section) return <TechDashboard />;
  if (section === 'dataset') return <DatasetOverviewPage />;
  if (section === 'explorer') return <DataExplorerPage route={route} canOpenApplication={false} />;
  if (section === 'analytics') return <AnalyticsPage />;
  if (section === 'models') return <ModelComparisonPage />;
  if (section === 'performance') return <ModelPerformancePage route={route} />;
  if (section === 'features') return <FeatureAnalysisPage />;
  if (section === 'quality') return <DataQualityPage />;
  if (section === 'olap') return <OlapPage />;
  if (section === 'system') return <SystemPage />;
  if (section === 'settings') return <TechSettingsPage />;
  return <NotFound home="/technical" />;
}

function customerPage(route: Route) {
  const [, section, id] = route.segments;
  if (!section) return <CustomerDashboard />;
  if (section === 'apply') return <ApplyPage />;
  if (section === 'applications' && id) return <CustomerApplicationDetail id={id} />;
  if (section === 'applications') return <MyApplicationsPage />;
  return <NotFound home="/customer" />;
}

function Router() {
  const route = useRoute();
  const { user, checking } = useAuth();
  const area = route.segments[0];
  const home = HOME[user?.role ?? 'customer'] ?? '/customer';

  // Route protection: signed-out users go to login; each role only sees its own area.
  useEffect(() => {
    if (checking) return;
    const publicArea = area === 'login' || area === 'signup' || area === 'admin-login';
    const ownArea = { officer: 'admin', customer: 'customer', admin: 'technical' }[user?.role ?? 'customer'];
    if (!user && !publicArea) {
      const next = route.path !== '/' ? `?next=${encodeURIComponent(route.path)}` : '';
      navigate(`${area === 'technical' ? '/admin-login' : '/login'}${next}`, { replace: true });
    } else if (user && (publicArea || !area)) {
      navigate(home, { replace: true });
    } else if (user && ['admin', 'customer', 'technical'].includes(area) && area !== ownArea) {
      // A signed-in user who opens another role's area is sent back to their own.
      navigate(home, { replace: true });
    }
  }, [user, checking, area, route.path, home]);

  if (checking) return <LoadingState label="Checking your session…" />;
  if (!user) {
    if (area === 'signup') return <SignupPage />;
    if (area === 'login') return <LoginPage route={route} />;
    if (area === 'admin-login') return <LoginPage route={route} mode="admin" />;
    return <LoadingState label="Redirecting to sign in…" />;
  }
  if (user.role === 'officer' && area === 'admin') {
    return (
      <StatsProvider route={route}>
        <Shell route={route}>{officerPage(route)}</Shell>
      </StatsProvider>
    );
  }
  if (user.role === 'admin' && area === 'technical') {
    return <Shell route={route}>{technicalPage(route)}</Shell>;
  }
  if (user.role === 'customer' && area === 'customer') {
    return <Shell route={route}>{customerPage(route)}</Shell>;
  }
  return <LoadingState label="Redirecting…" />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ToastProvider>
  );
}
