import { useEffect, useRef } from 'react';
import { Alert, Avatar, Field, Spinner, Tag } from '~ui';
import { useAttributeCatalog } from '../hooks/useAttributeCatalog';
import { useContactStore } from '../hooks/useContactStore';
import { contactIdentity } from '../lib/contactPanel';
import { PLATFORM_LABEL } from '../lib/platform';
import { AssigneeControl } from './AssigneeControl';
import { ContactAttributes } from './ContactAttributes';

export interface ContactPanelProps {
  /**
   * `Conversation.id` IS the contact id — the API's contract, not an
   * alias this module chose. `ThreadPane` says where that is written down.
   */
  contactId: string;
  /** People: Edit, on top of Inbox: View. Read-only without it. */
  canEdit: boolean;
  /**
   * Bumped by the `a` shortcut. Each new value moves focus into the assignee
   * control once the contact is on screen — the shortcut's whole job is to put
   * the operator's hands on that one field.
   */
  focusAssigneeToken?: number;
}

/**
 * The contact behind the open conversation: who they are, who owns them, the
 * note, and every attribute they carry.
 *
 * It lives inside the DETAIL pane rather than beside it. `SplitPane` has
 * exactly two panes — `side` and `children` — and there is no third; so the
 * thread and this panel share the detail pane, and `InspectorHost` decides
 * which of its two hosts they land in. Above 1280 that is an inline column and
 * below it a Drawer, with one body either way.
 *
 * Nothing here is imported from the contacts module, and that is not
 * incidental: what gets reused across modules is OPERATIONS, not components,
 * which is exactly why these were renamed with an `Inbox` prefix in an earlier
 * stage. Operation names are globally unique across every module document, so
 * this module cannot spread the contacts copies even where the underlying
 * fields are identical.
 */
export function ContactPanel({ contactId, canEdit, focusAssigneeToken = 0 }: ContactPanelProps) {
  const { contact, loading, error, writeProblems, setNote, setAttribute, deleteAttribute, setAssignee } =
    useContactStore(contactId);
  const catalog = useAttributeCatalog();

  /* The `a` shortcut. Two things about the timing are deliberate. It waits
     for the contact, because before that there is a spinner and no control.
     And it focuses on the next frame rather than in the effect: when the
     panel is a Drawer, this component mounts in the same commit as the
     Drawer's focus trap, and the trap's own initial focus — which runs after
     a child's effect — would take it straight back. A token that has already
     been honoured is not honoured again, so a later contact switch does not
     re-steal focus from wherever the operator has moved on to. */
  const assigneeRef = useRef<HTMLElement>(null);
  const honouredToken = useRef(0);
  const hasContact = contact !== null;
  useEffect(() => {
    if (!hasContact || focusAssigneeToken === 0 || honouredToken.current === focusAssigneeToken) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      honouredToken.current = focusAssigneeToken;
      assigneeRef.current?.querySelector<HTMLElement>('select')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [hasContact, focusAssigneeToken]);

  if (loading && !contact) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }
  if (!contact) {
    return (
      <div className="p-3">
        <Alert tone="danger" title="Could not load the contact">
          {error ?? 'The server answered with no contact for this conversation.'}
        </Alert>
      </div>
    );
  }

  const identity = contactIdentity(contact);

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="flex items-center gap-3">
        <Avatar src={contact.profilePictureUrl} name={contact.name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-text">{contact.name}</p>
          {contact.conversation ? (
            <p className="text-micro text-text-muted">{PLATFORM_LABEL[contact.conversation.platform]}</p>
          ) : null}
        </div>
      </section>

      {identity.length > 0 ? (
        <section className="flex flex-col gap-2">
          {identity.map((row) => (
            <div key={`${row.label}:${row.value}`}>
              <span className="block text-micro font-medium text-text-muted">{row.label}</span>
              <span className="block break-words text-meta text-text">{row.value}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section ref={assigneeRef}>
        <h3 className="mb-1 text-micro font-medium uppercase tracking-wide text-text-faint">Assignee</h3>
        <AssigneeControl contact={contact} disabled={!canEdit} onChange={setAssignee} />
        {contact.unhandledSwitchToHuman ? (
          <p className="mt-1.5">
            <Tag tone="warning">Asked for a human</Tag>
          </p>
        ) : null}
      </section>

      {/* `Field` saves on blur and shows a rejected save inline, which is the
          whole contract for this one: `contactSetNote` either succeeds or
          throws. An empty box means no note — the field is nullable and null is
          how it is cleared, there being no separate delete.
          `Field` has no read-only mode, so without the permission the note is
          text rather than a disabled box nobody can use. */}
      {canEdit ? (
        <Field
          label="Note"
          value={contact.note ?? ''}
          multiline
          placeholder="Anything the next operator should know"
          onSave={(next) => setNote(next.trim() === '' ? null : next)}
        />
      ) : (
        <section>
          <h3 className="mb-1 text-micro font-medium uppercase tracking-wide text-text-faint">Note</h3>
          <p className="whitespace-pre-wrap break-words text-meta text-text">
            {contact.note?.trim() ? contact.note : 'No note'}
          </p>
        </section>
      )}

      <ContactAttributes
        attributes={contact.attributes}
        catalog={catalog.byName}
        custom={catalog.custom}
        locale={catalog.locale}
        canEdit={canEdit}
        problems={writeProblems}
        onSave={(name, value, label) => {
          void setAttribute(name, value, label);
          /* Writing a name the bot did not have CREATES it, so the catalog this
             panel just read is out of date by exactly that attribute. */
          if (!catalog.byName.has(name)) catalog.refresh();
        }}
        onDelete={(name) => void deleteAttribute(name)}
      />
    </div>
  );
}
