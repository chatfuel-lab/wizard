import { SalesStageV2 } from '~api/generated/deals/graphql';

/**
 * How long a deal has sat where it is.
 *
 * The board's one honest ageing signal. `lastSalesStageUpdateTime` is the only
 * timestamp the API keeps and it is the LAST transition — so this is "days
 * since it last moved", never "days in this stage", and the UI must not imply
 * otherwise.
 *
 * Won and Lost have no threshold on purpose: a closed deal sitting still is not
 * rot, and painting it red would train people to ignore the colour.
 */

export type RotLevel = 'none' | 'warn' | 'stale';

export const ROT_THRESHOLD_DAYS: Partial<Record<SalesStageV2, number>> = {
  [SalesStageV2.New]: 2,
  [SalesStageV2.Sorting]: 3,
  [SalesStageV2.Ready]: 5,
  [SalesStageV2.WorkingOn]: 14,
};

export interface Rot {
  /** Whole days since the last move. Zero for anything unreadable or in the future. */
  days: number;
  level: RotLevel;
}

const NONE: Rot = { days: 0, level: 'none' };
const DAY_MS = 86_400_000;

/**
 * `now` is a parameter so the board can read the clock once per render: every
 * card then agrees, and this stays testable.
 */
export function rotOf(stage: SalesStageV2 | null | undefined, iso: string | null | undefined, now: number): Rot {
  if (!iso) return NONE;
  const at = Date.parse(iso);
  // An unparseable date must never paint a red bar — that is a data problem
  // being reported as a sales problem.
  if (!Number.isFinite(at)) return NONE;

  const days = Math.max(0, Math.floor((now - at) / DAY_MS));
  const threshold = stage ? ROT_THRESHOLD_DAYS[stage] : undefined;
  if (threshold === undefined) return { days, level: 'none' };

  if (days >= threshold * 2) return { days, level: 'stale' };
  if (days >= threshold) return { days, level: 'warn' };
  return { days, level: 'none' };
}
