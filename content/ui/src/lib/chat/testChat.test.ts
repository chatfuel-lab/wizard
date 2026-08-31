import { describe, expect, it } from 'vitest';
import {
  anonymousKey,
  initialSessionState,
  isHandedOff,
  isReady,
  markFailed,
  mergeRows,
  optimisticRow,
  parseTime,
  RESTART_SKEW_MS,
  sessionReducer,
  clockTime,
  splitTyping,
  visibleAfter,
  type TestChatRow,
  type TestChatSession,
  type TestChatSessionState,
} from './testChat';

const t = (s: number) => `2026-08-17T10:00:${String(s).padStart(2, '0')}.000Z`;
const ms = (s: number) => new Date(t(s)).getTime();

/** A row as a host's `toRow` would hand it over. */
function row(over: Partial<TestChatRow> = {}): TestChatRow {
  const key = over.key ?? 'c1';
  const sentTime = over.sentTime ?? t(0);
  return {
    id: `id-${key}`,
    key,
    kind: 'in',
    text: 'hi',
    sentTime,
    at: parseTime(sentTime),
    updatedAt: sentTime,
    senderLabel: 'You (test)',
    fromBot: false,
    supported: true,
    ...over,
  };
}

const botRow = (over: Partial<TestChatRow> = {}) => row({ kind: 'out', fromBot: true, senderLabel: 'Mia', ...over });

const typingRow = (over: Partial<TestChatRow> = {}) => row({ kind: 'typing', fromBot: true, text: '', ...over });

describe('row identity', () => {
  it('a synthetic key is unique per call, so two anonymous rows never collide', () => {
    expect(anonymousKey(t(0))).not.toBe(anonymousKey(t(0)));
  });
  it('an unparseable time is 0 rather than NaN — it sorts first, it does not throw', () => {
    expect(parseTime('garbage')).toBe(0);
    expect(clockTime('garbage')).toBe('');
    expect(clockTime(t(0))).not.toBe('');
  });
  it('the optimistic row is pending, mine, and keyed by the clientId', () => {
    const optimistic = optimisticRow('c9', 'hello', new Date(t(3)));
    expect(optimistic).toMatchObject({ key: 'c9', id: null, kind: 'in', pending: true, fromBot: false, text: 'hello' });
    expect(optimistic.at).toBe(ms(3));
  });
});

describe('mergeRows', () => {
  it('replaces the optimistic row with its echo by key even when the echo has no id', () => {
    const merged = mergeRows([optimisticRow('c1', 'hi', new Date(t(0)))], [row({ id: null })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ key: 'c1', id: null, text: 'hi' });
    expect(merged[0]!.pending).toBeFalsy();
    // then the subscription delivers the same message with an id — still one row, now with it
    const again = mergeRows(merged, [row({ id: 'm1' })]);
    expect(again).toHaveLength(1);
    expect(again[0]!.id).toBe('m1');
  });
  it('recognises the same wire id under another key', () => {
    const first = row({ key: 'm9', id: 'm9' });
    const merged = mergeRows([first], [row({ key: 'late-client', id: 'm9' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.key).toBe('m9');
  });
  it('keeps the newer updatedAt between two real records', () => {
    const newer = row({ text: 'newer', updatedAt: t(5) });
    const older = row({ text: 'older', updatedAt: t(1) });
    expect(mergeRows([newer], [older])[0]!.text).toBe('newer');
    expect(mergeRows([older], [newer])[0]!.text).toBe('newer');
  });
  it('orders by sentTime then insertion; ties keep arrival order', () => {
    const a = row({ key: 'a', sentTime: t(2), at: ms(2) });
    const b = row({ key: 'b', sentTime: t(1), at: ms(1) });
    const c = row({ key: 'c', sentTime: t(2), at: ms(2) });
    expect(mergeRows([], [a, b, c]).map((r) => r.key)).toEqual(['b', 'a', 'c']);
  });
  it('holds one typing hint and drops it when a later bot message lands', () => {
    const first = typingRow({ key: 'ty1', sentTime: t(1), at: ms(1), until: t(6) });
    const second = typingRow({ key: 'ty2', sentTime: t(2), at: ms(2), until: t(9) });
    let rows = mergeRows([], [first, second]);
    expect(rows.filter((r) => r.kind === 'typing')).toHaveLength(1);
    expect(rows[0]!.until).toBe(t(9));
    // my own message does not clear it
    rows = mergeRows(rows, [row({ key: 'me', sentTime: t(3), at: ms(3) })]);
    expect(rows.some((r) => r.kind === 'typing')).toBe(true);
    // the bot's reply does
    rows = mergeRows(rows, [botRow({ key: 'out1', sentTime: t(4), at: ms(4) })]);
    expect(rows.some((r) => r.kind === 'typing')).toBe(false);
    expect(rows.map((r) => r.key)).toEqual(['me', 'out1']);
  });
  it('an older typing hint does not replace a newer one', () => {
    const newer = typingRow({ key: 'ty2', sentTime: t(2), at: ms(2), until: t(9) });
    const older = typingRow({ key: 'ty1', sentTime: t(1), at: ms(1), until: t(6) });
    expect(mergeRows([newer], [older])[0]!.until).toBe(t(9));
  });
  it('is a copy, never the input', () => {
    const rows = [row()];
    expect(mergeRows(rows, [])).not.toBe(rows);
  });
  it('markFailed marks only the pending row with that key', () => {
    const rows = [optimisticRow('c1', 'hi'), row({ key: 'c2' })];
    const marked = markFailed(rows, 'c1', 'nope');
    expect(marked[0]!.failure).toBe('nope');
    expect(marked[1]!.failure).toBeUndefined();
    expect(markFailed(marked, 'c2', 'x')[1]!.failure).toBeUndefined();
  });
});

describe('typing, hand-off and the watermark', () => {
  it('splitTyping shows the hint only while until is ahead of now', () => {
    const rows = mergeRows([], [typingRow({ key: 'ty', until: t(5) }), row({ key: 'c1' })]);
    expect(splitTyping(rows, ms(1))).toMatchObject({ typing: true, typingUntil: ms(5) });
    expect(splitTyping(rows, ms(1)).messages.map((r) => r.key)).toEqual(['c1']);
    expect(splitTyping(rows, ms(6)).typing).toBe(false);
  });
  it('isHandedOff is true once the trio has landed', () => {
    const rows = [row(), botRow({ key: 's1', kind: 'system', systemKind: 'summary' })];
    expect(isHandedOff(rows)).toBe(false);
    expect(isHandedOff([...rows, botRow({ key: 's2', kind: 'system', systemKind: 'handoff' })])).toBe(true);
  });
  it('visibleAfter hides rows older than since minus the skew, keeps pending rows', () => {
    const old = row({ key: 'old', sentTime: t(0), at: ms(0) });
    const edge = row({ key: 'edge', sentTime: t(9), at: ms(9) });
    const fresh = row({ key: 'fresh', sentTime: t(12), at: ms(12) });
    const pending = optimisticRow('p', 'x', new Date(t(0)));
    const since = new Date(ms(9) + RESTART_SKEW_MS).toISOString();
    expect(visibleAfter([old, edge, fresh, pending], since).map((r) => r.key)).toEqual(['edge', 'fresh', 'p']);
    expect(visibleAfter([old], null)).toHaveLength(1);
    expect(visibleAfter([old], 'garbage')).toHaveLength(1);
  });
});

describe('sessionReducer', () => {
  const session = (over: Partial<TestChatSession> = {}): TestChatSession => ({
    conversationID: 'wa_1',
    startedAt: t(0),
    ...over,
  });

  it('idle → starting → ready, adopting the watermark', () => {
    let s = sessionReducer(initialSessionState(), { type: 'start', generation: 1 });
    expect(s).toMatchObject({ status: 'starting', generation: 1 });
    s = sessionReducer(s, { type: 'started', generation: 1, session: session() });
    expect(s).toMatchObject({ status: 'ready', visibleSince: t(0) });
    expect(isReady(s)).toBe(true);
  });
  it('a late reply of an older generation is ignored', () => {
    let s = sessionReducer(initialSessionState(), { type: 'start', generation: 1 });
    s = sessionReducer(s, { type: 'start', generation: 2 }); // restart before the first answered
    expect(s.generation).toBe(2);
    expect(sessionReducer(s, { type: 'started', generation: 1, session: session() })).toBe(s);
    expect(sessionReducer(s, { type: 'failed', generation: 1, message: 'x' })).toBe(s);
    s = sessionReducer(s, { type: 'started', generation: 2, session: session({ conversationID: 'wa_2' }) });
    expect(s.session?.conversationID).toBe('wa_2');
  });
  it('a start failure lands in error with the sentence; a restart clears it', () => {
    let s = sessionReducer(initialSessionState(), { type: 'start', generation: 1 });
    s = sessionReducer(s, { type: 'failed', generation: 1, message: 'This flow has no starting point' });
    expect(s).toMatchObject({ status: 'error', error: 'This flow has no starting point' });
    expect(isReady(s)).toBe(false);
    s = sessionReducer(s, { type: 'start', generation: 2 });
    expect(s).toMatchObject({ status: 'starting', error: null });
  });
  it('a restart keeps the previous session on screen until the new one is minted', () => {
    let s = sessionReducer(initialSessionState(), { type: 'start', generation: 1 });
    s = sessionReducer(s, { type: 'started', generation: 1, session: session() });
    s = sessionReducer(s, { type: 'start', generation: 2 });
    expect(s.session?.conversationID).toBe('wa_1');
    expect(s.status).toBe('starting');
    s = sessionReducer(s, { type: 'started', generation: 2, session: session({ startedAt: t(5) }) });
    expect(s.visibleSince).toBe(t(5));
  });
  it('sending is a ready ⇄ sending flip and nothing else', () => {
    const ready: TestChatSessionState = { ...initialSessionState(), status: 'ready' };
    expect(sessionReducer(ready, { type: 'sendStarted' }).status).toBe('sending');
    expect(sessionReducer({ ...ready, status: 'sending' }, { type: 'sendSettled' }).status).toBe('ready');
    expect(sessionReducer({ ...ready, status: 'starting' }, { type: 'sendStarted' }).status).toBe('starting');
    expect(isReady({ ...ready, status: 'sending' })).toBe(false);
  });
  it('reset drops the session and bumps the generation', () => {
    let s = sessionReducer(initialSessionState(), { type: 'start', generation: 1 });
    s = sessionReducer(s, { type: 'started', generation: 1, session: session() });
    s = sessionReducer(s, { type: 'reset', generation: 2 });
    expect(s).toMatchObject({ status: 'idle', session: null, visibleSince: null, generation: 2 });
    // and the old start's answer is dead
    expect(sessionReducer(s, { type: 'started', generation: 1, session: session() })).toBe(s);
  });
});
