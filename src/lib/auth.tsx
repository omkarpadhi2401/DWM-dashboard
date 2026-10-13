import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User, getMe, loadSession, login as apiLogin, logout as apiLogout, saveSession, signup as apiSignup } from '../services/backendApi';

type AuthState = {
  user: User | null;
  checking: boolean;
  login: (email: string, password: string, portal?: 'standard' | 'admin') => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  expired: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [checking, setChecking] = useState(Boolean(loadSession()));
  const [expired, setExpired] = useState(false);

  const apply = useCallback((next: Session | null) => {
    saveSession(next);
    setSession(next);
  }, []);

  // Validate a stored session once on load (it may have expired on the server).
  useEffect(() => {
    if (!session) return;
    getMe()
      .then(({ user }) => apply({ token: session.token, user }))
      .catch((error) => {
        if (error?.status === 401) apply(null);
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      apply(null);
      setExpired(true);
    };
    window.addEventListener('fraudguard:unauthorized', onUnauthorized);
    return () => window.removeEventListener('fraudguard:unauthorized', onUnauthorized);
  }, [apply]);

  const login = async (email: string, password: string, portal: 'standard' | 'admin' = 'standard') => {
    const next = await apiLogin(email, password, portal);
    apply(next);
    setExpired(false);
    return next.user;
  };
  const signup = async (name: string, email: string, password: string) => {
    const next = await apiSignup(name, email, password);
    apply(next);
    setExpired(false);
    return next.user;
  };
  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      /* the local session is cleared regardless */
    }
    apply(null);
  };

  return <AuthContext.Provider value={{ user: session?.user ?? null, checking, login, signup, logout, expired }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
