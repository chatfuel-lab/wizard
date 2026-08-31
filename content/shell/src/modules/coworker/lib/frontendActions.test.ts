import { describe, expect, it } from 'vitest';
import { approveMessages, message, runMessages, toolStep } from './samples';
import type { MessageNode } from '../types';
import {
  ACTION_COOLDOWN_MS,
  actionGate,
  askedRecently,
  ASKED_RECENTLY_MS,
  classifyAction,
  quickRepliesFrom,
  quickReplyText,
  type ActionGateInput,
} from './frontendActions';

describe('classifyAction', () => {
  it('knows the two the server actually sends', () => {
    expect(classifyAction('navigate')).toBe('navigate');
    expect(classifyAction('suggest_quick_reply')).toBe('quick-reply');
  });

  it('calls everything else unknown rather than guessing', () => {
    expect(classifyAction('open_modal')).toBe('unknown');
    expect(classifyAction('')).toBe('unknown');
  });
});

describe('quickReplyText', () => {
  it('takes a non-empty string and nothing else', () => {
    expect(quickReplyText({ text: 'Option 1' })).toBe('Option 1');
    expect(quickReplyText({ text: '   ' })).toBeNull();
    expect(quickReplyText({ text: 7 })).toBeNull();
    expect(quickReplyText({})).toBeNull();
  });
});

const OK: ActionGateInput = {
  live: true,
  onScreen: true,
  alreadyRan: false,
  typing: false,
  now: 1_000_000,
  lastRanAt: null,
};

describe('actionGate', () => {
  it('runs a fresh live action for the conversation on screen', () => {
    expect(actionGate(OK)).toEqual({ run: true });
  });

  it('never runs one read out of history — the reload-renavigates bug', () => {
    expect(actionGate({ ...OK, live: false })).toEqual({ run: false, reason: 'history' });
  });

  it('never runs the same message twice', () => {
    expect(actionGate({ ...OK, alreadyRan: true })).toEqual({ run: false, reason: 'replay' });
  });

  it('does not yank the screen for a conversation nobody is reading', () => {
    expect(actionGate({ ...OK, onScreen: false })).toEqual({ run: false, reason: 'background' });
  });

  it('counts a recent ask in the same conversation as consent to move', () => {
    // The sentence they were typing IS the request; the guard must not fire on it.
    expect(askedRecently(OK.now - 1_000, OK.now)).toBe(true);
    expect(askedRecently(OK.now - ASKED_RECENTLY_MS, OK.now)).toBe(false);
    expect(askedRecently(null, OK.now)).toBe(false);
  });

  it('waits while the operator is typing', () => {
    expect(actionGate({ ...OK, typing: true })).toEqual({ run: false, reason: 'typing' });
  });

  it('lets one through per cooldown', () => {
    const justRan = { ...OK, lastRanAt: OK.now - 500 };
    expect(actionGate(justRan)).toEqual({ run: false, reason: 'cooldown' });
    expect(actionGate({ ...justRan, now: OK.now + ACTION_COOLDOWN_MS })).toEqual({ run: true });
  });

  it('checks replay before anything else, so a re-read never reports a new reason', () => {
    expect(actionGate({ ...OK, alreadyRan: true, live: false, typing: true })).toEqual({
      run: false,
      reason: 'replay',
    });
  });
});

/* Oldest first, the way the thread holds them; the demo data is newest-first. */
const runThread = () => [...runMessages()].reverse() as unknown as MessageNode[];

describe('quickRepliesFrom', () => {
  it('reads the run the assistant left standing, in the order it offered them', () => {
    expect(quickRepliesFrom(runThread())).toEqual([
      'Nudge the stuck deals',
      'Show me the 3 unassigned',
      'Leave them for now',
    ]);
  });

  it('drops them the moment anything else is the newest message', () => {
    const answered = [...runThread(), message('cw-run-m10', 'user', 'Yes please', 0)] as unknown as MessageNode[];
    expect(quickRepliesFrom(answered)).toEqual([]);
  });

  it('is empty for a thread that never offered any', () => {
    expect(quickRepliesFrom([])).toEqual([]);
    expect(quickRepliesFrom(approveMessages() as unknown as MessageNode[])).toEqual([]);
  });

  it('stops at a tool step, so an offer from earlier in the run never resurfaces', () => {
    const stale = [...runThread(), toolStep('cw-run-m11', 'chatfuel_gql-list_deals', 0)] as unknown as MessageNode[];
    expect(quickRepliesFrom(stale)).toEqual([]);
  });
});
