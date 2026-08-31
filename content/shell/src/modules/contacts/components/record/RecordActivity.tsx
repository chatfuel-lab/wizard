import { Alert, Button, EmptyState, IconMessage, MessageBubble, MessageList, Skeleton, Spinner, SystemLine } from '~ui';
import type { ContactMessagesApi } from '../../hooks/useContactMessages';
import { messageTimeLabel, type RecordMessage } from '../../lib/contactMessages';

export interface RecordActivityProps {
  contactId: string;
  contactName: string;
  api: ContactMessagesApi;
  /** Null when there is no conversation to open. */
}

/**
 * The Activity tab: the conversation, and an honest sentence about what else
 * this tab could have been.
 *
 * There is no field-change history in this API — no audit log, no per-attribute
 * revisions, no `createdAt` on a contact. So an "Activity" tab that looked like
 * an activity feed would be inventing one. It is the conversation plus the
 * timestamps the contact itself carries, and it says so once, at the top,
 * rather than leaving a person to work it out from an empty list.
 *
 * Only the nine text-bearing message types carry text. Everything else renders
 * as its kind — "Image message" — derived from `__typename`. That is not a
 * shortcut: modelling ~70 payload shapes is the inbox's job, and a record page
 * that crashed on a typename it had never seen would be worse than one that
 * names it.
 */
export function RecordActivity({ contactId, contactName, api }: RecordActivityProps) {
  if (api.loading && api.messages.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-gutter">
        <Skeleton variant="text" lines={2} />
        <Skeleton variant="block" height="6rem" />
      </div>
    );
  }

  if (api.error) {
    return (
      <div className="p-gutter">
        <Alert tone="danger" title="Could not read this conversation">
          {api.error}
        </Alert>
      </div>
    );
  }

  if (!api.conversation) {
    return (
      <div className="p-gutter">
        <EmptyState icon={<IconMessage size={22} />} title="No conversation yet" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList<RecordMessage>
        items={api.messages}
        renderItem={(message) => <ActivityRow message={message} />}
        /* The contact id and nothing else: it must change when another record
           is opened and must NOT change when a message arrives. */
        threadKey={contactId}
        aria-label={`Conversation with ${contactName}`}
        onReachTop={api.loadOlder}
        header={
          api.hasOlder ? (
            <div className="flex justify-center py-2">
              {api.loadingOlder ? (
                <Spinner size={16} />
              ) : (
                <Button size="sm" variant="secondary" onClick={api.loadOlder}>
                  Load older messages
                </Button>
              )}
            </div>
          ) : (
            <p className="py-2 text-center text-micro text-text-faint">
              {api.messages.length === 0 ? 'No messages.' : ''}
            </p>
          )
        }
        empty={
          <div className="p-gutter">
            <EmptyState
              icon={<IconMessage size={22} />}
              title="Nothing said yet"
              description="The conversation exists but carries no messages."
            />
          </div>
        }
        className="px-gutter"
      />
    </div>
  );
}

function ActivityRow({ message }: { message: RecordMessage }) {
  if (message.system) return <SystemLine>{message.kind}</SystemLine>;
  return (
    <MessageBubble
      direction={message.direction}
      time={messageTimeLabel(message.at)}
      senderName={message.senderName ?? undefined}
    >
      {message.text !== null ? (
        <span className="whitespace-pre-wrap break-words">{message.text}</span>
      ) : (
        <span className="italic text-text-muted">{message.kind}</span>
      )}
    </MessageBubble>
  );
}
