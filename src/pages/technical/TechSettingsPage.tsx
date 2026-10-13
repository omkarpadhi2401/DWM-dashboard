import { getHealth, getReference } from '../../services/backendApi';
import { useAuth } from '../../lib/auth';
import { Card, PageHeader, useAsync } from '../../ui';
import { Loaded } from './shared';

export function TechSettingsPage() {
  const { user } = useAuth();
  const info = useAsync(() => Promise.all([getHealth(), getReference()]), []);
  return (
    <>
      <PageHeader title="Settings" description="Your admin account and the fixed rules the system applies." />
      <div className="grid-2">
        <Card title="Your account">
          <dl className="dl">
            <div><dt>Name</dt><dd>{user?.name}</dd></div>
            <div><dt>Email</dt><dd>{user?.email}</dd></div>
            <div><dt>Role</dt><dd>Admin / Technical</dd></div>
            <div><dt>Session</dt><dd>Expires 12 hours after sign-in</dd></div>
          </dl>
        </Card>
        <Card title="What each role can access">
          <dl className="dl">
            <div className="span-2"><dt>Customer</dt><dd>Own loan applications and their status only.</dd></div>
            <div className="span-2"><dt>Bank Officer</dt><dd>Application queue, review and decisions, fraud analytics, fraud checker.</dd></div>
            <div className="span-2"><dt>Admin / Technical</dt><dd>Read-only technical views: dataset, data quality, models, OLAP and system information. Cannot approve or reject applications.</dd></div>
          </dl>
        </Card>
      </div>
      <Loaded state={info} label="Loading configuration…" title="Unable to load configuration">
        {([health, reference]) => (
          <div className="grid-2">
            <Card title="Risk levels" subtitle="Derived from the model's fraud probability">
              <dl className="dl">
                {Object.entries(reference.riskBands).map(([level, [low, high]]) => (
                  <div key={level}><dt>{level.charAt(0) + level.slice(1).toLowerCase()}</dt><dd>{Math.round(low * 100)}% – {high >= 1 ? '100%' : `below ${Math.round(high * 100)}%`}</dd></div>
                ))}
              </dl>
            </Card>
            <Card title="Account setup">
              <dl className="dl">
                <div><dt>Bank officer account</dt><dd>{health.officerConfigured ? 'Configured' : 'Not configured'}</dd></div>
                <div><dt>Admin account</dt><dd>{health.adminConfigured ? 'Configured' : 'Not configured'}</dd></div>
              </dl>
              <p className="muted small" style={{ marginTop: 10 }}>Accounts for officers and admins are created from the server's <code>.env</code> file or with <code>python -m backend.manage</code>. Passwords are stored only as salted hashes.</p>
            </Card>
          </div>
        )}
      </Loaded>
    </>
  );
}
