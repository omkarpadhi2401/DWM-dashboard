import { useCallback, useEffect, useState } from 'react';

// Minimal hash router: routes survive a browser refresh and work without server configuration.
export type Route = { path: string; segments: string[]; query: URLSearchParams };

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return { path, segments: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(queryPart) };
}

// A single guard (e.g. an unsaved loan application) may block navigation.
// It returns true to allow navigation, or false after it has asked the user;
// the guard can later call proceed() to continue to the blocked destination.
type Guard = (proceed: () => void) => boolean;
let guard: Guard | null = null;
export function setNavigationGuard(next: Guard | null) {
  guard = next;
}

let lastAllowedHash = window.location.hash;

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const target = `#${to}`;
  if (target === window.location.hash) return;
  if (guard && !guard(() => { guard = null; navigate(to, options); })) return;
  lastAllowedHash = target;
  if (options.replace) window.location.replace(target);
  else window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => {
      // Back/forward buttons bypass navigate(); apply the guard here as well.
      const attempted = window.location.hash;
      if (guard && attempted !== lastAllowedHash && !guard(() => { guard = null; navigate(attempted.replace(/^#/, '')); })) {
        history.replaceState(null, '', lastAllowedHash || '#/');
        return;
      }
      lastAllowedHash = window.location.hash;
      setRoute(parse());
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

// Store page state (filters, sorting, page) in the URL so refresh / back keep it.
export function useQueryState(route: Route, defaults: Record<string, string>) {
  const values: Record<string, string> = {};
  for (const [key, fallback] of Object.entries(defaults)) values[key] = route.query.get(key) ?? fallback;
  const update = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(route.query);
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value === defaults[key]) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      navigate(`${route.path}${query ? `?${query}` : ''}`, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.path, route.query.toString()],
  );
  return [values, update] as const;
}
