import { describe, expect, it } from 'vitest';
import { PAGE_AHEAD_ROWS, nameHighlight, neighbourChatId, shouldLoadMore } from './inboxList';

const input = (over: Partial<Parameters<typeof shouldLoadMore>[0]> = {}) => ({
  end: 50,
  count: 50,
  hasMore: true,
  loadingMore: false,
  ...over,
});

describe('shouldLoadMore', () => {
  it('asks for the next page once the window nears the end of what is loaded', () => {
    expect(shouldLoadMore(input({ end: 50, count: 50 }))).toBe(true);
    expect(shouldLoadMore(input({ end: 50 - PAGE_AHEAD_ROWS, count: 50 }))).toBe(true);
  });

  it('stays quiet while the window is still well short of the end', () => {
    expect(shouldLoadMore(input({ end: 12, count: 50 }))).toBe(false);
  });

  it('never asks when the server said there is nothing more', () => {
    /* The defect this whole affordance exists for was the opposite of this:
       `hasNextPage` was discarded, so an inbox over 50 conversations simply
       stopped. Having read it, the list must also stop believing it. */
    expect(shouldLoadMore(input({ hasMore: false }))).toBe(false);
  });

  it('never asks while a page is already in flight', () => {
    /* A scroll fires many times per second. Without this a single flick
       requests the same cursor a dozen times. */
    expect(shouldLoadMore(input({ loadingMore: true }))).toBe(false);
  });

  it('does not fire on an empty list', () => {
    /* end is 0 and count is 0, so a bare `end >= count - threshold` is true —
       and would fire a page request against a list that has not loaded. */
    expect(shouldLoadMore(input({ end: 0, count: 0 }))).toBe(false);
  });

  it('fires when the viewport is taller than a whole page', () => {
    /* 50 rows loaded and all 50 rendered: without this the list would need a
       scroll it has no room to perform before it could ever reach row 51. */
    expect(shouldLoadMore(input({ end: 50, count: 50, hasMore: true }))).toBe(true);
  });

  it('stops again after the next page lands', () => {
    expect(shouldLoadMore(input({ end: 50, count: 100 }))).toBe(false);
  });

  it('honours a threshold of zero as "only at the very end"', () => {
    expect(shouldLoadMore(input({ end: 49, count: 50, threshold: 0 }))).toBe(false);
    expect(shouldLoadMore(input({ end: 50, count: 50, threshold: 0 }))).toBe(true);
  });

  it('treats a negative threshold as zero rather than paging early', () => {
    expect(shouldLoadMore(input({ end: 49, count: 50, threshold: -20 }))).toBe(false);
  });
});

describe('nameHighlight', () => {
  it('marks a contiguous hit', () => {
    expect(nameHighlight('Ada Lovelace', 'love')).toEqual([{ start: 4, end: 8 }]);
  });

  it('is case-insensitive, and reports ranges into the original casing', () => {
    expect(nameHighlight('Ada Lovelace', 'ADA')).toEqual([{ start: 0, end: 3 }]);
  });

  it('marks nothing for an empty or whitespace query', () => {
    expect(nameHighlight('Ada Lovelace', '')).toEqual([]);
    expect(nameHighlight('Ada Lovelace', '   ')).toEqual([]);
  });

  it('trims the query before matching, so a debounced space does not lose the hit', () => {
    expect(nameHighlight('Ada Lovelace', ' love ')).toEqual([{ start: 4, end: 8 }]);
  });

  it('refuses a scattered subsequence', () => {
    /* The shared matcher falls back to a left-to-right subsequence, which is
       right for ranking a palette and wrong here: the row may well be in the
       list because its PHONE matched, and underlining four unrelated letters
       of the name would claim otherwise. */
    expect(nameHighlight('Ada Lovelace', 'ale')).toEqual([]);
  });

  it('marks nothing when the query does not occur in the name at all', () => {
    expect(nameHighlight('Ada Lovelace', '+44 7700 900123')).toEqual([]);
  });

  it('marks the first occurrence only', () => {
    expect(nameHighlight('Anna Anna', 'anna')).toEqual([{ start: 0, end: 4 }]);
  });

  it('survives a name that is empty', () => {
    expect(nameHighlight('', 'ada')).toEqual([]);
  });
});

describe('neighbourChatId — where j and k land', () => {
  const order = ['a', 'b', 'c'];

  it('walks down and up one row at a time', () => {
    expect(neighbourChatId(order, 'a', 1)).toBe('b');
    expect(neighbourChatId(order, 'b', 1)).toBe('c');
    expect(neighbourChatId(order, 'c', -1)).toBe('b');
  });

  it('stops at the ends instead of wrapping', () => {
    // Holding j down a queue must end at the queue's end, not start over.
    expect(neighbourChatId(order, 'c', 1)).toBeNull();
    expect(neighbourChatId(order, 'a', -1)).toBeNull();
  });

  it('opens the top row when nothing is selected, whichever key is pressed', () => {
    expect(neighbourChatId(order, null, 1)).toBe('a');
    expect(neighbourChatId(order, null, -1)).toBe('a');
  });

  it('starts over from the top when the selection is no longer in the list', () => {
    expect(neighbourChatId(order, 'gone', 1)).toBe('a');
    expect(neighbourChatId(order, 'gone', -1)).toBe('a');
  });

  it('has nowhere to go in an empty list', () => {
    expect(neighbourChatId([], null, 1)).toBeNull();
    expect(neighbourChatId([], 'a', -1)).toBeNull();
  });
});
