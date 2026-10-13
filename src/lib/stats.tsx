import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApplicationStats, getApplicationStats } from '../services/backendApi';
import type { Route } from './router';

// ---------------------------------------------------------------- live application counts (sidebar badge, dashboard)
type StatsState = { stats: ApplicationStats | null; error: string; refresh: () => void };
const StatsContext = createContext<StatsState>({ stats: null, error: '', refresh: () => undefined });
export const useStats = () => useContext(StatsContext);

export function StatsProvider({ children, route }: { children: ReactNode; route: Route }) {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    getApplicationStats()
      .then((next) => {
        setStats(next);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load counts'));
  }, []);
  useEffect(refresh, [refresh, route.path]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);
  return <StatsContext.Provider value={{ stats, error, refresh }}>{children}</StatsContext.Provider>;
}

