/**
 * The two figures the composer's toolbar carries, and when each of them is
 * worth carrying.
 *
 * Bare numbers. A caption box does not need to be told what a caption is, and
 * "1 240 / 2 200" spends a strip of the toolbar restating a ceiling that only
 * matters at the moment it is crossed — which is the moment the figure turns
 * and the refusal appears. So the pill says `1240`, and it says it in danger
 * red once the platform would refuse it.
 *
 * The length is ALWAYS carried, `0` included. It is the one figure that is
 * true of every caption there can be, and a pill that appears on the first
 * keystroke is a strip that changes shape while somebody is typing into it —
 * the toolbar has to be the same object empty and full, or the controls beside
 * it move. A `0` also says, at the moment it is least in doubt, that this
 * number is being kept.
 *
 * The hashtag figure does hold off until there IS a hashtag, because a post
 * with no tags is the ordinary case rather than an empty one, and it appears at
 * the head of the strip so the two never swap places. Past thirty it turns
 * warning rather than danger: the platform does not refuse the post, it stops
 * reading tags and drops the rest, which is a different kind of wrong from a
 * caption that will not publish at all.
 *
 * Both numbers come from `captionStats`, which counts codepoints. Nothing here
 * may be rederived from `.length`: see the note on that file.
 */
import { CAPTION_MAX, HASHTAG_MAX } from './constants';
import { captionStats } from './caption';

export type MeterId = 'hashtags' | 'length';

/** How a figure reads. `quiet` is the ordinary case; the other two are limits. */
export type MeterTone = 'quiet' | 'warning' | 'danger';

export interface Meter {
  id: MeterId;
  /** What the pill says, whole — no denominator, no unit, no word. */
  text: string;
  tone: MeterTone;
}

export function captionMeters(
  caption: string,
  hashtagMax: number = HASHTAG_MAX,
  captionMax: number = CAPTION_MAX,
): Meter[] {
  const stats = captionStats(caption, hashtagMax, captionMax);
  const meters: Meter[] = [];
  if (stats.count > 0) {
    meters.push({
      id: 'hashtags',
      text: `# ${stats.count}`,
      tone: stats.overHashtagLimit ? 'warning' : 'quiet',
    });
  }
  meters.push({
    id: 'length',
    text: String(stats.length),
    tone: stats.overLength ? 'danger' : 'quiet',
  });
  return meters;
}
