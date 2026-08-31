import type { EventSetView } from '../types';
import { adIdProblem } from './adIds';

/**
 * Which set answers which ad.
 *
 * The base set answers every ad and is not in the index — it is the fallback,
 * not a claim. A custom set claims the ids it lists, and the API happily lets
 * two sets claim the same id, which means one of them silently loses. Nothing
 * on the server reports that, and no ad account is needed to work it out, so
 * this is where it is worked out.
 */

export interface AdClaim {
  adId: string;
  /** Every custom set that lists this id, in rail order. */
  setIds: string[];
}

export interface Coverage {
  /** Ad id → the sets claiming it. Only ids claimed at all appear. */
  byAd: Map<string, AdClaim>;
  /** Ids claimed by more than one set. */
  contested: AdClaim[];
  /** Set id → the ids on it that are blank or not shaped like an ad id. */
  malformed: Map<string, string[]>;
}

export function buildCoverage(sets: readonly EventSetView[]): Coverage {
  const byAd = new Map<string, AdClaim>();
  const malformed = new Map<string, string[]>();

  for (const set of sets) {
    if (set.isBase || !set.ads) continue;
    const bad: string[] = [];
    for (const adId of set.ads.value) {
      if (adIdProblem(adId)) bad.push(adId);
      const claim = byAd.get(adId);
      if (claim) {
        if (!claim.setIds.includes(set.id)) claim.setIds.push(set.id);
      } else {
        byAd.set(adId, { adId, setIds: [set.id] });
      }
    }
    if (bad.length > 0) malformed.set(set.id, bad);
  }

  const contested = [...byAd.values()].filter((claim) => claim.setIds.length > 1);
  return { byAd, contested, malformed };
}

/** The other sets claiming this id, for the chip that has to say so. */
export function rivalsOf(coverage: Coverage, setId: string, adId: string): string[] {
  return (coverage.byAd.get(adId)?.setIds ?? []).filter((id) => id !== setId);
}
