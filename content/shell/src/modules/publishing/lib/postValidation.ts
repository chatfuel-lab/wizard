/**
 * The only place a constraint on a post is written down.
 *
 * Every one of these has a matching refusal on the platform, several seconds
 * after a publish that has already blocked the operator — `InstagramCarouselSizeInvalid`,
 * `InstagramPublishCaptionTooLong` — and the whole point of answering here is
 * that the answer arrives while the thing that is wrong is still on screen.
 *
 * Each problem names the control it belongs to, because that is where it gets
 * drawn: a form does not carry a list of what might go wrong, it carries the
 * message on the field that is wrong, once, at the moment it is.
 */
import { CAPTION_MAX, CAROUSEL_MAX, CAROUSEL_MIN } from './constants';
import { acceptsOf, capacityOf, expiringMedia, KIND_LABELS } from './composerDraft';
import { captionLength } from './caption';
import type { NewPost } from '../types';

/** The controls a problem can be attached to. */
export type PostField = 'media' | 'caption' | 'schedule' | 'cover';

export interface PostProblem {
  field: PostField;
  message: string;
}

export interface ValidateOptions {
  /**
   * Whether a time in the future would actually be honoured. A store only this
   * browser reads cannot make a post go out while nobody is looking, so a time
   * written against it is not a plan.
   */
  canSchedule?: boolean;
  /** Epoch milliseconds. Given, a time already gone is rejected. */
  now?: number;
  /**
   * Whether every item has to still be reachable later.
   *
   * True for a post being given a time: an uploaded file is deleted a short
   * while after it lands, so a scheduled post built on one would go out to a
   * URL that answers nothing. Publishing now has no such problem, which is why
   * this is an option and not a rule.
   */
  requireDurableMedia?: boolean;
}

const isBlank = (value: string | null | undefined): boolean => !value || !value.trim();

/** A cover has to be a link the platform's own servers can open. */
function isPublicUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validatePost(post: NewPost, options: ValidateOptions = {}): PostProblem[] {
  const problems: PostProblem[] = [];
  const { kind, media, caption } = post;
  const accepts = acceptsOf(kind);

  /* ── media ─────────────────────────────────────────────────────────── */
  if (media.length === 0) {
    problems.push({
      field: 'media',
      message:
        kind === 'carousel'
          ? `A carousel needs at least ${CAROUSEL_MIN} items.`
          : kind === 'reel'
            ? 'Add a video.'
            : kind === 'story'
              ? 'Add a photo or a video.'
              : 'Add a photo.',
    });
  } else if (kind === 'carousel' && media.length < CAROUSEL_MIN) {
    problems.push({ field: 'media', message: `A carousel needs at least ${CAROUSEL_MIN} items.` });
  } else if (media.length > capacityOf(kind)) {
    problems.push({
      field: 'media',
      message:
        kind === 'carousel'
          ? `A carousel takes at most ${CAROUSEL_MAX} items.`
          : `A ${KIND_LABELS[kind].toLowerCase()} takes one item.`,
    });
  } else if (media.some((item) => !accepts.includes(item.type))) {
    problems.push({
      field: 'media',
      message: kind === 'reel' ? 'A reel needs a video.' : 'A post takes a photo.',
    });
  } else if (media.some((item) => isBlank(item.url))) {
    /* The publish inputs carry a URL the platform fetches itself, so an item
       whose upload has not resolved into one has nothing to publish. */
    problems.push({ field: 'media', message: 'One item is not ready yet.' });
  } else if (options.requireDurableMedia && expiringMedia(post).length > 0) {
    problems.push({ field: 'media', message: 'An upload cannot be held until a later time.' });
  }

  /* ── caption ───────────────────────────────────────────────────────── */
  if (kind === 'story' && !isBlank(caption)) {
    problems.push({ field: 'caption', message: 'A story cannot carry a caption.' });
  } else if (captionLength(caption) > CAPTION_MAX) {
    /* Codepoints, not string length: the ceiling is counted the way the
       platform counts it, so 2200 emoji pass and 2201 do not. */
    problems.push({ field: 'caption', message: `A caption stops at ${CAPTION_MAX} characters.` });
  }

  /* ── reel extras ───────────────────────────────────────────────────── */
  const cover = post.reel?.coverURL;
  if (kind === 'reel' && cover && !isBlank(cover) && !isPublicUrl(cover)) {
    problems.push({ field: 'cover', message: 'A cover needs a full http or https link.' });
  }
  const offset = post.reel?.thumbOffset;
  if (kind === 'reel' && offset !== undefined && (!Number.isFinite(offset) || offset < 0)) {
    problems.push({ field: 'cover', message: 'A cover frame cannot be before the start.' });
  }

  /* ── time ──────────────────────────────────────────────────────────── */
  if (post.scheduledAt !== null) {
    const at = Date.parse(post.scheduledAt);
    if (Number.isNaN(at)) {
      problems.push({ field: 'schedule', message: 'Pick a date and a time.' });
    } else if (options.canSchedule === false) {
      problems.push({ field: 'schedule', message: 'This app cannot publish at a later time.' });
    } else if (options.now !== undefined && at <= options.now) {
      problems.push({ field: 'schedule', message: 'That time has already passed.' });
    }
  }

  return problems;
}

/** The message for one control, or null. */
export const problemFor = (problems: readonly PostProblem[], field: PostField): string | null =>
  problems.find((problem) => problem.field === field)?.message ?? null;
