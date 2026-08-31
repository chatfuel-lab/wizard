/**
 * Meta ads, the pure half: what a person pastes into the Ads filter, which
 * platforms a scope's ads picker asks for, and how an ad status reads.
 *
 * The setter takes `metaAdId` strings (any string ≤ 60 chars in practice;
 * a whole Ads Manager URL is `FuelyAdIDTooLong`). People copy that URL from
 * the browser bar, so the drawer's paste box accepts it and takes the ids out
 * of `selected_ad_ids=` client-side. Real URL shapes:
 *
 *   https://adsmanager.facebook.com/adsmanager/manage/ads?act=1234567890&business_id=…&selected_ad_ids=120210000000000010%2C120210000000000020
 *   https://business.facebook.com/adsmanager/manage/ads/edit?act=…&selected_ad_ids=120210000000000010&nav_entry_point=…
 *   …/adsmanager/manage/campaigns?act=…#selected_ad_ids=120210000000000010,120210000000000020
 *
 * Rules: when `selected_ad_ids=` is present it is trusted EXCLUSIVELY (the
 * `act=` account id and `business_id=` are digit runs too and must not be taken
 * as ads); otherwise every whitespace-separated token that is a bare 15–20 digit
 * run is an id. Everything else is ignored, never an error. Order kept, duplicates dropped.
 */
import { FuelyAutomationScope, MetaAdEffectiveStatus, Platform } from '~api/generated/automations/graphql';

const SELECTED_AD_IDS = /(?:^|[?&#])selected_ad_ids=([^&#\s]*)/g;
const BARE_ID = /^\d{15,20}$/;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** Ad ids out of free text — bare ids, an Ads Manager URL, or several of either. */
export function parseAdIds(text: string): string[] {
  const out: string[] = [];
  const push = (id: string) => {
    const trimmed = id.trim();
    if (BARE_ID.test(trimmed) && !out.includes(trimmed)) out.push(trimmed);
  };
  for (const raw of text.split(/\s+/)) {
    if (raw === '') continue;
    const token = decode(raw);
    const matches = [...token.matchAll(SELECTED_AD_IDS)];
    if (matches.length > 0) {
      for (const match of matches) for (const id of (match[1] ?? '').split(',')) push(id);
      continue;
    }
    if (token.includes('://') || token.includes('/')) continue; // a URL without the parameter carries no ad id we trust
    for (const piece of token.split(',')) push(piece);
  }
  return out;
}

/** True when the text holds something `parseAdIds` would keep. */
export const hasAdIds = (text: string): boolean => parseAdIds(text).length > 0;

/**
 * Which platforms the ads picker lists for a scope: WhatsApp click-to-chat ads
 * for the WhatsApp scope, Instagram ads for the two Instagram ad scopes, and
 * both otherwise (Facebook click-from-ads has no destination filter of its own).
 */
export function adPlatformsOf(scope: FuelyAutomationScope): Platform[] {
  switch (scope) {
    case FuelyAutomationScope.WhatsAppClickFromAds:
      return [Platform.Whatsapp];
    case FuelyAutomationScope.InstagramAdComments:
    case FuelyAutomationScope.InstagramClickFromAds:
      return [Platform.Instagram];
    default:
      return [Platform.Instagram, Platform.Whatsapp];
  }
}

export type AdStatusTone = 'success' | 'neutral' | 'warning';

/** Active is green, the paused family muted, anything else needs a look. */
export function adStatusTone(status: MetaAdEffectiveStatus): AdStatusTone {
  switch (status) {
    case MetaAdEffectiveStatus.Active:
      return 'success';
    case MetaAdEffectiveStatus.Paused:
    case MetaAdEffectiveStatus.AdSetPaused:
    case MetaAdEffectiveStatus.CampaignPaused:
    case MetaAdEffectiveStatus.Archived:
      return 'neutral';
    default:
      return 'warning';
  }
}

const STATUS_LABELS: Record<MetaAdEffectiveStatus, string> = {
  [MetaAdEffectiveStatus.Active]: 'Active',
  [MetaAdEffectiveStatus.AdSetPaused]: 'Ad set paused',
  [MetaAdEffectiveStatus.Archived]: 'Archived',
  [MetaAdEffectiveStatus.CampaignPaused]: 'Campaign paused',
  [MetaAdEffectiveStatus.Deleted]: 'Deleted',
  [MetaAdEffectiveStatus.Disapproved]: 'Disapproved',
  [MetaAdEffectiveStatus.InProgress]: 'In progress',
  [MetaAdEffectiveStatus.Paused]: 'Paused',
  [MetaAdEffectiveStatus.PendingBillingInfo]: 'Pending billing',
  [MetaAdEffectiveStatus.PendingReview]: 'Pending review',
  [MetaAdEffectiveStatus.PreApproved]: 'Pre-approved',
  [MetaAdEffectiveStatus.WithIssues]: 'With issues',
};

/** Unknown values (a status added after this build) read as themselves, never crash. */
export const adStatusLabel = (status: string): string => STATUS_LABELS[status as MetaAdEffectiveStatus] ?? status;

/** "Synced 2 h ago" from `metaAdsSyncState`; null when Meta has never synced. */
export function syncFreshness(finishedAt: string | null | undefined, now: number = Date.now()): string | null {
  if (!finishedAt) return null;
  const at = Date.parse(finishedAt);
  if (Number.isNaN(at)) return null;
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) return 'Synced just now';
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours} h ago`;
  const days = Math.round(hours / 24);
  return `Synced ${days} d ago`;
}
