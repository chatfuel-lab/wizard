import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, Input, Label, Textarea } from '~ui';
import { hasErrors, normalizePhone, validateNewContact, type NewContactDraft } from '../../lib/bulk';
import type { NewContactInput } from '../../hooks/useRowMutations';

export interface NewContactDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewContactInput) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
  /** Opens the new contact once it exists. */
  onCreated: (contactId: string) => void;
  /** True while a conversation filter is on — see the note in the dialog. */
  underConversationFilter: boolean;
}

const EMPTY: NewContactDraft = { phone: '', name: '', note: '' };

/**
 * The only create this API has.
 *
 * `whatsappContactCreateV2` is it: WhatsApp only, no Instagram, no Facebook, no
 * widget, and no generic contact. Saying so plainly is the point of the dialog
 * — a "New contact" button that silently only works for one channel is a
 * support ticket, and the alternative (hiding the button) would leave a CRM
 * with no way to add anybody.
 *
 * The second thing it says out loud: the new contact has `conversation: null`
 * until it has chatted, so it is invisible to the chat engine. If the current
 * filter is one only that engine can answer, the contact will be created
 * successfully and then not appear in the list — which looks exactly like a
 * failure unless it was predicted.
 */
export function NewContactDialog({
  open,
  onClose,
  onCreate,
  onCreated,
  underConversationFilter,
}: NewContactDialogProps) {
  const [draft, setDraft] = useState<NewContactDraft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY);
    setTouched(false);
    setSaving(false);
    setFailure(null);
  }, [open]);

  const errors = validateNewContact(draft);
  const blocked = hasErrors(errors);

  const submit = async () => {
    setTouched(true);
    if (blocked || saving) return;
    setSaving(true);
    setFailure(null);
    const result = await onCreate({
      phone: normalizePhone(draft.phone),
      name: draft.name,
      note: draft.note,
    });
    setSaving(false);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    onClose();
    onCreated(result.id);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New WhatsApp contact"
      size="sm"
      initialFocusRef={phoneRef}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={() => void submit()}>
            Create contact
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-meta text-text-muted">
          WhatsApp only. The API has no create for Instagram, Facebook, TikTok or the web widget — contacts on those
          channels appear the first time they message the bot.
        </p>

        <div className="flex flex-col gap-1">
          <Label htmlFor="new-contact-phone">Phone number</Label>
          <Input
            id="new-contact-phone"
            ref={phoneRef}
            value={draft.phone}
            inputMode="tel"
            placeholder="+4915112345678"
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && errors.phone !== null}
          />
          {touched && errors.phone ? <p className="text-meta text-danger">{errors.phone}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="new-contact-name">Name</Label>
          <Input
            id="new-contact-name"
            value={draft.name}
            placeholder="Optional"
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
          {errors.name ? <p className="text-meta text-danger">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="new-contact-note">Note</Label>
          <Textarea
            id="new-contact-note"
            rows={3}
            value={draft.note}
            placeholder="Optional"
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
          {errors.note ? <p className="text-meta text-danger">{errors.note}</p> : null}
        </div>

        {underConversationFilter ? (
          <Alert tone="info">
            The filter on this list is one only the conversation engine can answer, and a brand new contact has no
            conversation yet — so it will be created but will not show up here until it has chatted. Clear the filter to
            see it.
          </Alert>
        ) : null}

        {failure ? (
          <Alert tone="danger" title="Could not create the contact">
            {failure}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
