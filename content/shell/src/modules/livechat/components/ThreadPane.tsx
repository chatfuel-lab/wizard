import { useMemo } from 'react';
import { Button, EmptyState, IconInbox, InspectorHost, MessageList, Spinner, TypingIndicator } from '~ui';
import { useConversation } from '../hooks/useConversation';
import { useThreadActions } from '../hooks/useThreadActions';
import type { ConversationPatch, StageChange } from '../lib/conversationPatch';
import { lastInboundTime, sendWindow } from '../lib/sendWindow';
import { firstUnreadClientId, toThreadRows, type ThreadRow } from '../lib/threadRows';
import { ContactPanel } from './ContactPanel';
import { FlowPicker } from './FlowPicker';
import { MessageView } from './MessageView';
import { ThreadComposer } from './ThreadComposer';
import { ThreadHeaderBar } from './ThreadHeaderBar';

export interface ThreadPaneProps {
  conversationId: string | null;
  canEdit: boolean;
  /** People: View — without it there is no contact panel and no button for it. */
  canViewContact: boolean;
  /** People: Edit. */
  canEditContact: boolean;
  /**
   * The contact panel, controlled from above. It used to be this pane's own
   * state; it moved up when `a` and the palette needed to open it, and there
   * is one owner rather than a prop that fights a state.
   */
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  /** Bumped by `a` — the panel focuses its assignee control when it changes. */
  assignRequest: number;
  /** Bumped by the palette's "Take over" — the same call as the header button. */
  takeOverRequest: number;
  /** The close-to-flow picker, controlled for the same reason as the panel. */
  flowPickerOpen: boolean;
  onFlowPickerOpenChange: (open: boolean) => void;
  /** A lifecycle answer the list should also apply — see `lib/conversationPatch.ts`. */
  onConversationChanged: (patch: ConversationPatch) => void;
  /** "Close as won / lost" answered — the contact's stage, for the list row. */
  onStageChanged: (change: StageChange) => void;
}

const renderRow = (row: ThreadRow) => <MessageView entry={row.entry} />;

/**
 * The right-hand pane: who this is, what was said, the box to reply in, and —
 * from this stage — the contact behind it.
 *
 * The header and the scroller are `~ui`'s. Both existed twice at one point — once
 * in `content/ui/src/chat/` and once here — because this module shipped
 * before the design system had a thread in it. The differences were not
 * cosmetic: the local list re-rendered every message in a thread on every
 * event, had no day separators and no unread divider, and snapped to the bottom
 * whenever the reader happened to be within 80px of it — including on their own
 * scroll.
 */
export function ThreadPane({
  conversationId,
  canEdit,
  canViewContact,
  canEditContact,
  panelOpen,
  onPanelOpenChange,
  assignRequest,
  takeOverRequest,
  flowPickerOpen,
  onFlowPickerOpenChange,
  onConversationChanged,
  onStageChanged,
}: ThreadPaneProps) {
  const {
    conversation,
    entries,
    loading,
    error,
    typing,
    hasOlder,
    loadingOlder,
    loadOlder,
    send,
    sendAttachment,
    sendTemplate,
    takeOver,
    closeToFlow,
    setSalesStage,
  } = useConversation(conversationId, { onConversationChanged, onStageChanged, canEdit });

  const rows = useMemo(() => toThreadRows(entries), [entries]);

  /* Read on render rather than on a timer. The window closes exactly 24 hours
     after the contact's last message and this component re-renders on every
     event in the thread; a countdown that ticks the composer shut on the second
     would cost a per-second render on every open conversation to be right a few
     seconds sooner than the next keystroke already makes it. */
  const gate = useMemo(
    () => (conversation ? sendWindow(conversation.platform, lastInboundTime(entries), Date.now()) : { open: true }),
    [conversation, entries],
  );

  /* Derived from the snapshot the query returned, and read once per thread:
     `MessageList` pins the first non-null answer per `threadKey`, so the
     mark-as-read that fires the moment the operator looks at the thread cannot
     yank the divider out from under them. */
  const firstUnreadId = useMemo(() => firstUnreadClientId(entries, conversation?.read), [entries, conversation?.read]);

  const name = conversation?.contact.name ?? '';

  const { handOver, closeAs, onTakeOver } = useThreadActions({
    conversation,
    canEdit,
    name,
    takeOverRequest,
    takeOver,
    closeToFlow,
    setSalesStage,
    onFlowPickerOpenChange,
  });

  return (
    /* A row, because the contact panel is the third column this layout does not
       have. `SplitPane` takes exactly two panes — `side` and `children` — so the
       panel lives INSIDE the detail pane beside the thread, and `InspectorHost`
       is what turns it into a Drawer below 1280. The flow builder's inspector
       made the same call for the same reason.

       Every empty and loading state of the thread is a branch INSIDE the left
       column rather than an early return from this component. An early return
       unmounts the panel on every conversation switch — `useConversation`
       clears the conversation while the next one loads — and `InspectorHost`
       moves focus into its column each time it opens, so choosing a chat would
       take focus off the list and drop it in the contact card. */
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!conversationId ? (
          <EmptyState
            icon={<IconInbox />}
            title="Pick a conversation"
            description="Select a chat on the left to read and reply."
          />
        ) : loading && !conversation ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : !conversation ? (
          <EmptyState icon={<IconInbox />} title="Could not load the conversation" description={error ?? undefined} />
        ) : (
          <>
            <ThreadHeaderBar
              conversation={conversation}
              name={name}
              canEdit={canEdit}
              canViewContact={canViewContact}
              panelOpen={panelOpen}
              onPanelOpenChange={onPanelOpenChange}
              onTakeOver={onTakeOver}
              closeAs={closeAs}
              onFlowPickerOpenChange={onFlowPickerOpenChange}
            />

            <MessageList<ThreadRow>
              items={rows}
              renderItem={renderRow}
              /* The conversation id and nothing else. It re-anchors the unread
                 divider and jumps to the newest message, so it must change when
                 the reader opens another thread and must NOT change when a
                 message arrives — which rules out anything derived from the
                 contents. */
              threadKey={conversationId}
              firstUnreadId={firstUnreadId}
              aria-label={`Conversation with ${name}`}
              /* Paging is automatic on approach, and latched by the list so it
                 fires once per arrival rather than once per scroll event. The
                 button stays because `onReachTop` is a mouse-wheel affordance: a
                 keyboard reader holding PageUp needs something to press. */
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
              footer={typing ? <TypingIndicator /> : null}
              empty={<EmptyState icon={<IconInbox />} title="No messages yet" description={`Say hello to ${name}.`} />}
            />

            {/* Its wrapper is `shrink-0` because the scroller above it is
                `flex-1`: without it a grown textarea and the list compete for
                the same pixels and the composer is the one that loses them. */}
            <ThreadComposer
              conversationId={conversation.id}
              platform={conversation.platform}
              canEdit={canEdit}
              gate={gate}
              contactName={name}
              onSendText={send}
              onSendAttachment={sendAttachment}
              onSendTemplate={sendTemplate}
            />

            <FlowPicker
              open={flowPickerOpen}
              onClose={() => onFlowPickerOpenChange(false)}
              platform={conversation.platform}
              contactName={name}
              onPick={handOver}
            />
          </>
        )}
      </div>

      {/* `inlineFrom` is the host's default, 'inline' — 1280 up. Below that the
          thread is the whole point of the pane and a 24rem column would leave it
          unreadable, so the panel becomes a Drawer over it.

          `contactId={conversationId}` is not a shortcut to be fixed. The API's
          own contract is that `Conversation.id` equals the contact id — see
          "Data model" in `modules/livechat/skill/references/guide.md` — and every
          `conversationID` argument takes the contact id for the same reason. Reading `conversation.contact.id` here instead
          would make the panel wait for the thread to load and gain nothing:
          the two are one string. `setSalesStage` reads `contact.id` because it
          already has the conversation in hand, not because the ids can differ. */}
      {conversationId ? (
        <InspectorHost open={panelOpen} onClose={() => onPanelOpenChange(false)} title="Contact" width="panel">
          <ContactPanel contactId={conversationId} canEdit={canEditContact} focusAssigneeToken={assignRequest} />
        </InspectorHost>
      ) : null}
    </div>
  );
}
