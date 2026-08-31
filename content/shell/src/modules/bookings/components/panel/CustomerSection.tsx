import { useReducer, useState } from 'react';
import { Avatar, Button, Field, IconExternal, Tag } from '~ui';
import type { BookingUpdateInput } from '~api/generated/bookings/graphql';
import { useSettings } from '../../BookingsSettingsContext';
import { useContactCreate } from '../../hooks/useContactCreate';
import { bookingInputOf } from '../../lib/bookingInput';
import { errorMessage } from '../../lib/errors';
import { customerFields, openWizard, resolvedCustomer, stepValid, wizardReducer } from '../../lib/wizardStore';
import type { BookingRecord } from '../../types';
import { CustomerPicker } from '../wizard/CustomerPicker';

export interface CustomerSectionProps {
  booking: BookingRecord;
  canEdit: boolean;
  saving: boolean;
  onSetNote: (note: string) => Promise<void>;
  /** A full-replace update carrying the new customer; the section builds it from the record. */
  onAttach: (input: BookingUpdateInput) => Promise<{ ok: boolean; error: unknown }>;
}

const PLATFORM_LABEL: Record<string, string> = {
  WhatsappContact: 'WhatsApp',
  InstagramContact: 'Instagram',
  FacebookContact: 'Facebook',
  TikTokContact: 'TikTok',
  WidgetContact: 'Web widget',
  UnavailableContact: 'Restricted',
};

/**
 * Who the booking is for — three identities the API keeps, one section:
 *
 * - a REAL contact (`contact`): avatar, name, phone, the contact's note
 *   (`BookingContactSetNote`), and "Open in Live Chat" — `/livechat?c=` when
 *   a conversation exists, `/livechat?contact=` (the inbox starts one) when
 *   not;
 * - an INLINE contact (`inlineContact`): name, phone, its own note
 *   (`BookingInlineContactSetNote`) — no chat, so no link;
 * - NONE: "Attach a customer" opens the same `CustomerPicker` the wizard uses
 *   (a small local wizard state, customer part only) and writes it with a
 *   full-replace update — `bookingUpdateV2` has no partial form.
 *
 * On a WhatsApp-connected bot the API turns an inline input into a real
 * contact on the way in, so the record that comes back may
 * be the first kind even though the second was sent; both render.
 */
export function CustomerSection({ booking, canEdit, saving, onSetNote, onAttach }: CustomerSectionProps) {
  const contact = booking.contact;
  const inline = booking.inlineContact;

  if (contact) {
    const phone = contact.__typename === 'WhatsappContact' ? contact.phone : null;
    const href = contact.conversation
      ? `/livechat?c=${encodeURIComponent(contact.conversation.id)}`
      : `/livechat?contact=${encodeURIComponent(contact.id)}`;
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar src={contact.profilePictureUrl ?? undefined} name={contact.name || '?'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{contact.name || 'Unnamed contact'}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              <Tag tone={contact.__typename === 'WhatsappContact' ? 'success' : 'neutral'}>
                {PLATFORM_LABEL[contact.__typename] ?? contact.__typename}
              </Tag>
              {phone ? <span>+{phone.replace(/^\+/, '')}</span> : null}
            </div>
          </div>
          <a
            href={href}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-accent hover:bg-surface-hover focus-visible:focus-ring"
          >
            {contact.conversation ? 'Open in Live Chat' : 'Start a chat'}
            <IconExternal size={12} />
          </a>
        </div>
        {canEdit ? (
          <Field
            label="Contact note"
            multiline
            value={contact.note ?? ''}
            onSave={onSetNote}
            placeholder="Anything the next person should know — lives on the contact"
          />
        ) : contact.note ? (
          <p className="whitespace-pre-wrap text-sm text-text-muted">{contact.note}</p>
        ) : null}
      </div>
    );
  }

  if (inline) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar name={inline.name || '?'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{inline.name || 'Unnamed'}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              <Tag>Inline contact</Tag>
              <span>{inline.phoneNumber}</span>
            </div>
          </div>
        </div>
        {canEdit ? (
          <Field
            label="Note"
            multiline
            value={inline.note ?? ''}
            onSave={onSetNote}
            placeholder="Anything the specialist should know"
          />
        ) : inline.note ? (
          <p className="whitespace-pre-wrap text-sm text-text-muted">{inline.note}</p>
        ) : null}
        <p className="text-xs text-text-faint">
          No chat contact — the phone number is the identity. The note is shared by every booking with this number.
        </p>
      </div>
    );
  }

  return <AttachCustomer booking={booking} canEdit={canEdit} saving={saving} onAttach={onAttach} />;
}

function AttachCustomer({ booking, canEdit, saving, onAttach }: Omit<CustomerSectionProps, 'onSetNote'>) {
  const settings = useSettings();
  const createContact = useContactCreate();
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useReducer(wizardReducer, null, () =>
    openWizard({
      service: null,
      specialistId: null,
      span: null,
      contactId: null,
      todayKey: '',
      countryCode: settings.state.countryCode,
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = stepValid(state, 'customer') && resolvedCustomer(state).kind !== 'skipped';

  const attach = async () => {
    const customer = resolvedCustomer(state);
    if (customer.kind !== 'existing' && customer.kind !== 'new') return;
    setBusy(true);
    setError(null);
    try {
      const input = bookingInputOf(booking);
      if (customer.kind === 'existing') {
        input.contactID = customer.contact.contactId;
        input.inlineContact = null;
      } else if (customer.draft.createContact) {
        input.contactID = await createContact(customer.draft);
        input.inlineContact = null;
      } else {
        input.contactID = null;
        input.inlineContact = customerFields(customer.draft);
      }
      const result = await onAttach(input);
      if (result.ok) setOpen(false);
      else if (result.error) setError(errorMessage(result.error));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-border px-3 py-2">
        <span className="text-sm text-text-muted">No customer — shows as “Walk-in”.</span>
        {canEdit ? (
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => setOpen(true)}>
            Attach a customer
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-border p-3">
      <CustomerPicker state={state} dispatch={dispatch} disabled={busy || saving} autoFocus />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" loading={busy} disabled={!valid || saving} onClick={() => void attach()}>
          Attach
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
