import { MAX_AD_ID_LENGTH } from './eventRules';

/**
 * Ad ids out of whatever somebody has in the clipboard.
 *
 * People do not read ids off a screen — they open the ad in Meta's ads manager
 * and copy the browser's address bar. So the box takes a URL, a comma-separated
 * run, or a bare id, and finds the ids in it.
 *
 * When `selected_ad_ids=` is present it is trusted EXCLUSIVELY: the account id
 * in `act=` and `business_id=` are digit runs of their own and must never be
 * taken for ads. Otherwise every whitespace- or comma-separated token that is a
 * bare 15-20 digit run is an id. Anything else is ignored, never an error.
 * Order is kept and repeats are dropped.
 */

const SELECTED_AD_IDS = /(?:^|[?&#])selected_ad_ids=([^&#\s]*)/g;
const BARE_ID = /^\d{15,20}$/;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function parseAdIds(text: string): string[] {
  const out: string[] = [];
  const push = (candidate: string) => {
    const id = candidate.trim();
    if (BARE_ID.test(id) && !out.includes(id)) out.push(id);
  };

  for (const raw of text.split(/\s+/)) {
    if (raw === '') continue;
    const token = decode(raw);
    const matches = [...token.matchAll(SELECTED_AD_IDS)];
    if (matches.length > 0) {
      for (const match of matches) for (const id of (match[1] ?? '').split(',')) push(id);
      continue;
    }
    /* A URL without the parameter carries no id anybody should trust. */
    if (token.includes('://') || token.includes('/')) continue;
    for (const piece of token.split(',')) push(piece);
  }
  return out;
}

export const hasAdIds = (text: string): boolean => parseAdIds(text).length > 0;

/** What is wrong with an id already stored on a set, if anything. */
export type AdIdProblem = 'blank' | 'tooLong' | 'notAnId' | null;

export function adIdProblem(id: string): AdIdProblem {
  const trimmed = id.trim();
  if (!trimmed) return 'blank';
  if (id.length > MAX_AD_ID_LENGTH) return 'tooLong';
  if (!BARE_ID.test(trimmed)) return 'notAnId';
  return null;
}

/**
 * Where the ad lives in Meta's ads manager. Built from the ad's own id, which
 * is what the setting stores; every other id the API hands out is synthetic and
 * addresses nothing outside Chatfuel.
 */
export const adsManagerUrl = (adId: string): string =>
  `https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${encodeURIComponent(adId)}`;
