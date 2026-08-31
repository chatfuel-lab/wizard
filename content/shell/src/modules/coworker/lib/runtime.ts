import { isTypingTarget } from '~ui';
import {
  CoworkerConversationCreatedDocument,
  CoworkerFrontendStateReplyDocument,
  CoworkerUpdatesDocument,
} from '~api/generated/coworker/graphql';
import type { ShellBridge } from '../../shellApi';
import type { ApiClient, ConvState, CoworkerEvent } from '../types';
import { actionGate, askedRecently, classifyAction, DEFERRED_LABEL } from './frontendActions';

/**
 * The module's one live connection to the assistant, and the one thing that
 * answers on its behalf — held outside React, ref-counted, shared by every
 * surface that shows a thread.
 *
 * The surface is the full page at `/coworker`, and the shell remounts it on
 * every module and bot switch. Anything owned by a component dies with it, and
 * three things here cannot die:
 *
 * - **The socket.** One `coworkerAnyConversationUpdated` covers every
 *   conversation on the bot. Two mounts must not mean two subscriptions.
 * - **The answer to `get_frontend_state`.** The assistant's tool blocks ~10s
 *   waiting for one reply to one `requestID`; a second reply loses the race and
 *   gets `FrontendStateRequestNotFound`. Exactly one thing may answer, and it
 *   cannot be a component that might be mounted twice.
 * - **Which frontend actions have already run.** The replay guard has to
 *   outlive a remount, or navigating away and back re-runs the navigation that
 *   brought you there.
 */

export interface CoworkerEventBus {
  onEvent: (listener: (event: CoworkerEvent) => void) => () => void;
  onCreated: (listener: (conv: ConvState) => void) => () => void;
  onReconnect: (listener: () => void) => () => void;
  onError: (listener: (message: string) => void) => () => void;
}

/** What became of a `navigate` the assistant asked for. */
export interface ActionOutcome {
  messageID: string;
  conversationID: string;
  ok: boolean;
  /** One line for the thread: "Opened Deals", "There is no “Billing” page here". */
  label: string;
  /** Present while the move is still the last one made. */
  undo?: () => void;
  /** Set when the gate declined; the thread offers a button instead. */
  deferred?: string;
}

/** The outcome plus what it would take to run it — kept inside the runtime. */
interface StoredOutcome extends ActionOutcome {
  parameters: Record<string, unknown>;
}

export interface CoworkerRuntime {
  readonly botId: string;
  readonly client: ApiClient;
  readonly bus: CoworkerEventBus;
  /** Installed by the page inside the shell; null in an embed. */
  setShell(shell: ShellBridge | null): void;
  hasShell(): boolean;
  /** Which conversation the operator can actually see right now. */
  setVisibleConversation(id: string | null): void;
  /** Run a `navigate` the gate previously declined, on the operator's click. */
  runDeferred(messageID: string): void;
  outcome(messageID: string): ActionOutcome | undefined;
  onOutcome(listener: (outcome: ActionOutcome) => void): () => void;
}

interface Entry {
  runtime: CoworkerRuntime;
  refs: number;
  dispose: () => void;
  release: number | null;
}

/**
 * Long enough to survive StrictMode's double mount and a module switch, short
 * enough that a bot switch does not leave the old bot's socket open for a
 * meaningful time.
 */
const RELEASE_GRACE_MS = 30_000;

const entries = new Map<string, Entry>();

/* Identity, not equality: a new client object is a new socket, and two
   sockets are two runtimes however alike their configuration reads. */
const clientIds = new WeakMap<object, string>();
let nextClientId = 0;
const keyOf = (client: ApiClient, botId: string): string => {
  let id = clientIds.get(client);
  if (id === undefined) {
    id = String(nextClientId++);
    clientIds.set(client, id);
  }
  return `${id}:${botId}`;
};

function createRuntime(client: ApiClient, botId: string): { runtime: CoworkerRuntime; dispose: () => void } {
  const eventListeners = new Set<(event: CoworkerEvent) => void>();
  const createdListeners = new Set<(conv: ConvState) => void>();
  const reconnectListeners = new Set<() => void>();
  const errorListeners = new Set<(message: string) => void>();
  const outcomeListeners = new Set<(outcome: ActionOutcome) => void>();

  const outcomes = new Map<string, StoredOutcome>();
  let shell: ShellBridge | null = null;
  let visible: string | null = null;
  let lastRanAt: number | null = null;

  const emitOutcome = (outcome: StoredOutcome) => {
    outcomes.set(outcome.messageID, outcome);
    outcomeListeners.forEach((listener) => listener(outcome));
  };

  /**
   * An undo is a closure over "the address we left", and it stops being true the
   * moment anything else moves the app: a second navigation, or the operator
   * clicking somewhere themselves. Offering it after that would send them
   * somewhere they never were, so exactly one undo is ever live and it is
   * revoked here rather than guessed at in the view.
   */
  let liveUndo: { messageID: string; url: string } | null = null;

  const revokeUndo = () => {
    if (liveUndo === null) return;
    const stale = outcomes.get(liveUndo.messageID);
    liveUndo = null;
    if (stale?.undo === undefined) return;
    const { undo: _dropped, ...rest } = stale;
    emitOutcome(rest);
  };

  const currentUrl = () => `${window.location.pathname}${window.location.search}`;

  const onRouteChange = () => {
    if (liveUndo !== null && currentUrl() !== liveUndo.url) revokeUndo();
  };
  window.addEventListener('popstate', onRouteChange);

  const perform = (messageID: string, conversationID: string, parameters: Record<string, unknown>) => {
    if (!shell) {
      /* The page alone, or an embed: there is no shell to move. Say so rather
         than silently swallowing a navigation the assistant announced. */
      emitOutcome({
        messageID,
        conversationID,
        ok: false,
        label: describeTarget(parameters),
        deferred: 'Open the assistant in the dashboard to follow this',
        parameters,
      });
      return;
    }
    revokeUndo();
    const result = shell.run({ actionType: 'navigate', parameters });
    lastRanAt = Date.now();
    emitOutcome({
      messageID,
      conversationID,
      ok: result.ok,
      label: result.label,
      undo: result.undo,
      parameters,
    });
    /* The address as it stands AFTER the move is what makes this undo still
       true; anything else landing there revokes it. */
    liveUndo = result.undo === undefined ? null : { messageID, url: currentUrl() };
  };

  /** When the operator last spoke in a conversation — see `askedRecently`. */
  const lastAskedAt = new Map<string, number>();

  const handleMessage = (event: Extract<CoworkerEvent, { __typename: 'CoworkerMessageAdded' }>) => {
    const { message, conversationID } = event;
    if (message.role === 'user') lastAskedAt.set(conversationID, Date.now());
    for (const call of message.toolCalls ?? []) {
      if (call.__typename !== 'CoworkerFrontendAction') continue;
      if (classifyAction(call.actionType) !== 'navigate') continue;
      const parameters = (call.parameters ?? {}) as Record<string, unknown>;
      const now = Date.now();
      const gate = actionGate({
        live: true,
        onScreen: conversationID === visible,
        alreadyRan: outcomes.has(message.id),
        /* Their hand is still on the keyboard because they just typed the
           request. That is consent, not an interruption. */
        typing: typingNow() && !askedRecently(lastAskedAt.get(conversationID) ?? null, now),
        now,
        lastRanAt,
      });
      if (gate.run) {
        perform(message.id, conversationID, parameters);
      } else if (gate.reason !== 'replay') {
        emitOutcome({
          messageID: message.id,
          conversationID,
          ok: false,
          label: describeTarget(parameters),
          deferred: DEFERRED_LABEL[gate.reason],
          parameters,
        });
      }
    }
  };

  const answerScreenContext = (event: Extract<CoworkerEvent, { __typename: 'CoworkerFrontendStateRequested' }>) => {
    /* The screen is the same whichever conversation asked, so every request is
       answered — including one from a thread the operator is not reading. What
       must not happen is answering twice. */
    const data = shell
      ? { app: 'chatfuel-shell', botID: botId, ...shell.snapshot() }
      : { app: 'chatfuel-shell', botID: botId, note: 'the assistant is open on its own page' };
    client
      .mutate(CoworkerFrontendStateReplyDocument, {
        conversationID: event.conversationID,
        requestID: event.requestID,
        data,
      })
      .catch(() => {
        /* Late or unknown requestID — the tool call simply fails, harmlessly. */
      });
  };

  const offUpdates = client.subscribe(
    CoworkerUpdatesDocument,
    { botID: botId },
    {
      next: (data) => {
        const event = data.coworkerAnyConversationUpdated;
        if (event.__typename === 'CoworkerMessageAdded') handleMessage(event);
        if (event.__typename === 'CoworkerFrontendStateRequested') answerScreenContext(event);
        eventListeners.forEach((listener) => listener(event));
      },
      error: (err: unknown) => emitError(err),
    },
  );
  const offCreated = client.subscribe(
    CoworkerConversationCreatedDocument,
    { botID: botId },
    {
      next: (data) => createdListeners.forEach((l) => l(data.coworkerConversationCreated)),
      error: (err: unknown) => emitError(err),
    },
  );
  const offReconnect = client.onReconnect(() => reconnectListeners.forEach((l) => l()));

  function emitError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    errorListeners.forEach((listener) => listener(message));
  }

  const attach =
    <T>(set: Set<T>) =>
    (listener: T) => {
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    };

  const runtime: CoworkerRuntime = {
    botId,
    client,
    bus: {
      onEvent: attach(eventListeners),
      onCreated: attach(createdListeners),
      onReconnect: attach(reconnectListeners),
      onError: attach(errorListeners),
    },
    setShell(next) {
      shell = next;
    },
    hasShell: () => shell !== null,
    setVisibleConversation(id) {
      visible = id;
    },
    runDeferred(messageID) {
      const stored = outcomes.get(messageID);
      if (stored === undefined || stored.deferred === undefined) return;
      /* The operator asked for it by clicking, so no gate: not live, not on
         screen and mid-typing were all reasons not to move on our own. */
      perform(messageID, stored.conversationID, stored.parameters);
    },
    outcome: (messageID) => outcomes.get(messageID),
    onOutcome: attach(outcomeListeners),
  };

  return {
    runtime,
    dispose: () => {
      offUpdates();
      offCreated();
      offReconnect();
      window.removeEventListener('popstate', onRouteChange);
      eventListeners.clear();
      createdListeners.clear();
      reconnectListeners.clear();
      errorListeners.clear();
      outcomeListeners.clear();
    },
  };
}

function typingNow(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return isTypingTarget(
    active.tagName,
    active.isContentEditable,
    active instanceof HTMLInputElement ? active.type : undefined,
  );
}

function describeTarget(parameters: Record<string, unknown>): string {
  const key = parameters.pathKey;
  return typeof key === 'string' && key.trim() !== '' ? `Open ${key}` : 'Open a page';
}

/**
 * Acquire the runtime for this (client, bot). The first caller opens the
 * subscriptions; the last one to release closes them after a grace period, so a
 * remount — StrictMode's, or the shell's on a module switch — reuses the live
 * one instead of tearing the socket down and building it again.
 */
export function acquireCoworkerRuntime(
  client: ApiClient,
  botId: string,
): { runtime: CoworkerRuntime; release: () => void } {
  const key = keyOf(client, botId);
  let entry = entries.get(key);
  if (entry === undefined) {
    const created = createRuntime(client, botId);
    entry = { runtime: created.runtime, refs: 0, dispose: created.dispose, release: null };
    entries.set(key, entry);
  }
  const held = entry;
  held.refs += 1;
  if (held.release !== null) {
    window.clearTimeout(held.release);
    held.release = null;
  }
  let released = false;
  return {
    runtime: held.runtime,
    release: () => {
      if (released) return;
      released = true;
      held.refs -= 1;
      if (held.refs > 0) return;
      held.release = window.setTimeout(() => {
        if (held.refs > 0) return;
        held.dispose();
        entries.delete(key);
      }, RELEASE_GRACE_MS);
    },
  };
}
