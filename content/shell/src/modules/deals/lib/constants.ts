/** Cards per column page. */
export const PAGE_SIZE = 20;

/** Live updates arrive in bursts and totals are a whole extra query — coalesce. */
export const TOTALS_DEBOUNCE_MS = 1000;

/** How long a failed mutation's message stays on screen. */
export const ERROR_VISIBLE_MS = 4000;

/**
 * How many pages the paging sentinel may fetch on its own before it hands over
 * to a button. Unbounded auto-paging turns a scroll into a full-column
 * download; three pages fills any realistic screen.
 */
export const AUTO_PAGE_CAP = 3;

/** How long a rolled-back card stays tinted after a failed move. */
export const FLASH_MS = 600;

/** A browser fires `click` on pointerup after a drag — ignore clicks this soon after one. */
export const CLICK_SUPPRESS_MS = 250;

/**
 * There is no bulk mutation: a multi-card move is N round trips. Past this many
 * the drag is refused with an explanation rather than firing sixty requests at
 * a rate-limited bot.
 */
export const MAX_MULTI_MOVE = 25;

/** How often the board re-reads the clock so age labels and rot stay current. */
export const AGE_TICK_MS = 60_000;

/** How far below the fold the paging sentinel starts loading. */
export const SENTINEL_MARGIN_PX = 200;

/**
 * Below this the FLIP pass leaves a card alone. Sub-pixel rect noise from a
 * scrollbar appearing or a font settling would otherwise animate the whole
 * board on every live batch.
 */
export const FLIP_MIN_PX = 2;
