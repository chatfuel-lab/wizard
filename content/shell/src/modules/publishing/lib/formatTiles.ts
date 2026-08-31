/**
 * What each of the four format tiles draws.
 *
 * A tile has one job: say what THAT format is, before anybody has picked it.
 * The account is not the answer — every one of the four goes to the same
 * account, so wearing its picture four times says the same true and useless
 * thing four times, and where the account has no picture it says it as four
 * identical letters.
 *
 * All four tiles are one square, sized from the spacing scale in the component
 * rather than from a number here. Drawing each at its own aspect ratio was true
 * and unreadable: a row of four different rectangles reads as a row that has
 * gone wrong, and the shape a format takes is not the thing being chosen — the
 * name under the tile is. One size, one ring on the chosen one.
 */
import type { MediaItem, NewPost } from '../types';

/**
 * The picture every tile wears, or null when the draft has none yet.
 *
 * The first item and only the first: the tiles are four crops of one thing, not
 * a gallery, and a carousel's second slide has nothing to say about what format
 * this is. An item with no address at all is no picture — the tiles fall back to
 * the format's glyph rather than drawing a broken frame.
 */
export function tileMedia(draft: NewPost): MediaItem | null {
  const first = draft.media[0];
  if (!first) return null;
  return first.previewUrl || first.url ? first : null;
}
