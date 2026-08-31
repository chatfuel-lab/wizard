/**
 * Selection, targeting and the list's own arithmetic.
 *
 * The selection itself lives in the reducer (`contactsStore.ts`), which is the
 * only place that can prune it when a live batch retires a row. Everything
 * *decided* about it is here: which rows a right-click acts on, how many pages
 * "select everything that matches" has to pull before it can honestly say
 * "everything", and what the header prints about the difference between what
 * the server counted and what is on screen.
 *
 * All pure. vitest runs node-only in this repo, so a rule left inside a
 * component is untestable forever.
 */
import type { CountSummary } from './contactsStore';
import { parseContactsParams, writeContactsParams } from './contactsParams';

/** A contact the caller may not see: no id worth acting on, no field to read. */
export function isRestrictedRow(row: { __typename: string } | undefined): boolean {
  return row?.__typename === 'UnavailableContact';
}

/**
 * Drop ids the table can no longer act on.
 *
 * A live `Remove` retires a contact, and a mutation fired against one
 * afterwards fails for a reason nobody can see. The reducer prunes on every
 * batch; anything setting a selection from outside runs through this first.
 */
export function pruneSelection<T extends { __typename: string }>(
  selection: readonly string[],
  byId: Readonly<Record<string, T>>,
): string[] {
  return selection.filter((id) => byId[id] !== undefined && !isRestrictedRow(byId[id]));
}

/**
 * What a row-level action applies to.
 *
 * Right-clicking a row inside the selection acts on the whole selection;
 * right-clicking one outside it acts on that row alone and leaves the selection
 * untouched. Every file manager works this way, and deviating from it loses
 * work silently.
 */
export function actionTargets<T extends { __typename: string }>(
  rowId: string,
  selection: readonly string[],
  byId: Readonly<Record<string, T>>,
): string[] {
  const row = byId[rowId];
  if (row === undefined || isRestrictedRow(row)) return [];
  if (!selection.includes(rowId)) return [rowId];
  return pruneSelection(selection, byId);
}

/** Rows for `ids`, in the order given, skipping anything the table cannot touch. */
export function rowsFor<T extends { __typename: string }>(
  ids: readonly string[],
  byId: Readonly<Record<string, T>>,
): T[] {
  return ids.map((id) => byId[id]).filter((row): row is T => row !== undefined && !isRestrictedRow(row));
}

/** Every row on screen that can be selected — the target of "select page". */
export function selectableIds<T extends { __typename: string; id: string }>(rows: readonly T[]): string[] {
  return rows.filter((row) => !isRestrictedRow(row)).map((row) => row.id);
}

/** True when every selectable row on screen is already selected. */
export function isPageSelected(
  rows: readonly { __typename: string; id: string }[],
  selection: readonly string[],
): boolean {
  const ids = selectableIds(rows);
  if (ids.length === 0) return false;
  const chosen = new Set(selection);
  return ids.every((id) => chosen.has(id));
}

// ---------------------------------------------------------------------------
// Select everything the filter matches
// ---------------------------------------------------------------------------

/**
 * What "select all matching" actually means here.
 *
 * There is no server-side selection and no bulk mutation: a run is one request
 * per contact, so a selection is only real once the rows are loaded. This plans
 * the paging that has to happen first, and how much of the match the cap will
 * leave behind — which the confirm dialog then says out loud rather than
 * quietly selecting a prefix.
 */
export interface SelectAllPlan {
  /** How many rows must be loaded before the selection can be made. */
  target: number;
  /** True when the match is bigger than the cap. */
  capped: boolean;
  /** How many matching contacts the run will NOT cover. */
  uncovered: number;
  /** More pages are needed before the selection is complete. */
  needsMore: boolean;
}

export function selectAllPlan(
  serverCount: number | null,
  loaded: number,
  hasNext: boolean,
  cap: number,
): SelectAllPlan {
  /* A null count is the count query having failed. Paging to the end is still
     correct, it just cannot be described in advance. */
  const total = serverCount === null ? Number.POSITIVE_INFINITY : serverCount;
  const target = Math.min(total, cap);
  const capped = total > cap;
  return {
    target: Number.isFinite(target) ? target : cap,
    capped,
    uncovered: capped && Number.isFinite(total) ? total - cap : 0,
    needsMore: hasNext && loaded < target,
  };
}

/**
 * One pass of the paging loop that realizes a select-all.
 *
 * `wait` — a page is already in flight, do nothing this pass. `finish` — the
 * target is loaded (or the list ended early), make the selection and stop.
 * `page` — pull one more page.
 */
export function fillStep(input: {
  loading: boolean;
  paging: boolean;
  loaded: number;
  target: number;
  hasNext: boolean;
}): 'wait' | 'finish' | 'page' {
  if (input.loading || input.paging) return 'wait';
  if (input.loaded >= input.target || !input.hasNext) return 'finish';
  return 'page';
}

/** The sentence the confirm dialog prints. Never says a number it does not know. */
export function selectAllLabel(plan: SelectAllPlan, serverCount: number | null): string {
  if (serverCount === null) {
    return `Select up to ${plan.target.toLocaleString()} contacts — the server did not return a count for this filter.`;
  }
  if (!plan.capped) {
    return `Select all ${serverCount.toLocaleString()} contacts that match this filter.`;
  }
  return (
    `${serverCount.toLocaleString()} contacts match. This API has no bulk mutation — every change is one request — ` +
    `so a run covers at most ${plan.target.toLocaleString()}. The first ${plan.target.toLocaleString()} in the ` +
    `current order are selected and ${plan.uncovered.toLocaleString()} are left out.`
  );
}

// ---------------------------------------------------------------------------
// What the list says about itself
// ---------------------------------------------------------------------------

export interface ListStatus {
  /** The headline count, e.g. "120 of 1,234". */
  headline: string;
  /** A second clause, emitted only when it is true. */
  note: string | null;
}

/**
 * The counts, said honestly.
 *
 * Two things must never happen: printing a server count as though it described
 * the rows on screen (it describes a wider set whenever a conversation filter
 * is being applied client-side), and printing a total that is really "how many
 * have loaded so far".
 */
export function listStatus(counts: CountSummary, loaded: number, hasNext: boolean): ListStatus {
  const shown = counts.shown.toLocaleString();
  const note = counts.narrowed
    ? `Narrowed from the ${loaded.toLocaleString()} rows loaded so far — the rest of the match has not been fetched yet.`
    : null;

  if (counts.serverCount === null) {
    return { headline: hasNext ? `${shown} loaded so far` : `${shown} loaded`, note };
  }
  if (!hasNext && !counts.narrowed && counts.shown === counts.serverCount) {
    return { headline: `${shown} ${counts.shown === 1 ? 'contact' : 'contacts'}`, note };
  }
  return { headline: `${shown} of ${counts.serverCount.toLocaleString()}`, note };
}

/** Emitted only when the caller's role really is hiding something. */
export function restrictionNote(counts: CountSummary): string | null {
  if (counts.hiddenByRestriction <= 0) return null;
  const n = counts.hiddenByRestriction.toLocaleString();
  return `Your role hides ${n} ${counts.hiddenByRestriction === 1 ? 'contact' : 'contacts'} on this bot — they are counted here but cannot be opened or edited.`;
}

/** The "load more" line. Says how many are loaded out of how many. */
export function loadMoreLabel(counts: CountSummary, loaded: number): string {
  if (counts.serverCount === null) return `Load more (${loaded.toLocaleString()} loaded)`;
  return `Load more — ${loaded.toLocaleString()} of ${counts.serverCount.toLocaleString()} loaded`;
}

// ---------------------------------------------------------------------------
// Keyboard and links
// ---------------------------------------------------------------------------

/**
 * The row below `id` in the order actually on screen — where Enter puts the
 * cursor after it commits a cell. Null at the bottom, which is what stops the
 * edit chain rather than wrapping it round to the top.
 */
export function nextRowId(order: readonly string[], id: string): string | null {
  const index = order.indexOf(id);
  if (index === -1 || index + 1 >= order.length) return null;
  return order[index + 1] ?? null;
}

export function previousRowId(order: readonly string[], id: string): string | null {
  const index = order.indexOf(id);
  if (index <= 0) return null;
  return order[index - 1] ?? null;
}

/**
 * This module's parameters as the given URL carries them.
 *
 * The query string, routed or embedded alike: the shell puts a module's keys
 * there — `/contacts?contact=ct-1` — and an embed, which has no route of ours
 * at all, puts them on the host page's query string. Same place, so a link that
 * is read and a link that is written cannot disagree.
 */
export function moduleParams(href: string): URLSearchParams {
  return new URL(href).searchParams;
}

/**
 * A shareable link to one contact.
 *
 * Built through `writeContactsParams` rather than by setting `contact=` by
 * hand: that file owns which query keys are the module's and leaves every other
 * key alone. In an embed the result is the HOST's page carrying our parameter —
 * the best a module that does not own the address bar can honestly offer.
 */
export function contactLinkFor(href: string, contactId: string): string {
  const url = new URL(href);
  const current = url.searchParams;
  url.search = writeContactsParams(current, {
    ...parseContactsParams(current, viewOf(url)),
    contact: contactId,
  }).toString();
  return url.toString();
}

/** The view segment of a routed URL — '' for an embed, which has no route. */
function viewOf(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const at = segments.indexOf('contacts');
  return at === -1 ? '' : (segments[at + 1] ?? '');
}

// ---------------------------------------------------------------------------
// Which empty state
// ---------------------------------------------------------------------------

/**
 * `none` — the bot has no contacts; offer a way to make one.
 * `filtered` — there are contacts, this filter matches none of them.
 * `restricted` — everything that matches is hidden from this caller's role.
 */
export type EmptyKind = 'none' | 'filtered' | 'restricted';

/**
 * Three empty tables that look identical and mean completely different things.
 * Getting this wrong is how a user with a filter on concludes their address
 * book is gone, or how a restricted role is told to import a CSV it cannot see
 * the result of.
 */
export function emptyKind(counts: CountSummary, filterIsEmpty: boolean): EmptyKind {
  /* Restriction first: a role that can see nothing must not be told to widen a
     filter, because no filter would help. */
  if (counts.serverCount === 0 && counts.hiddenByRestriction > 0) return 'restricted';
  if (!filterIsEmpty) return 'filtered';
  return 'none';
}

/**
 * The stamps still worth drawing.
 *
 * `contactsStore` stamps a rolled-back row (`flash`) and a live arrival
 * (`arrived`) with the time it happened and expires them on the next action —
 * but a single failure in a quiet list produces no next action, so the mark
 * would sit there forever. The view re-reads this with a timer instead, which
 * keeps the decision here and the clock in one obvious place.
 */
export function freshStamps(
  stamps: Readonly<Record<string, number>>,
  now: number,
  ttl: number,
): Record<string, number> {
  return Object.fromEntries(Object.entries(stamps).filter(([, at]) => now - at < ttl));
}

/** When the oldest stamp expires, so the view can set exactly one timer. */
export function nextExpiry(stamps: Readonly<Record<string, number>>, now: number, ttl: number): number | null {
  const remaining = Object.values(stamps).map((at) => at + ttl - now);
  if (remaining.length === 0) return null;
  return Math.max(0, Math.min(...remaining));
}
