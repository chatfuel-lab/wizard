import { Button, Card, IconExternal, IconMessage, Tag } from '~ui';
import type { ContactBookingsApi } from '../../hooks/useContactBookings';
import type { ContactMessagesApi } from '../../hooks/useContactMessages';
import type { ContactRecordApi } from '../../hooks/useContactRecord';
import {
  CONTACT_FIELDS,
  DEAL_CARD_FIELDS,
  STAGE_META,
  stageLabel,
  stageMovedAgo,
  type ContactFieldBindings,
  type ContactFieldKey,
} from '../../lib/contactFields';
import { chatLabel } from '../../lib/contactsParams';
import { messageTimeLabel, recentMessages } from '../../lib/contactMessages';
import type { ContactRecord } from '../../types';
import { phoneOf } from '../../types';
import { BookingsCard } from './BookingsCard';
import { KeyFields } from './KeyFields';
import { ValueEditor } from './ValueEditor';

export interface RecordOverviewProps {
  contact: ContactRecord;
  bindings: ContactFieldBindings;
  /** The contact's attributes as name → raw string. */
  values: Record<string, string>;
  canEdit: boolean;
  record: ContactRecordApi;
  messages: ContactMessagesApi;
  bookings: ContactBookingsApi;
  /** Null only for a restricted contact — every other one has somewhere to go. */
  onOpenLiveChat: (() => void) | null;
  /** True when the contact already has a conversation; false starts one. */
  chatStarted: boolean;
}

/** Everything except the two money fields, which have their own card. */
const DETAIL_KEYS: readonly ContactFieldKey[] = CONTACT_FIELDS.map((spec) => spec.key).filter(
  (key) => !DEAL_CARD_FIELDS.includes(key),
);

/** How many messages a glance is worth. The Activity tab is one click away. */
const RECENT = 3;

/**
 * What a salesperson reads before they pick up the phone: who this is, what was
 * agreed, what is booked, and what was last said.
 *
 * One column, capped by `measure="app"` on the page body. A record split into
 * two columns reads well at 1600px and badly at 900, and this module can be
 * either — it is sized by its container, not by the window.
 *
 * The stage appears here as a TAG rather than a second `Select`. The editable
 * one is in the header, where it is visible from every tab; two live controls
 * for one value on one screen is a bug waiting for two people to disagree about
 * which one they clicked.
 */
export function RecordOverview({
  contact,
  bindings,
  values,
  canEdit,
  record,
  messages,
  bookings,
  onOpenLiveChat,
  chatStarted,
}: RecordOverviewProps) {
  const moved = stageMovedAgo(contact.lastSalesStageUpdateTime);
  const recent = recentMessages(messages.messages, RECENT);

  return (
    <div className="flex flex-col gap-gutter">
      <Card title="Details">
        <KeyFields
          keys={DETAIL_KEYS}
          bindings={bindings}
          values={values}
          contactPhone={phoneOf(contact)}
          canEdit={canEdit}
          onSave={record.setAttribute}
          onHold={record.holdField}
          onRelease={record.releaseField}
        />
      </Card>

      <Card title="Note" description="Anything the next person should know.">
        {canEdit ? (
          <ValueEditor
            kind="text"
            multiline
            value={contact.note ?? ''}
            label="Note"
            placeholder="No note yet"
            toStored={(input) => input}
            invalidMessage="That note cannot be saved."
            onCommit={(next) => record.setNote(next)}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-body text-text">
            {contact.note?.trim() ? contact.note : <span className="text-text-faint">No note</span>}
          </p>
        )}
      </Card>

      <Card
        title="Deal"
        actions={
          contact.salesStageV2 ? (
            <Tag tone={STAGE_META[contact.salesStageV2]?.tone ?? 'neutral'}>{stageLabel(contact.salesStageV2)}</Tag>
          ) : (
            <Tag>No stage</Tag>
          )
        }
        /* Only when the API has a timestamp to say it with. A contact that has
           never been moved carries null there, and deriving "moved today" from
           `updatedAt` would be a different fact wearing these words. */
        description={moved ?? undefined}
      >
        <KeyFields
          keys={DEAL_CARD_FIELDS}
          bindings={bindings}
          values={values}
          contactPhone={null}
          canEdit={canEdit}
          onSave={record.setAttribute}
          onHold={record.holdField}
          onRelease={record.releaseField}
        />
      </Card>

      <BookingsCard api={bookings} />

      <Card
        title="Last messages"
        actions={
          onOpenLiveChat ? (
            /* The same two words as the row menu and the header. A third
               wording for one action reads as a third action. */
            <Button variant="ghost" size="sm" onClick={onOpenLiveChat}>
              {chatStarted ? <IconExternal size={14} /> : <IconMessage size={14} />} {chatLabel(chatStarted)}
            </Button>
          ) : null
        }
      >
        {!messages.conversation ? (
          <p className="text-body text-text-muted">No conversation yet.</p>
        ) : recent.length === 0 ? (
          <p className="text-body text-text-muted">
            {messages.loading ? 'Reading the conversation…' : 'The conversation carries no messages.'}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {recent.map((message) => (
              <li key={message.id} className="flex items-baseline gap-3 py-1.5">
                <span className="w-14 shrink-0 text-micro text-text-faint">
                  {message.direction === 'in' ? 'They' : 'Us'}
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-text">
                  {message.text ?? <span className="italic text-text-muted">{message.kind}</span>}
                </span>
                <span className="shrink-0 text-micro text-text-faint">{messageTimeLabel(message.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
