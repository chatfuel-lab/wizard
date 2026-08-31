/**
 * The routes this module owns. The shell never treats these first path
 * segments as module ids (see HostIntegration.routes).
 *
 * Everything here is written app-relative — '/sign-in', '/invite/<token>' —
 * because only the shell knows where the app is mounted. The two links that
 * have to be absolute, because they are mailed, get the mount point handed to
 * them by the runtime (`setBasePath`).
 */
export const AUTH_ROUTES = [
  'sign-in',
  'sign-up',
  'invite',
  'forgot-password',
  'reset-password',
  'auth',
  'no-access',
  'team',
] as const;

export type AuthRouteName = (typeof AUTH_ROUTES)[number];

/** Routes rendered INSIDE the shell chrome (the rest replace it). */
export const IN_SHELL_ROUTES: readonly AuthRouteName[] = ['team'];

export const isAuthRoute = (segment: string | null): segment is AuthRouteName =>
  segment !== null && (AUTH_ROUTES as readonly string[]).includes(segment);

/**
 * `returnTo` is an app-relative path+query: '/livechat?c=1'.
 * Only same-app paths are accepted — never '//host' or a scheme.
 */
export function encodeReturnTo(path: string, params?: URLSearchParams): string {
  const qs = params?.toString() ?? '';
  return `/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
}

export function decodeReturnTo(value: string | null): string | null {
  if (!value) return null;
  // A backslash is a slash to the URL parser, so '/\host' resolves cross-origin exactly like '//host'.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /^\/[a-z]+:/i.test(value))
    return null;
  const seg = value.slice(1).split(/[/?]/)[0] ?? '';
  if (isAuthRoute(seg)) return null; // never bounce back into an auth screen
  return value;
}

/**
 * Where this app is mounted, for the links that leave it in an email. Set once
 * by the runtime, before anything renders; '/' at a domain root.
 */
let basePath = '/';

export function setBasePath(next: string): void {
  const withLead = next.startsWith('/') ? next : `/${next}`;
  basePath = withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/** Where the app is now, app-relative — what `returnTo` is built from. */
export function currentPath(location: { pathname: string; search: string } = window.location): string {
  const path = location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length - 1)
    : location.pathname;
  return `${path.startsWith('/') ? path : `/${path}`}${location.search}`;
}

/**
 * Is the browser sitting on an invite link that has not been spent yet?
 *
 * The URL is the only thing that knows, and it knows it before any component
 * does: `signUp` from the invite screen makes SIGNED_IN fire while the path is
 * still `/invite/<token>`, a whole round trip before `acceptInvite` runs. That
 * window is what `fetchMembership` has to see — an account about to join
 * somebody else's workspace must not be handed one of its own.
 *
 * The token, not the route: `dropTokenFromUrl` replaces the path with a bare
 * `/invite` once the link is spent or dead, and from there there is nothing
 * left to join.
 */
export const invitePending = (path: string = currentPath()): boolean => path.startsWith('/invite/');

/** This app's origin, or '' where there is no window (a test, an SSR render). */
const thisOrigin = (): string => (typeof window === 'undefined' ? '' : window.location.origin);

/** An app-relative path as an absolute URL — the app's mount point included. */
export function absoluteUrl(path: string, origin: string = thisOrigin()): string {
  return `${origin}${basePath}${path.replace(/^\/+/, '')}`;
}

export const invitePath = (token: string): string => `/invite/${encodeURIComponent(token)}`;

/** Absolute invite URL for the copy button. */
export function inviteUrl(token: string, origin: string = thisOrigin()): string {
  return absoluteUrl(invitePath(token), origin);
}

/** Absolute URL for a recovery link built from a token_hash (admin route / email template). */
export function recoveryUrl(tokenHash: string, origin: string = thisOrigin()): string {
  return absoluteUrl(`/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`, origin);
}
