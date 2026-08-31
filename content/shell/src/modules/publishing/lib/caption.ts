/**
 * What a caption says about itself: how long it is, and how many hashtags it
 * carries.
 *
 * Hashtags are counted here rather than in the composer because the counting is
 * the part that can be wrong. The rules are unobvious — `a#b` is not a tag,
 * `#one#two` is two of them, `#2024` is not a tag at all — and a number shown
 * beside a field is only worth showing if it agrees with the platform that will
 * act on it.
 *
 * Length is measured in CODEPOINTS, which is what the platform counts. This is
 * not a detail: a caption of 2200 emoji is accepted and a caption of 2201 is
 * refused, while JavaScript's own `.length` reads those same 2200 emoji as
 * 4400. Counting in string length would refuse half of every legal caption
 * written by somebody who uses emoji — which is most people — so neither the
 * counter under the box nor the ceiling on the box may come from `.length`.
 */
import { CAPTION_MAX, HASHTAG_MAX } from './constants';

const BODY = /[\p{L}\p{N}_]/u;
const ALL_DIGITS = /^\p{N}+$/u;

/**
 * The distinct hashtags in a caption, in the order they first appear.
 *
 * Distinct, and compared without case, because `#Coffee` and `#coffee` are one
 * tag — counting them twice would warn about a limit that has not been reached.
 */
export function hashtagsIn(caption: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  /* True at the start of the text, after any character a tag cannot run into,
     and immediately after a tag — which is what makes `#one#two` two tags. */
  let boundary = true;
  let index = 0;

  while (index < caption.length) {
    const character = caption[index]!;
    if (character === '#' && boundary) {
      let end = index + 1;
      while (end < caption.length && BODY.test(caption[end]!)) end += 1;
      const body = caption.slice(index + 1, end);
      /* A tag needs at least one character that is not a digit: a year or a
         price does not become a link. */
      if (body && !ALL_DIGITS.test(body)) {
        const key = body.toLocaleLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          found.push(body);
        }
      }
      index = end;
      boundary = true;
      continue;
    }
    boundary = !BODY.test(character);
    index += 1;
  }

  return found;
}

/**
 * How long a caption is, in the units the platform counts it in.
 *
 * The spread is the whole point: it walks codepoints, so an emoji is one and a
 * flag is one, where `.length` would say two and four.
 */
export const captionLength = (caption: string): number => [...caption].length;

/** The caption cut to a length the platform will take, without splitting a codepoint. */
export const clampCaption = (caption: string, max: number = CAPTION_MAX): string =>
  captionLength(caption) <= max ? caption : [...caption].slice(0, max).join('');

export interface CaptionStats {
  /** Codepoints, the unit the platform enforces. */
  length: number;
  /** Characters left before the ceiling; negative once it is past. */
  remaining: number;
  overLength: boolean;
  hashtags: string[];
  count: number;
  /** Past this, the platform stops reading tags and drops the rest. */
  overHashtagLimit: boolean;
}

export function captionStats(
  caption: string,
  hashtagMax: number = HASHTAG_MAX,
  captionMax: number = CAPTION_MAX,
): CaptionStats {
  const hashtags = hashtagsIn(caption);
  const length = captionLength(caption);
  return {
    length,
    remaining: captionMax - length,
    overLength: length > captionMax,
    hashtags,
    count: hashtags.length,
    overHashtagLimit: hashtags.length > hashtagMax,
  };
}
