/**
 * Bookings' layout policy over the design system's band model.
 *
 * Bands are CONTAINER-based (`useBand()` from `ModuleRoot`), never viewport —
 * an embed can be 700px wide on a 2560px screen. The policies here are the
 * decisions that change what React renders; anything that only changes how a
 * thing looks is a `@compact:` / `@wide:` / `@inline:` class on the element.
 */
import { bandAtLeast, type Band } from '~ui';
import type { CalendarMode, Density } from './bookingsParams';

export type { Band };

// The density type lives with the URL schema (`DEFAULT_DENSITY` is there); this facade keeps importers stable.
export { DENSITIES, type Density } from './bookingsParams';

/** Below `wide` (900px) there is no room for a week of columns or a table with all its columns. */
export function isNarrow(band: Band): boolean {
  return !bandAtLeast(band, 'wide');
}

/** The URL keeps the requested mode; the compact band renders a day regardless. */
export function effectiveMode(band: Band, requested: CalendarMode): CalendarMode {
  return band === 'compact' ? 'day' : requested;
}

/** Narrow forces compact rows: a comfortable table on a phone shows four rows. */
export function effectiveDensity(band: Band, requested: Density): Density {
  return isNarrow(band) ? 'compact' : requested;
}

/** Where the booking panel lives: `InspectorHost` asks the same question with its default `inlineFrom`. */
export function panelHost(band: Band): 'drawer' | 'inline' {
  return band === 'inline' ? 'inline' : 'drawer';
}

/** Staff and services go master–detail from `wide` up; below that the detail replaces the list. */
export function masterDetail(band: Band): 'split' | 'stacked' {
  return bandAtLeast(band, 'wide') ? 'split' : 'stacked';
}

/** The wizard is a dialog with room, or the whole module when there is none. */
export function wizardHost(band: Band): 'dialog' | 'fullscreen' {
  return band === 'compact' ? 'fullscreen' : 'dialog';
}
