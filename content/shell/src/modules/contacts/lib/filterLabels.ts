/**
 * How the filter model reads out loud.
 *
 * Every control in the bar has to print its own state on a closed trigger —
 * "All stages", "Last 7 days", "2 channels" — and the palette has to name the
 * same things in a command. Left in the components, those strings would be
 * written twice and would drift; here they are one function each, with tests.
 *
 * The engine label is the exception worth explaining: it does NOT invent copy.
 * It picks the caveat `lib/queryPlan.ts` already produced for that route, so
 * the bar and the list can never say two different things about the same
 * query.
 */
import { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import { ALL_STAGES, type ContactsFilter } from './contactsFilter';
import { ALL_PLATFORMS, PLATFORM_LABELS } from './platforms';

export const STAGE_LABELS: Record<SalesStageV2, string> = {
  [SalesStageV2.New]: 'New',
  [SalesStageV2.Sorting]: 'Sorting',
  [SalesStageV2.Ready]: 'Ready',
  [SalesStageV2.WorkingOn]: 'Working on',
  [SalesStageV2.Won]: 'Won',
  [SalesStageV2.Lost]: 'Lost',
};

export interface WindowPreset {
  id: string;
  label: string;
  /** Hours back from now, so "last 24 hours" is not "last 1 day". */
  hours: number;
}

export const WINDOW_PRESETS: readonly WindowPreset[] = [
  { id: 'h24', label: 'Last 24 hours', hours: 24 },
  { id: 'd7', label: 'Last 7 days', hours: 24 * 7 },
  { id: 'd30', label: 'Last 30 days', hours: 24 * 30 },
  { id: 'd90', label: 'Last 90 days', hours: 24 * 90 },
];

/** The `since` a preset means, right now. `until` stays open. */
export const windowSince = (preset: WindowPreset, now = Date.now()): string =>
  new Date(now - preset.hours * 3_600_000).toISOString();

/** Which preset an open window is, within a minute of tolerance, or null. */
export function matchWindowPreset(filter: ContactsFilter, now = Date.now()): WindowPreset | null {
  if (filter.since === null || filter.until !== null) return null;
  const at = Date.parse(filter.since);
  if (!Number.isFinite(at)) return null;
  return WINDOW_PRESETS.find((preset) => Math.abs(now - preset.hours * 3_600_000 - at) < 60_000) ?? null;
}

const shortDate = (iso: string): string => {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(at));
};

/** What the last-message control prints when it is closed. */
export function describeWindow(filter: ContactsFilter, now = Date.now()): string {
  if (filter.since === null && filter.until === null) return 'Any time';
  const preset = matchWindowPreset(filter, now);
  if (preset) return preset.label;
  if (filter.since !== null && filter.until === null) return `Since ${shortDate(filter.since)}`;
  if (filter.since === null && filter.until !== null) return `Before ${shortDate(filter.until)}`;
  return `${shortDate(filter.since as string)} – ${shortDate(filter.until as string)}`;
}

/** An empty list means every stage — the same thing the API means by `[]`. */
export function describeStages(stages: readonly SalesStageV2[]): string {
  if (stages.length === 0 || stages.length === ALL_STAGES.length) return 'All stages';
  if (stages.length === 1) return STAGE_LABELS[stages[0]];
  return `${stages.length} stages`;
}

export function describeChannels(platforms: readonly Platform[]): string {
  if (platforms.length === 0 || platforms.length === ALL_PLATFORMS.length) return 'All channels';
  if (platforms.length === 1) return PLATFORM_LABELS[platforms[0]];
  return `${platforms.length} channels`;
}

/** "3 days" / "1 day" — the rolling caption, and the only place it is spelled. */
export const describeDays = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'}`;

/**
 * What the group builder's trigger says.
 *
 * It deliberately does not say "Fields". The workspace's own tab bar already
 * has a Fields surface — the one that administers the bot's attributes — and a
 * button beside it with the same word reads as a way to get there rather than
 * as a filter. "Add filter" while there are none is also the only label that
 * says what pressing it does.
 */
export const describeConditions = (count: number): string =>
  count === 0 ? 'Add filter' : `${count} condition${count === 1 ? '' : 's'}`;

/** The bar's count pill. Null when there is nothing to count. */
export const describeFilterCount = (count: number): string | null =>
  count === 0 ? null : `${count} filter${count === 1 ? '' : 's'}`;

// ---------------------------------------------------------------------------
// The date editor's two value forms
// ---------------------------------------------------------------------------

/**
 * A predicate value as a `YYYY-MM-DD` for `DateField`.
 *
 * A stored value is either a millisecond stamp — the wire form
 * `lib/contactsSegment.ts` sends, because `dateStrategy` fails on every
 * attribute and `defaultStrategy` is all there is — or an RFC-3339 string a
 * saved view carried over. Both read; anything else reads as empty rather than
 * as `NaN-NaN-NaN`.
 */
export function dateValueToInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const at = /^\d+$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed);
  if (!Number.isFinite(at)) return '';
  const date = new Date(at);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` back to the millisecond string the segment builder sends. */
export function dateInputToValue(input: string | null): string {
  if (input === null || input.trim() === '') return '';
  const at = Date.parse(input);
  return Number.isFinite(at) ? String(at) : '';
}
