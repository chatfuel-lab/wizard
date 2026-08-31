/**
 * What to do when the assistant sends a `CoworkerFrontendAction` — a tool call
 * addressed to the interface rather than to the account.
 *
 * Two exist, both seen in practice:
 *
 *   navigate            { pathKey: 'Deals' }   → the shell moves
 *   suggest_quick_reply { text: 'Option 1' }   → a reply chip under the message
 *
 * Everything here is the *policy*, kept pure so it can be tested in a node-only
 * vitest: the decision of whether an action may run at all. The dangerous part
 * of an executing action is not the navigation, it is running one at the wrong
 * moment — on a page reload, from a conversation the operator is not reading,
 * or while they are mid-sentence in a text field.
 */

import type { MessageNode, ToolCall } from '../types';

type ActionKind = 'navigate' | 'quick-reply' | 'unknown';

export function classifyAction(actionType: string): ActionKind {
  if (actionType === 'navigate') return 'navigate';
  if (actionType === 'suggest_quick_reply') return 'quick-reply';
  return 'unknown';
}

export function quickReplyText(parameters: Record<string, unknown>): string | null {
  const text = parameters.text;
  return typeof text === 'string' && text.trim() !== '' ? text : null;
}

/** One auto-navigation at a time; a burst of them is a hijacked browser. */
export const ACTION_COOLDOWN_MS = 2_000;

/**
 * How long asking counts as consent.
 *
 * The typing guard exists so the app never yanks out from under someone
 * mid-sentence. But the sentence they were typing is usually the request
 * itself: they type "open my contacts", press Enter, and their hand is still on
 * the keyboard when the answer lands a second later. Refusing to move then is
 * the guard firing on exactly the case it was built to allow.
 *
 * So typing only blocks an action in a conversation the operator has not just
 * spoken to. Two minutes matches the agent loop's own TTL — the longest a
 * request can plausibly still be running.
 */
export const ASKED_RECENTLY_MS = 120_000;

export function askedRecently(lastAskedAt: number | null, now: number): boolean {
  return lastAskedAt !== null && now - lastAskedAt < ASKED_RECENTLY_MS;
}

export interface ActionGateInput {
  /** The action arrived on the live socket, not from a fetched history page. */
  live: boolean;
  /** It belongs to the conversation currently on screen. */
  onScreen: boolean;
  /** This exact message has been acted on before. */
  alreadyRan: boolean;
  /** The operator is typing somewhere right now. */
  typing: boolean;
  now: number;
  lastRanAt: number | null;
}

type ActionGate = { run: true } | { run: false; reason: 'replay' | 'background' | 'history' | 'typing' | 'cooldown' };

/**
 * `history` is the one that will ship as a bug if it is an afterthought: every
 * page of messages a thread loads contains every navigation the assistant ever
 * performed, so a client that acts on what it reads re-navigates on every
 * reload, forever. Actions run from the socket or not at all.
 */
export function actionGate(input: ActionGateInput): ActionGate {
  if (input.alreadyRan) return { run: false, reason: 'replay' };
  if (!input.live) return { run: false, reason: 'history' };
  if (!input.onScreen) return { run: false, reason: 'background' };
  if (input.typing) return { run: false, reason: 'typing' };
  if (input.lastRanAt !== null && input.now - input.lastRanAt < ACTION_COOLDOWN_MS) {
    return { run: false, reason: 'cooldown' };
  }
  return { run: true };
}

/** What the thread shows in place of an action it declined to run. */
export const DEFERRED_LABEL: Record<Exclude<ActionGate, { run: true }>['reason'], string> = {
  replay: 'Already done',
  history: 'Was opened earlier',
  background: 'Waiting for you to open this chat',
  typing: 'Ready when you are',
  cooldown: 'Ready when you are',
};

/** The text a `suggest_quick_reply` offers; null for every other tool call. */
function offerOf(call: ToolCall): string | null {
  if (call.__typename !== 'CoworkerFrontendAction') return null;
  if (classifyAction(call.actionType) !== 'quick-reply') return null;
  return quickReplyText(call.parameters);
}

/**
 * The options standing open right now, in the order the assistant offered them.
 *
 * One action per option — three arrived in a row in practice — each on its
 * own message with empty content, so the offer is a RUN of messages at the end
 * of the thread rather than a field on one of them. Reading it backwards from
 * the newest message is what makes it expire on its own: the moment anything
 * else lands, an answer, a tool step, or the operator's own reply, the walk
 * stops at it and the chips are gone. A thread scrolled back through history
 * therefore shows no chips at all, which is right — those choices were made
 * long ago.
 *
 * Takes messages in display order, oldest first, as the thread holds them.
 */
export function quickRepliesFrom(messages: readonly MessageNode[]): string[] {
  const replies: string[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const calls = messages[i]?.toolCalls ?? [];
    /* 0 or 1 element, per guide.md; a message carrying anything else is not
       part of an offer. */
    const offer = calls.length === 1 ? offerOf(calls[0]!) : null;
    if (offer === null) break;
    replies.unshift(offer);
  }
  return replies;
}
