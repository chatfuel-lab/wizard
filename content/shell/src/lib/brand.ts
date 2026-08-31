/**
 * The deployment's own name and mark.
 *
 * Both come from the environment rather than from code, because they are the
 * one thing about a scaffolded app that differs per deployment and has to be
 * changeable without a code edit: the same build, deployed twice, is two
 * products. `VITE_*` is baked in at build time, which is also why the tab icon
 * in index.html cannot read them and is rewritten on disk instead.
 */

/** Fallback name, and the only place it is written. */
export const DEFAULT_APP_NAME = 'Chatfuel App';

/** The file shipped in `public/` when nobody supplied one. */
export const DEFAULT_LOGO_FILE = 'logo.svg';

/**
 * Resolve the configured logo against the app's base path.
 *
 * A bare file name is a file in `public/`, so it has to pick up the base the
 * app is mounted under — the same reason index.html uses `%BASE_URL%`. Anything
 * already absolute (a path, or a URL for someone hosting their mark elsewhere)
 * is passed through untouched.
 */
export function logoUrl(value: string | undefined, base: string): string {
  const name = value?.trim() || DEFAULT_LOGO_FILE;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(name) || name.startsWith('/')) return name;
  return `${base.endsWith('/') ? base : `${base}/`}${name}`;
}

export const APP_NAME: string = import.meta.env.VITE_APP_NAME?.trim() || DEFAULT_APP_NAME;
export const APP_LOGO: string = logoUrl(import.meta.env.VITE_APP_LOGO, import.meta.env.BASE_URL);

/**
 * Where a person goes to do the things this app deliberately does not do —
 * create a workspace, create a bot, look at the bill.
 *
 * It follows `CHATFUEL_API_BASE` and is not the same variable: that one is
 * unprefixed and therefore server-only (the browser talks to the proxy, never
 * to Chatfuel), so a deployment pointed at another Chatfuel had no way to say
 * so in the two empty states that name an address. They said panel.chatfuel.com
 * whatever the proxy was talking to, which is a dead end on such a deployment.
 */
export const DEFAULT_DASHBOARD_URL = 'https://panel.chatfuel.com';
export const DASHBOARD_URL: string =
  import.meta.env.VITE_CHATFUEL_DASHBOARD_URL?.trim().replace(/\/+$/, '') || DEFAULT_DASHBOARD_URL;
