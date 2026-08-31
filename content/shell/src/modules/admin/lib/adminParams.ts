/**
 * The module's address.
 *
 * `/admin` is the bots, `/admin/access` and `/admin/health` are the other two.
 * `?w=` names the workspace the rail has selected and `?b=` the bot whose panel
 * is open. Unknown values fall back silently — a hand-edited address must never
 * white-screen — and defaults are omitted from what is written.
 */
export type AdminView = 'bots' | 'access' | 'health';

export const DEFAULT_VIEW: AdminView = 'bots';

const VIEWS: readonly AdminView[] = ['bots', 'access', 'health'];

export interface AdminAddress {
  view: AdminView;
  /** The workspace on screen. Null means "the first one worth opening". */
  workspace: string | null;
  /** The bot whose panel is open, or null for closed. */
  bot: string | null;
}

/** `view` is the path segment the shell handed down; '' is the module root. */
export function parseAddress(view: string, params: URLSearchParams): AdminAddress {
  const segment = view.split('/')[0]?.trim() ?? '';
  return {
    view: (VIEWS as readonly string[]).includes(segment) ? (segment as AdminView) : DEFAULT_VIEW,
    workspace: params.get('w')?.trim() || null,
    bot: params.get('b')?.trim() || null,
  };
}

/** The path segment for a view — '' for the default, so `/admin` IS the bots. */
export const viewSegment = (view: AdminView): string => (view === DEFAULT_VIEW ? '' : view);

/** Rewrite only this module's keys; a host may be carrying parameters of its own. */
export function writeAddress(current: URLSearchParams, next: AdminAddress): URLSearchParams {
  const out = new URLSearchParams(current);
  const set = (key: string, value: string | null): void => {
    if (value) out.set(key, value);
    else out.delete(key);
  };
  set('w', next.workspace);
  set('b', next.bot);
  return out;
}
