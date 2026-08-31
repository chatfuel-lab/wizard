import { describe, expect, it } from 'vitest';
import {
  advance,
  EMPTY_STREAM,
  endStream,
  isSettled,
  receiveChunk,
  replaceText,
  settledStream,
  showCaret,
  visibleText,
  type StreamState,
} from './streamBuffer';

/** Feed chunks the way the subscription does, then run `frames` frames. */
function play(chunks: string[], frames: number, charsPerFrame = 8): StreamState {
  let state = chunks.reduce(receiveChunk, EMPTY_STREAM);
  for (let i = 0; i < frames; i += 1) state = advance(state, { charsPerFrame });
  return state;
}

describe('receiveChunk', () => {
  it('appends — chunks are deltas, not snapshots', () => {
    const state = ['Hel', 'lo ', 'there'].reduce(receiveChunk, EMPTY_STREAM);
    expect(state.received).toBe('Hello there');
  });

  it('shows nothing until a frame reveals it', () => {
    const state = receiveChunk(EMPTY_STREAM, 'Hello');
    expect(visibleText(state)).toBe('');
    expect(visibleText(advance(state))).toBe('Hello');
  });

  it('ignores an empty chunk without producing a new object', () => {
    const state = receiveChunk(EMPTY_STREAM, 'a');
    expect(receiveChunk(state, '')).toBe(state);
  });
});

describe('advance', () => {
  it('paces the reveal so a burst of chunks does not arrive as a slab', () => {
    expect(visibleText(play(['abcdefghijklmnop'], 1, 4))).toBe('abcd');
    expect(visibleText(play(['abcdefghijklmnop'], 2, 4))).toBe('abcdefgh');
    expect(visibleText(play(['abcdefghijklmnop'], 4, 4))).toBe('abcdefghijklmnop');
  });

  it('abandons pacing when the backlog is big enough to feel slow', () => {
    const long = 'x'.repeat(500);
    const state = advance(receiveChunk(EMPTY_STREAM, long), { charsPerFrame: 4, catchUpAt: 400 });
    expect(visibleText(state)).toBe(long);
  });

  it('shows everything at once when the caller asked for no motion', () => {
    const state = advance(receiveChunk(EMPTY_STREAM, 'a whole sentence'), { instant: true, charsPerFrame: 1 });
    expect(visibleText(state)).toBe('a whole sentence');
  });

  it('returns the same object once there is nothing left, so the caller can stop', () => {
    const state = advance(receiveChunk(EMPTY_STREAM, 'hi'), { charsPerFrame: 8 });
    expect(advance(state)).toBe(state);
  });

  it('still makes progress if the rate is nonsense — otherwise it never settles', () => {
    expect(visibleText(advance(receiveChunk(EMPTY_STREAM, 'hello'), { charsPerFrame: 0 }))).toBe('hello');
    expect(visibleText(advance(receiveChunk(EMPTY_STREAM, 'hello'), { charsPerFrame: Number.NaN }))).toBe('hello');
    expect(visibleText(advance(receiveChunk(EMPTY_STREAM, 'hello'), { charsPerFrame: -3 }))).toBe('hello');
  });
});

describe('replaceText', () => {
  it('overwrites the accumulated deltas with the authoritative message', () => {
    const streamed = play(['Hel', 'lo wrld'], 10);
    const authoritative = replaceText(streamed, 'Hello world');
    expect(authoritative.received).toBe('Hello world');
    expect(visibleText(advance(authoritative))).toBe('Hello world');
  });

  it('never takes characters back off the screen', () => {
    /* A duplicated chunk made the buffer longer than the truth. Recomputing
       `revealed` from the shorter text would look like a retraction. */
    const doubled = play(['Hello Hello'], 10);
    expect(doubled.revealed).toBe(11);
    const corrected = replaceText(doubled, 'Hello');
    expect(corrected.revealed).toBe(5);
    expect(visibleText(corrected)).toBe('Hello');
  });
});

describe('the caret', () => {
  it('is absent from a message loaded from history', () => {
    const state = settledStream('Yesterday, in three sentences.');
    expect(showCaret(state)).toBe(false);
    expect(isSettled(state)).toBe(true);
    expect(visibleText(state)).toBe('Yesterday, in three sentences.');
  });

  it('stays while the last chunk is still being revealed', () => {
    let state = endStream(receiveChunk(EMPTY_STREAM, 'a long tail of text'));
    expect(showCaret(state)).toBe(true);
    state = advance(state, { charsPerFrame: 4 });
    expect(showCaret(state)).toBe(true);
    state = advance(state, { instant: true });
    expect(showCaret(state)).toBe(false);
  });

  it('stays while the stream is open even with nothing left to show', () => {
    /* The model is thinking between two chunks. It has not finished. */
    const state = advance(receiveChunk(EMPTY_STREAM, 'One moment'), { instant: true });
    expect(state.revealed).toBe(state.received.length);
    expect(showCaret(state)).toBe(true);
  });

  it('is gone from an assistant message that produced no text at all', () => {
    /* Every tool call arrives as two empty messages. Neither is still typing. */
    expect(showCaret(endStream(EMPTY_STREAM))).toBe(false);
  });
});
