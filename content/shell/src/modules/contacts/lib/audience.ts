/**
 * The Audience numbers — every one of them a count the SERVER returned, and
 * the sentence that says what it counted.
 *
 * Nothing here is folded over loaded rows. That is not a style rule, it is the
 * only way this surface can be honest: `contactsConnection` pages 500 at a
 * time, so a client-side tally would silently mean "the first few hundred
 * contacts" while looking like the whole address book. Every figure on the
 * screen therefore comes from one of exactly four counting calls —
 * `contactsCount` / `contactsTotalCount`, `contactChatsCountV2`,
 * `contactDealsByStages`, and the catalog's own `usersCount` — and this file
 * turns those into shares, ranks and captions without ever inventing one.
 *
 * The three things it deliberately cannot compute, and why:
 *
 * - **Growth over time.** `Contact` has no `createdAt`. None. "Contacts added
 *   this month" is not a number this API can answer, and deriving it from the
 *   `signed up` attribute would be a different number wearing that name — the
 *   attribute is optional, bot-authored, and absent on most contacts.
 * - **Anything per tag or per stored segment.** `byTag` and `byStoredSegment`
 *   are in the SDL and both fail live.
 * - **A count per saved view.** Saved views are per-user JSON in core storage,
 *   not a server-side segment; counting them means one query per view and the
 *   storage seam belongs to another surface.
 *
 * Every function here is total: an unknown count is `null` and renders as an
 * em dash, a zero denominator yields a zero share rather than `NaN`, and a
 * share is clamped to 0..1 so a bar can never overflow its track.
 */
import { AttributeType, Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import type { CatalogEntry } from '../hooks/useAttributeCatalog';
import { PLATFORM_LABELS } from './platforms';

// ---------------------------------------------------------------------------
// Arithmetic that must never produce NaN
// ---------------------------------------------------------------------------

/** `count / total`, clamped to 0..1. Zero when the denominator is unusable. */
export function shareOf(count: number, total: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(1, Math.max(0, count / total));
}

/** A bar's width against the biggest bar in its own list — magnitude, not share. */
export function shareOfMax(count: number, rows: readonly { count: number }[]): number {
  const max = rows.reduce((best, row) => Math.max(best, row.count), 0);
  return shareOf(count, max);
}

/** A percentage a reader can quote. Null (unknown) is an em dash, never `0%`. */
export function formatShare(share: number | null): string {
  if (share === null || !Number.isFinite(share)) return '—';
  const percent = share * 100;
  if (percent > 0 && percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

export const formatCount = (count: number | null): string =>
  count === null || !Number.isFinite(count) ? '—' : count.toLocaleString();

// ---------------------------------------------------------------------------
// Totals and the restriction gap
// ---------------------------------------------------------------------------

export interface AudienceTotals {
  /** `contactsCount` — respects the caller's assignee restrictions. */
  visible: number;
  /** `contactsTotalCount` — ignores them. */
  total: number;
}

/** Contacts that exist on the bot but this role may not open. Never negative. */
export const restrictionGap = (totals: AudienceTotals): number => Math.max(0, totals.total - totals.visible);

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export interface ChannelRow {
  platform: Platform;
  label: string;
  count: number;
  /** Of the bot total, 0..1. */
  share: number;
}

/**
 * One row per channel, biggest first, zeroes kept.
 *
 * A channel with no contacts is information — it is the answer to "did the
 * Instagram connection ever work?" — and dropping it would make the list say
 * "these are your channels" when it means "these are your busy channels".
 */
export function channelRows(counts: ReadonlyMap<Platform, number>, total: number): ChannelRow[] {
  const rows = [...counts].map(([platform, count]) => ({
    platform,
    label: PLATFORM_LABELS[platform],
    count,
    share: shareOf(count, total),
  }));
  rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return rows;
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export const STAGE_ORDER: readonly SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

export const STAGE_LABELS: Record<SalesStageV2, string> = {
  [SalesStageV2.New]: 'New',
  [SalesStageV2.Sorting]: 'Sorting',
  [SalesStageV2.Ready]: 'Ready',
  [SalesStageV2.WorkingOn]: 'Working on',
  [SalesStageV2.Won]: 'Won',
  [SalesStageV2.Lost]: 'Lost',
};

export interface StageRow {
  stage: SalesStageV2;
  label: string;
  count: number;
  /** Of every staged contact, 0..1 — the stage totals are their own whole. */
  share: number;
}

/**
 * The six stages in pipeline order, never sorted by size: the order IS the
 * meaning here, and re-ranking it would turn a funnel into a leaderboard.
 */
export function stageRows(totals: Readonly<Record<SalesStageV2, number>> | null): StageRow[] {
  if (totals === null) return [];
  const sum = STAGE_ORDER.reduce((acc, stage) => acc + (totals[stage] ?? 0), 0);
  return STAGE_ORDER.map((stage) => {
    const count = totals[stage] ?? 0;
    return { stage, label: STAGE_LABELS[stage], count, share: shareOf(count, sum) };
  });
}

export const sumStages = (rows: readonly StageRow[]): number => rows.reduce((sum, row) => sum + row.count, 0);

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export interface ConversationCounts {
  /** Every contact that HAS a conversation. */
  total: number;
  unread: number;
  unassigned: number;
  ai: number;
}

export interface OwnerRow {
  userId: string;
  name: string;
  count: number;
  /** Of the conversations counted, 0..1. */
  share: number;
}

export function ownerRows(
  members: readonly { userId: string; name: string }[],
  counts: ReadonlyMap<string, number>,
  conversationTotal: number,
): OwnerRow[] {
  const rows = members
    .map((member) => ({
      userId: member.userId,
      name: member.name,
      count: counts.get(member.userId) ?? 0,
      share: shareOf(counts.get(member.userId) ?? 0, conversationTotal),
    }))
    .filter((row) => counts.has(row.userId));
  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return rows;
}

// ---------------------------------------------------------------------------
// Field completeness — free, from the catalog already in memory
// ---------------------------------------------------------------------------

export interface FieldCoverageRow {
  name: string;
  count: number;
  /** Of the bot total, 0..1. */
  share: number;
  /** A bot-wide default makes this count mean something else — see below. */
  hasDefault: boolean;
  custom: boolean;
}

export interface FieldCoverage {
  rows: FieldCoverageRow[];
  /** Fields the catalog declined to count; excluded rather than shown as zero. */
  uncounted: number;
  /** The denominator every row is a share of. */
  total: number;
}

/**
 * The catalog's own `usersCount`, ranked. No extra query: the number is
 * already on every entry `useAttributeCatalog` loaded, which is why this is
 * the one breakdown on the page that costs nothing.
 *
 * `hasDefault` travels with the row because a bot-wide default changes what
 * the count means — the field reads as non-empty for contacts that never
 * carried it — and a 100% bar that is really "a default is set" is exactly the
 * kind of number this module refuses to print unlabelled.
 */
export function fieldCoverage(
  entries: readonly CatalogEntry[],
  total: number,
  options: { customOnly?: boolean } = {},
): FieldCoverage {
  const scoped = options.customOnly ? entries.filter((entry) => entry.type === AttributeType.Custom) : entries;
  const counted = scoped.filter((entry) => entry.usersCount !== null);
  const rows = counted.map((entry) => ({
    name: entry.name,
    count: entry.usersCount ?? 0,
    share: shareOf(entry.usersCount ?? 0, total),
    hasDefault: entry.defaultValue !== null && entry.defaultValue !== '',
    custom: entry.type === AttributeType.Custom,
  }));
  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { rows, uncounted: scoped.length - counted.length, total };
}
