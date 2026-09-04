import { LINK_PLATFORMS, type LinkPlatform } from './channels';

/**
 * Where Chatfuel sends the person back to when the hand-off is over.
 *
 * A platform link carries two optional redirects, and the app fills them in
 * itself: nobody types a URL here, and nobody is asked to pass a link along.
 * The person presses Connect, the app mints a link, the browser leaves for
 * Chatfuel's page, and this is the address that brings them back to the
 * channels page they started on.
 *
 * ⚠ The API refuses anything but `https://` with a host, so a deployment
 * served over plain http — every `npm run dev` — gets no redirects at all
 * rather than a refused create. The hand-off still works there; the person
 * comes back with the browser's own Back.
 */
const RESULT_PARAM = 'result';
const PLATFORM_PARAM = 'channel';

export interface ReturnUrls {
  onSuccessRedirectURL: string | null;
  onFailureRedirectURL: string | null;
}

/**
 * The mount point as a path that always ends in a slash — the shell's own
 * `normalizeBase` rule, kept in step by hand. Module code may not import from
 * the shell's `lib/` (pass 10 draws that boundary), and a base read one way
 * here and another way there is a redirect that lands on the wrong page.
 */
function normalizedBase(raw: string | undefined): string {
  const value = (raw ?? '/').trim();
  if (value === '' || value === '.' || value === './') return '/';
  const withLead = value.startsWith('/') ? value : `/${value}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/** The app's own `/channels`, absolute, or null when it cannot be one Chatfuel accepts. */
export function channelsUrl(
  platform: LinkPlatform,
  result: 'connected' | 'failed',
  location: { origin: string } | undefined = typeof window === 'undefined' ? undefined : window.location,
  base: string = import.meta.env.BASE_URL,
): string | null {
  if (!location) return null;
  let url: URL;
  try {
    url = new URL(`${normalizedBase(base)}channels`, location.origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname === '') return null;
  url.searchParams.set(RESULT_PARAM, result);
  url.searchParams.set(PLATFORM_PARAM, platform);
  return url.toString();
}

export function returnUrls(platform: LinkPlatform, location?: { origin: string }, base?: string): ReturnUrls {
  return {
    onSuccessRedirectURL: channelsUrl(platform, 'connected', location, base),
    onFailureRedirectURL: channelsUrl(platform, 'failed', location, base),
  };
}

export interface HandOffResult {
  platform: LinkPlatform;
  ok: boolean;
}

/**
 * What a return leg says, read back off the module's own params.
 *
 * Arrival is not proof — anyone can type the address — so this decides what to
 * say, never what is true: the page re-reads the channels either way.
 */
export function readHandOff(params: URLSearchParams): HandOffResult | null {
  const result = params.get(RESULT_PARAM);
  const platform = params.get(PLATFORM_PARAM);
  if (result !== 'connected' && result !== 'failed') return null;
  if (!LINK_PLATFORMS.includes(platform as LinkPlatform)) return null;
  return { platform: platform as LinkPlatform, ok: result === 'connected' };
}

/** The same params with the hand-off keys taken out, for the address bar. */
export function clearHandOff(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(RESULT_PARAM);
  next.delete(PLATFORM_PARAM);
  return next;
}
