/**
 * Hand-rolled path routing: '/<moduleId>[/view]?<params>'. No react-router — the
 * vendored dependency set stays frozen. The shell owns the address bar; modules
 * only ever see their own view and params via props.
 *
 * Real paths, not a fragment, so every host that serves this app has to answer
 * an unknown path with index.html. The dev server does it by default, the
 * bundled production server does it deliberately, and the Vercel config carries
 * a fallback rewrite for it.
 *
 * The app may be served from a sub-path (BASE, from the build's `base` option).
 * One rule follows from that and holds everywhere: inside the app an address is
 * written app-relative ('/livechat?c=1') and only this file knows where the app
 * is mounted. Modules and the auth screens hand over app-relative paths; every
 * one of them is resolved here, including the ones written as a plain link.
 *
 * Two shapes are not ours:
 *   - Supabase Auth bounces back a bare key=value FRAGMENT — an error
 *     ('#error=access_denied&error_code=otp_expired') or, in the implicit flow,
 *     the tokens themselves. That still resolves to the auth callback route,
 *     whatever the path says, so the gate can explain it.
 *   - Addresses minted while this app routed in the fragment ('#/livechat?c=1')
 *     are still in invite mail, in password-reset mail and in bookmarks.
 *     `migrateLegacyHash` rewrites one, once, on boot.
 */
import type { AppRoute } from '../modules/types';

export type { AppRoute } from '../modules/types';

const KV_FRAGMENT = /^[A-Za-z_][\w-]*=/;

/**
 * The path this app is mounted at, always '/…/' — '/' at a domain root.
 * Vite's `base` is the single source: it rewrites the asset URLs in index.html
 * to match, so a build served from anywhere else is broken before routing.
 */
export const BASE: string = normalizeBase(import.meta.env.BASE_URL);

export function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '/').trim();
  if (value === '' || value === '.' || value === './') return '/';
  const withLead = value.startsWith('/') ? value : `/${value}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/** The part of a pathname below the mount point, without its outer slashes. */
export function pathBelow(pathname: string, base: string = BASE): string {
  const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

const routeOf = (path: string, params: URLSearchParams): AppRoute => {
  const segments = path === '' ? [] : path.split('/').filter(Boolean);
  return { moduleId: segments[0] ?? null, path: segments.join('/'), segments, params };
};

export type RoutableLocation = Pick<Location, 'pathname' | 'search' | 'hash'>;

export function parseLocation(loc: RoutableLocation = window.location, base: string = BASE): AppRoute {
  const fragment = loc.hash.replace(/^#/, '');
  if (KV_FRAGMENT.test(fragment)) {
    return routeOf('auth/callback', new URLSearchParams(fragment));
  }
  return routeOf(pathBelow(loc.pathname, base), new URLSearchParams(loc.search));
}

/** '<BASE><path>' for an app-relative path that carries its own query. */
export const appUrl = (path: string): string => `${BASE}${path.replace(/^\/+/, '')}`;

/** '<BASE><path>[?qs]' — path may carry segments ('invite/abc', 'contacts/fields'). */
export function buildUrl(path: string, params?: URLSearchParams, base: string = BASE): string {
  const qs = params?.toString() ?? '';
  return `${base}${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
}

/**
 * Move the address bar and tell the app.
 *
 * pushState fires no event of its own, so this dispatches the popstate every
 * listener already waits for — one code path whether the shell moves, a module
 * links into another module, or the assistant undoes a navigation. Going
 * nowhere is not a navigation: an identical address is dropped, which is also
 * what keeps a module that writes its params on every render from looping.
 */
export function navigate(url: string, options: { replace?: boolean } = {}): void {
  const current = `${window.location.pathname}${window.location.search}`;
  if (url === current && window.location.hash === '') return;
  if (options.replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Write a path and its params. */
export function navigateTo(path: string, params?: URLSearchParams, options: { replace?: boolean } = {}): void {
  navigate(buildUrl(path, params), options);
}

/** Go to an app-relative address ('/sign-in?returnTo=/deals'). */
export function navigatePath(path: string, options: { replace?: boolean } = {}): void {
  navigate(appUrl(path), options);
}

/**
 * A link inside the app is a navigation, not a page load.
 *
 * Modules write plain anchors — "Open in Live Chat", "set this up in
 * Automations" — and a module may not touch the router, so the shell catches
 * the click instead: same-origin, unmodified, not a new tab, not a download.
 * An app-relative href is resolved against the mount point here, which is the
 * only place that knows it. Everything else is left to the browser.
 */
export function interceptLinks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href === null || href === '' || href.startsWith('#')) return;
    if (anchor.hasAttribute('download') || anchor.hasAttribute('target')) return;
    if (anchor.getAttribute('rel')?.split(/\s+/).includes('external')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const path = `${url.pathname}${url.search}`;
    event.preventDefault();
    navigate(path.startsWith(BASE) ? path : appUrl(path), {});
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

/** Back/forward, hand-edited URLs and every `navigate` above. */
export function onRouteChange(cb: () => void): () => void {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}

/**
 * '#/contacts?view=fields' → '/contacts?view=fields', once, before the first
 * render. Called from main.tsx: an invite sent last month, a password-reset
 * mail already in someone's inbox and every bookmark keep working.
 *
 * A fragment that is not a route ('#error=…', '#access_token=…') is Supabase's
 * and is left exactly where it is.
 */
export function migrateLegacyHash(): void {
  const url = legacyHashTarget(window.location.hash);
  if (url === null) return;
  try {
    window.history.replaceState(null, '', url);
  } catch {
    /* This runs at module scope in main.tsx, before createRoot — a throw here
       is not a link that failed to be tidied, it is an app that never mounts.
       And replaceState does throw: browsers rate-limit it, and a sandboxed
       iframe answers any history call with a SecurityError. Swallowed, the
       old link opens the app at its default screen instead of the screen it
       named. That is a worse link, not a white page. */
  }
}

/** The address a legacy fragment stands for, or null if it is not one of ours. */
export function legacyHashTarget(fragment: string, base: string = BASE): string | null {
  if (!fragment.startsWith('#/')) return null;
  const body = fragment.slice(2);
  const cut = body.indexOf('?');
  const path = (cut === -1 ? body : body.slice(0, cut)).replace(/\/+$/, '');
  const search = cut === -1 ? '' : body.slice(cut + 1);
  return buildUrl(path, search === '' ? undefined : new URLSearchParams(search), base);
}
