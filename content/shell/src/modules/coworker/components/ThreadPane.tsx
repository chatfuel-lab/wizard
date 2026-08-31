import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  EmptyState,
  IconChevronDown,
  IconAssistant,
  MessageList,
  Spinner,
  TypingIndicator,
  useBand,
  type MessageListApi,
} from '~ui';
import { useCoworkerThread } from '../hooks/useCoworkerThread';
import { conversationTitle } from '../lib/titles';
import { buildThread, unreadAnchorRowId, type ThreadRow } from '../lib/threadRows';
import { CoworkerComposer } from './composer/CoworkerComposer';
import { MessageView } from './MessageView';
import { ApprovalCard } from './run/ApprovalCard';
import { QuickReplyBar } from './run/QuickReplyBar';
import { RejectedCard } from './run/RejectedCard';
import { RunGroup } from './thread/RunGroup';
import { StreamingMessage } from './thread/StreamingMessage';
import { ThreadStatus } from './thread/ThreadStatus';

export interface ThreadPaneProps {
  conversationId: string;
  /**
   * Get a conversation to send files into — here, always the open one. It is
   * threaded through to the composer because the composer's contract requires
   * it: attachment mutations need a `conversationID`, whichever screen the
   * composer is on.
   */
  ensureConversation: () => Promise<string | null>;
}

/**
 * The thread — the module.
 *
 * Everything above it is chrome around one question: what has been said, what
 * was done about it, and what happens if the operator types now. Three parts
 * meet here: this pane places the rows, the run layer draws what the assistant
 * did (`components/run/*`), the composer sends
 * (`components/composer/*`). All of them are presentational and all of
 * their data comes from `useCoworkerThread`, which this pane holds — one place
 * decides whether a send is allowed, so the rule about attachments during a
 * pending approval cannot be enforced here and forgotten there.
 *
 * The scroller is `~ui`'s `MessageList`, which is where the hard parts already
 * live: virtualization, day separators, an unread divider that is pinned rather
 * than chased, bottom anchoring that never moves a reader who scrolled up, and
 * scroll preservation when an older page is prepended. The version this
 * replaces was a `div` with `overflow-y-auto`, a `useLayoutEffect` that snapped
 * to the bottom whenever the reader happened to be within 80px of it, and a
 * "Load older messages" button that was the only way to reach history.
 *
 * There is no title bar over the thread. It printed the conversation's name,
 * and the conversation's name IS its first message — which is three lines
 * further down the same screen. The rail marks which chat is open, the page
 * header names the module, and the bar's Stop button became the composer's own
 * send button, which is where a person's hands already are.
 *
 * `compact` comes from `useBand()` — the module's own container, never the
 * window, because a module can be 700px wide inside a 2560px screen. The host
 * renders a `ModuleRoot`, which is what makes that answer honest: it is the
 * container-query scope and the observed element, and without one `useBand()`
 * returns the context default and every `@compact:` variant under it resolves
 * against the window.
 */
export function ThreadPane({ conversationId, ensureConversation }: ThreadPaneProps) {
  const band = useBand();
  const compact = band === 'compact';

  const {
    conversation,
    view,
    loading,
    loadingOlder,
    error,
    liveness,
    hasOlder,
    loadOlder,
    refresh,
    send,
    retry,
    respondApproval,
    approvalResponded,
    abortRejected,
    stop,
  } = useCoworkerThread(conversationId);

  const { rows, quickReplies } = useMemo(() => buildThread(view.entries), [view.entries]);

  /* Derived from the snapshot the query returned and read once per thread:
     `MessageList` pins the first non-null answer per `threadKey`, so the
     mark-as-read that fires the moment the operator opens the conversation
     cannot yank the divider out from under them. */
  const firstUnreadId = useMemo(
    () => unreadAnchorRowId(rows, conversation?.latestReadMessageIDFromAssistant),
    [rows, conversation?.latestReadMessageIDFromAssistant],
  );

  /* The newest thing in the thread, streams included — what "something arrived
     while you were reading further up" is counted against. */
  const latestKey = `${rows.at(-1)?.id ?? ''}:${view.streams.at(-1)?.messageID ?? ''}`;

  /* The other half of the list's central promise. `MessageList` refuses to drag
     a reader back to the bottom when something arrives, and owes them a way to
     go themselves: `onAtBottomChange` says whether the newest message is on
     screen and `ref.scrollToBottom` goes there. Between them that is the whole
     of a "3 new messages ↓" pill.

     This replaced a `useBottomAnchor` hook that hung an IntersectionObserver
     off a zero-height node smuggled into `footer` — which worked, and asked the
     viewport a question the scroller had already answered. */
  const listRef = useRef<MessageListApi>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);

  /* Counted on the key CHANGING, and only while the reader is away from the
     end — where the list has already brought the new row into view and there is
     nothing to tell them about. The first run after a thread opens does nothing
     because `atBottom` starts true. */
  const seen = useRef(latestKey);
  useEffect(() => {
    if (seen.current === latestKey) return;
    seen.current = latestKey;
    if (!atBottom) setMissed((count) => count + 1);
  }, [latestKey, atBottom]);

  /* Arriving at the end IS reading them, and it is cleared HERE rather than in
     the callback above: opening another conversation re-pins the list, and the
     list reports that from a layout effect — which runs before the counting
     effect above sees the new `atBottom`. Counted there and cleared here, the
     count a thread switch briefly produces is gone by the next commit; cleared
     only in the callback, it would survive as a "1 new message" pill waiting to
     appear the first time the reader scrolled up. */
  useEffect(() => {
    if (atBottom) setMissed(0);
  }, [atBottom]);

  /* 'smooth' because a person pressed it: the movement is what tells them where
     they went, and the list re-arms its own bottom anchoring on the way. */
  const jump = useCallback(() => listRef.current?.scrollToBottom('smooth'), []);

  if (loading && !conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!conversation) {
    return (
      <EmptyState icon={<IconAssistant />} title="Could not load the conversation" description={error ?? undefined} />
    );
  }

  const pending = conversation.pendingAction;
  const approval = pending?.__typename === 'CoworkerToolApprovalRequest' ? pending : null;
  const rejected = pending?.__typename === 'CoworkerUserMessageRejected' ? pending : null;

  /* A run to interrupt, which is not the same thing as `isAgentLoopActive`.
     While an approval is pending the loop is parked on a person and nothing is
     running — and the composer turns this into a Stop button that swallows
     Enter, which in that state would take away the very keystroke that rejects
     the batch. So the flag says "something is in flight", and a batch waiting
     on an answer is not. */
  const running = conversation.isAgentLoopActive && approval === null;

  /* Which run row, if any, is the one still happening: a group that is running
     stays open, and a finished one folds to its summary line. Only the last row
     can be it — anything after a run means the run produced it. */
  const liveRunId = liveness === 'working' && rows.at(-1)?.kind === 'run' ? rows.at(-1)!.id : null;

  /* Not a `useCallback`: `MessageList` calls it for the visible slice on every
     render regardless, so a stable identity would buy nothing. */
  /**
   * Every row is centred in the same column, and the column is a reading
   * measure rather than the width of the window.
   *
   * The thread used to fill whatever it was given: on a 1500px page an answer
   * ran the full width while the operator's own message sat pinned to the far
   * right edge, a screen and a half away from the text it was replying to. A
   * conversation is read top to bottom in one column — that is what every
   * assistant does, and it is not a stylistic choice, it is what makes two
   * consecutive turns legible as a pair.
   *
   * `max-w-prose`, not a pixel width: it is the same token the rest of the
   * product measures prose with, and in a narrow pane it simply never binds.
   */
  const renderRow = (row: ThreadRow): ReactNode => (
    <div className="mx-auto w-full max-w-prose">
      {row.kind === 'run' ? (
        <RunGroup steps={row.steps} conversationId={conversationId} compact={compact} running={row.id === liveRunId} />
      ) : (
        <MessageView
          message={row.entry.node}
          conversationId={conversationId}
          grouped={row.grouped}
          pending={row.entry.pending}
          failed={row.entry.failed}
          onRetry={() => retry(row.id)}
          compact={compact}
        />
      )}
    </div>
  );

  /* Both halves of the API's own rule, said once, before the operator types
     rather than after they press send: a plain message while an approval is
     pending IS the rejection of the whole batch, and attachments sent then are
     refused outright with `AttachmentInvalid`. */
  const blocked = approval
    ? {
        text: false,
        attachments: true,
        reason:
          'Replying now rejects the actions waiting for your approval — and files cannot be sent until it is answered.',
      }
    : undefined;

  /* Streams and the typing indicator go in the list's footer, where they stick
     to the bottom exactly like a message — including on an EMPTY thread, which
     `MessageList` used to replace wholesale with its `empty` state. On an
     assistant that was the worst possible place to lose them: the first answer
     to a brand-new conversation is the one moment where "is anything
     happening?" is the whole question. */
  const live =
    view.streams.length > 0 ? (
      <>
        {view.streams.map((stream) => (
          <StreamingMessage key={stream.messageID} text={stream.text} compact={compact} />
        ))}
      </>
    ) : liveness === 'working' ? (
      <TypingIndicator />
    ) : null;

  return (
    <>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <MessageList<ThreadRow>
          ref={listRef}
          items={rows}
          renderItem={renderRow}
          onAtBottomChange={setAtBottom}
          /* The conversation id and nothing else. It re-anchors the unread
             divider and jumps to the newest message, so it must change when the
             operator opens another chat and must NOT change when a message
             arrives — which rules out anything derived from the contents. */
          threadKey={conversationId}
          firstUnreadId={firstUnreadId}
          aria-label={`Conversation: ${conversationTitle(conversation)}`}
          /* Paging is automatic on approach and latched by the list, so it
             fires once per arrival rather than once per scroll event. The
             button stays because `onReachTop` is a wheel affordance — someone
             holding PageUp needs something to press. History pages until a page
             comes back shorter than `first`; `hasNextPage` is unreliable after
             the first page and the reducer already ignores it. */
          onReachTop={loadOlder}
          header={
            hasOlder ? (
              <div className="flex justify-center py-2">
                {loadingOlder ? (
                  <Spinner size={16} />
                ) : (
                  <Button size="sm" variant="secondary" onClick={loadOlder}>
                    Load older messages
                  </Button>
                )}
              </div>
            ) : null
          }
          footer={live}
          empty={<EmptyState icon={<IconAssistant />} title="Ask the Coworker anything" />}
        />

        {/* The list correctly refuses to drag a reader back to the bottom when
            something arrives; this is the other half of that decision — the
            only thing on screen that says something did. */}
        {!atBottom && missed > 0 ? (
          <button
            type="button"
            onClick={jump}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-micro font-medium text-accent-fg shadow-overlay transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-accent-hover"
          >
            <IconChevronDown size={12} />
            {missed === 1 ? '1 new message' : `${missed} new messages`}
          </button>
        ) : null}
      </div>

      <ThreadStatus liveness={liveness} error={error} onRefresh={refresh} onStop={stop} />

      {/* Everything below the scroller is `shrink-0` by being outside it: the
          list is the `flex-1`, so a grown composer and a tall approval card
          take their height from it rather than competing for the same pixels.

          All of it is centred on the same `max-w-prose` column as the messages.
          A thread that reads down the middle of the page and a composer pinned
          across the whole width of it are two different documents — the box you
          type into has to sit under the words it answers. */}
      <div className="mx-auto flex w-full max-w-prose flex-col">
        {quickReplies.length > 0 ? (
          <div className="px-gutter pb-2">
            <QuickReplyBar
              replies={quickReplies}
              onPick={send}
              disabled={approval !== null || liveness === 'working'}
            />
          </div>
        ) : null}

        {approval ? (
          <div className="px-gutter pb-2">
            <ApprovalCard
              conversationId={conversationId}
              request={approval}
              responded={approvalResponded}
              onRespond={respondApproval}
              compact={compact}
            />
          </div>
        ) : null}

        {rejected ? (
          <div className="px-gutter pb-2">
            <RejectedCard rejected={rejected} onAbort={abortRejected} onResend={send} />
          </div>
        ) : null}

        <CoworkerComposer
          conversationId={conversationId}
          onSendText={send}
          busy={running}
          onStop={stop}
          blocked={blocked}
          ensureConversation={ensureConversation}
        />
      </div>
    </>
  );
}
