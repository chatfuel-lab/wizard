/**
 * The numbers this module works to, and where each one comes from.
 *
 * Anything Instagram enforces is written once here so a screen never carries an
 * explanation of it: the composer refuses at the control, and the reasoning
 * lives in the skill docs.
 */

/** Instagram's caption ceiling. The API answers InstagramPublishCaptionTooLong past it. */
export const CAPTION_MAX = 2_200;

/** Instagram stops counting hashtags after this many and quietly drops the rest. */
export const HASHTAG_MAX = 30;

/** From the mutation's own doc-comment: a carousel is 2 to 10 items. */
export const CAROUSEL_MIN = 2;
export const CAROUSEL_MAX = 10;

/**
 * How long a publish is given.
 *
 * `instagramAccountPublishReel` waits inside the mutation while Instagram
 * transcodes, up to five minutes, so the client budget has to clear that — and
 * has to be LONGER than the proxy's own slow budget, or a proxy timing out would
 * be reported as a client abort and lose the upstream's reason.
 */
export const PUBLISH_TIMEOUT_MS = 300_000;

/** Media per page in the library, and how many to pull down from Instagram first. */
export const LIBRARY_PAGE_SIZE = 24;
export const REFETCH_COUNT = 30;

/** A published post's arrival on the subscription, waited for after a failed publish. */
export const CONFIRM_WINDOW_MS = 20_000;

/**
 * How often the confirmation window is re-examined while it is open.
 *
 * An arrival wakes it immediately; this is only the floor, so a window that
 * expires with nothing in it still closes on time.
 */
export const CONFIRM_TICK_MS = 500;

/**
 * Turning an upload into a URL: the file is stored first and downloaded second,
 * and only a `Downloaded` file has an address the platform can fetch.
 *
 * The ceiling is generous because a video is the slow case, and giving up early
 * would throw away bytes that were already on their way.
 */
export const UPLOAD_POLL_INTERVAL_MS = 1_200;
export const UPLOAD_POLL_TIMEOUT_MS = 120_000;
