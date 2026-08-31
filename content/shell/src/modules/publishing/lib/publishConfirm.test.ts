import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError, ChatfuelHttpError, ChatfuelNetworkError } from '~api';
import {
  confirmPublish,
  isDomainRefusal,
  matchPublished,
  newArrivals,
  type ConfirmInput,
  type MediaSummary,
} from './publishConfirm';
import { CONFIRM_WINDOW_MS } from './constants';

const STARTED = 1_000_000;

const media = (over: Partial<MediaSummary> = {}): MediaSummary => ({
  id: 'ig-new',
  __typename: 'InstagramPost',
  caption: 'Bags landed',
  url: 'https://www.instagram.com/p/abc/',
  ...over,
});

const input = (over: Partial<ConfirmInput> = {}): ConfirmInput => ({
  kind: 'post',
  caption: 'Bags landed',
  before: new Set(['ig-old-1', 'ig-old-2']),
  after: [],
  startedAt: STARTED,
  now: STARTED + 1000,
  ...over,
});

describe('telling a refusal from a lost connection', () => {
  it('reads an answered refusal as a decision', () => {
    const refusal = new ChatfuelGraphQLError([
      { message: 'caption is too long', extensions: { code: 'InstagramPublishCaptionTooLong' } },
    ]);
    expect(isDomainRefusal(refusal)).toBe(true);
  });

  it('reads a lost connection, a timeout and a gateway failure as unknown', () => {
    expect(isDomainRefusal(new ChatfuelNetworkError('fetch failed'))).toBe(false);
    expect(isDomainRefusal(new ChatfuelHttpError(502, 'Bad Gateway'))).toBe(false);
    expect(isDomainRefusal(new Error('The operation was aborted'))).toBe(false);
    expect(isDomainRefusal('something')).toBe(false);
  });

  it('reads a proxy that gave up on the upstream as unknown, envelope or not', () => {
    // The proxy reports its OWN timeout in the same shape the API reports a
    // refusal, so the envelope is not proof that anything was decided. This is
    // the likeliest way a Reel publish fails — it blocks for minutes and the
    // proxy stops waiting first — and reading it as a refusal would offer a
    // retry that posts the same thing twice.
    const timedOut = new ChatfuelGraphQLError([
      {
        message: 'chatfuel upstream timed out after 290000ms',
        extensions: { code: 'ProxyUpstreamUnavailable' },
      },
    ]);
    expect(isDomainRefusal(timedOut)).toBe(false);
  });

  it('still reads a proxy refusing BEFORE the upstream as a decision', () => {
    // No token, no session, the wrong bot: the request never reached Chatfuel,
    // so nothing was published and a retry is immediately safe.
    for (const code of ['ProxyTokenMissing', 'AuthSessionRequired', 'BotNotAllowed', 'ProxyFenceUnavailable']) {
      const refused = new ChatfuelGraphQLError([{ message: code, extensions: { code } }]);
      expect(isDomainRefusal(refused)).toBe(true);
    }
  });
});

describe('the diff', () => {
  it('keeps only what was not there before', () => {
    const after = [media({ id: 'ig-new' }), media({ id: 'ig-old-1' })];
    expect(newArrivals(new Set(['ig-old-1']), after).map((one) => one.id)).toEqual(['ig-new']);
  });

  it('keeps the order it was given, which is newest first', () => {
    const after = [media({ id: 'a' }), media({ id: 'b' }), media({ id: 'c' })];
    expect(newArrivals(new Set(), after).map((one) => one.id)).toEqual(['a', 'b', 'c']);
  });

  it('finds nothing when nothing is new', () => {
    expect(newArrivals(new Set(['a']), [media({ id: 'a' })])).toEqual([]);
  });
});

describe('matching what was sent', () => {
  it('takes the one of the right kind with the right caption', () => {
    expect(matchPublished([media()], { kind: 'post', caption: 'Bags landed' })?.id).toBe('ig-new');
  });

  it('refuses another kind', () => {
    const reel = media({ __typename: 'InstagramReel' });
    expect(matchPublished([reel], { kind: 'post', caption: 'Bags landed' })).toBeNull();
    expect(matchPublished([media()], { kind: 'reel', caption: 'Bags landed' })).toBeNull();
  });

  it('reads a carousel as the post it arrives as', () => {
    expect(matchPublished([media()], { kind: 'carousel', caption: 'Bags landed' })?.id).toBe('ig-new');
  });

  it('refuses somebody else’s post published in the same window', () => {
    const other = media({ id: 'ig-other', caption: 'Saturday hours are back' });
    expect(matchPublished([other], { kind: 'post', caption: 'Bags landed' })).toBeNull();
  });

  it('ignores whitespace either side of the caption', () => {
    const spaced = media({ caption: '  Bags landed  ' });
    expect(matchPublished([spaced], { kind: 'post', caption: 'Bags landed\n' })?.id).toBe('ig-new');
  });

  it('picks ours out of a list that also holds somebody else’s', () => {
    const list = [media({ id: 'theirs', caption: 'Something else' }), media({ id: 'ours' })];
    expect(matchPublished(list, { kind: 'post', caption: 'Bags landed' })?.id).toBe('ours');
  });

  /* Two identical captions cannot be told apart. Confirming the newest is the
     safe reading: the cost of a wrong permalink is a wrong link, and the cost
     of a wrong retry is the same post published twice. */
  it('takes the newest when two carry the same caption', () => {
    const list = [media({ id: 'newer' }), media({ id: 'older' })];
    expect(matchPublished(list, { kind: 'post', caption: 'Bags landed' })?.id).toBe('newer');
  });

  it('takes any new post of the kind when no caption was sent', () => {
    const list = [media({ id: 'a', caption: null })];
    expect(matchPublished(list, { kind: 'post', caption: '' })?.id).toBe('a');
    expect(matchPublished(list, { kind: 'post', caption: '   ' })?.id).toBe('a');
  });

  it('takes any new story, which never carries a caption', () => {
    const story = media({ id: 's-1', __typename: 'InstagramStory', caption: null });
    expect(matchPublished([story], { kind: 'story', caption: '' })?.id).toBe('s-1');
  });

  it('does not take a story for a post when no caption was sent', () => {
    const story = media({ id: 's-1', __typename: 'InstagramStory', caption: null });
    expect(matchPublished([story], { kind: 'post', caption: '' })).toBeNull();
  });

  it('refuses one with no caption when a caption was sent', () => {
    expect(matchPublished([media({ caption: null })], { kind: 'post', caption: 'Bags landed' })).toBeNull();
  });

  it('finds nothing in an empty diff', () => {
    expect(matchPublished([], { kind: 'post', caption: '' })).toBeNull();
  });
});

describe('the decision', () => {
  it('waits while the window is open and nothing new has appeared', () => {
    expect(confirmPublish(input())).toEqual({ state: 'waiting' });
  });

  it('waits while the only new media is somebody else’s', () => {
    const other = media({ id: 'ig-other', caption: 'Something else' });
    expect(confirmPublish(input({ after: [other] }))).toEqual({ state: 'waiting' });
  });

  it('waits when the account still shows only what it showed before', () => {
    const old = media({ id: 'ig-old-1' });
    expect(confirmPublish(input({ after: [old] }))).toEqual({ state: 'waiting' });
  });

  it('gives up once the window has closed', () => {
    expect(confirmPublish(input({ now: STARTED + CONFIRM_WINDOW_MS }))).toEqual({ state: 'failed' });
  });

  it('confirms on a match, and hands back what the post became', () => {
    expect(confirmPublish(input({ after: [media()] }))).toEqual({
      state: 'confirmed',
      mediaId: 'ig-new',
      permalink: 'https://www.instagram.com/p/abc/',
    });
  });

  it('confirms even after the window has closed, if the match is there', () => {
    const late = input({ after: [media()], now: STARTED + CONFIRM_WINDOW_MS * 10 });
    expect(confirmPublish(late)).toMatchObject({ state: 'confirmed' });
  });

  it('takes a window of its own', () => {
    expect(confirmPublish(input({ now: STARTED + 50, windowMs: 40 }))).toEqual({ state: 'failed' });
  });

  it('carries an empty permalink through rather than inventing one', () => {
    expect(confirmPublish(input({ after: [media({ url: '' })] }))).toMatchObject({ permalink: '' });
  });

  /* The reading before the publish is one cheap request, and it can fail. An
     empty "before" makes everything on the account a candidate, which errs
     toward confirming — the safe direction, because the alternative is a retry
     that posts the same thing twice. */
  it('still matches on caption when nothing was read before the publish', () => {
    expect(confirmPublish(input({ before: new Set(), after: [media()] }))).toMatchObject({ state: 'confirmed' });
  });
});
