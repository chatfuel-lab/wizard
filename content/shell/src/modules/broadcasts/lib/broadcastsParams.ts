/**
 * The module's address.
 *
 * The view is a path segment and everything else is a query parameter:
 * `/broadcasts` is the campaign list, `/broadcasts/templates` the catalog,
 * and `/broadcasts/compose?c=<flow>` the composer over one draft. `?c=` on
 * the list opens that campaign's panel beside it.
 *
 * Unknown values fall back silently — a hand-edited address must never white-
 * screen — and defaults are omitted from what is written, so a link that says
 * nothing is the shortest link there is.
 */
import { CAMPAIGN_STATUSES, type CampaignStatus } from './campaign';

export type BroadcastsView = 'campaigns' | 'compose' | 'templates';

export const DEFAULT_VIEW: BroadcastsView = 'campaigns';

const VIEWS: readonly BroadcastsView[] = ['campaigns', 'compose', 'templates'];

/** The composer's steps, in the order a campaign is built. */
export type ComposerStep = 'name' | 'message' | 'audience' | 'schedule' | 'review';

export const COMPOSER_STEPS: readonly ComposerStep[] = ['name', 'message', 'audience', 'schedule', 'review'];

export interface BroadcastsAddress {
  view: BroadcastsView;
  /** The campaign the panel or the composer is on — a flow id — or null. */
  campaign: string | null;
  /** Composer only. Null means "the first step that is not done". */
  step: ComposerStep | null;
  /** List only. Null means every status. */
  status: CampaignStatus | null;
  /** List and catalog: the search box. */
  q: string;
  /** Catalog only: the template whose preview is open. */
  template: string | null;
}

const oneOf = <T extends string>(allowed: readonly T[], value: string | null | undefined): T | null =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** `view` is the path segment the shell handed down; '' is the module root. */
export function parseAddress(view: string, params: URLSearchParams): BroadcastsAddress {
  const segment = view.split('/')[0]?.trim() ?? '';
  return {
    view: oneOf(VIEWS, segment) ?? DEFAULT_VIEW,
    campaign: params.get('c')?.trim() || null,
    step: oneOf(COMPOSER_STEPS, params.get('step')?.trim()),
    status: oneOf(CAMPAIGN_STATUSES, params.get('status')?.trim()),
    q: params.get('q')?.trim() ?? '',
    template: params.get('t')?.trim() || null,
  };
}

/** The path segment for a view — '' for the default, so `/broadcasts` IS the list. */
export const viewSegment = (view: BroadcastsView): string => (view === DEFAULT_VIEW ? '' : view);

/** Rewrite only this module's keys; a host may be carrying parameters of its own. */
export function writeAddress(current: URLSearchParams, next: BroadcastsAddress): URLSearchParams {
  const out = new URLSearchParams(current);
  const set = (key: string, value: string | null): void => {
    if (!value) out.delete(key);
    else out.set(key, value);
  };
  set('c', next.campaign);
  set('step', next.view === 'compose' ? next.step : null);
  set('status', next.view === 'campaigns' ? next.status : null);
  set('q', next.q || null);
  set('t', next.view === 'templates' ? next.template : null);
  return out;
}
