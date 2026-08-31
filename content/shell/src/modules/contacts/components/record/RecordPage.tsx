import { useMemo } from 'react';
import { Alert, Button, EmptyState, IconLock, IconRefresh, PageBody, Skeleton, Tabs } from '~ui';
import type { Band } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import { useContactBookings } from '../../hooks/useContactBookings';
import { useContactMessages } from '../../hooks/useContactMessages';
import { useContactRecord } from '../../hooks/useContactRecord';
import { attributeMap } from '../../lib/attributeValue';
import { bindForContact, displayName, neighbours as neighboursOf } from '../../lib/contactFields';
import { livechatLink, type RecordTab } from '../../lib/contactsParams';
import type { Navigate } from '../../../types';
import type { ContactRecord, TeamMember } from '../../types';
import { isRestricted, phoneOf, usernameOf } from '../../types';
import { ExportButton } from '../io/ExportButton';
import { RecordActivity } from './RecordActivity';
import { RecordFields } from './RecordFields';
import { RecordHeader } from './RecordHeader';
import { RecordOverview } from './RecordOverview';

const TABS: { id: RecordTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'fields', label: 'Fields' },
  { id: 'activity', label: 'Activity' },
];

export interface RecordPageProps {
  contactId: string;
  tab: RecordTab;
  onTabChange: (tab: RecordTab) => void;
  onClose: () => void;
  canEdit: boolean;
  team: TeamMember[];
  catalog: AttributeCatalog;
  band: Band;
  /**
   * SEAM — the ids the list was showing, in its own order, so the ↑/↓ arrows
   * step through what the person was looking at. Optional: a pasted link opens
   * a record with no list behind it, and the arrows are simply absent.
   */
  order?: readonly string[];
  /** SEAM — open a neighbour. Without it the arrows do not render. */
  onOpenContact?: (contactId: string) => void;
  /** SEAM — one record cache: the list adopts whatever was edited here. */
  onPatched?: (contact: ContactRecord) => void;
  /** Somewhere else in the app, as an app-relative path ('/livechat?c=42'). */
  navigate: Navigate;
}

/**
 * One contact, full screen.
 *
 * The three tabs are three different promises and the page keeps them apart:
 * **Overview** is a CONVENTION about which eight fields matter, **Fields** is
 * the truth about what is stored, and **Activity** is the conversation — not a
 * history, because this API keeps none.
 *
 * All three data hooks are mounted here rather than inside the tabs, and that
 * is deliberate. Overview shows the last three messages and Activity shows all
 * of them; mounting the hook per tab would refetch the conversation on every
 * tab click and throw the paged history away each time. One contact, one query
 * each.
 *
 * Four states have to look like decisions rather than accidents, and each one
 * is here rather than inside a tab:
 * - a **restricted** contact (`UnavailableContact`) — every field is empty by
 *   design, so the page says so and offers nothing to click;
 * - a **missing conversation** — ordinary for a CSV import, so Live Chat is
 *   absent rather than disabled;
 * - a **contact with no name** — named "Unnamed contact", with the phone or the
 *   @handle beside it;
 * - a **deleted owner** — kept in the picker, labelled as gone.
 */
export function RecordPage({
  contactId,
  tab,
  onTabChange,
  onClose,
  canEdit,
  team,
  catalog,
  band,
  order,
  onOpenContact,
  onPatched,
  navigate,
}: RecordPageProps) {
  const record = useContactRecord(contactId, onPatched);
  const messages = useContactMessages(contactId);
  const bookings = useContactBookings(contactId);
  const contact = record.contact;

  /* Rebinding on a catalog change or a write to this contact, and nothing else:
     the catalog is fetched once per module mount and the attributes change only
     when something is saved, so this is stable across a hundred renders. */
  const bindings = useMemo(
    () => bindForContact(catalog.entries, contact?.attributes),
    [catalog.entries, contact?.attributes],
  );
  const values = useMemo(() => attributeMap(contact?.attributes), [contact?.attributes]);
  const neighbours = useMemo(() => neighboursOf(order, contactId), [order, contactId]);

  const tabStrip = <Tabs tabs={TABS} active={tab} onSelect={(next) => onTabChange(next as RecordTab)} />;

  if (record.error && !contact) {
    return (
      <>
        <SimpleHeader onClose={onClose} title="Contact" />
        <PageBody measure="app">
          <Alert
            tone="danger"
            title="Could not open this contact"
            action={
              <Button variant="secondary" size="sm" onClick={record.reload}>
                <IconRefresh size={14} /> Try again
              </Button>
            }
          >
            {record.error}
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!contact) {
    return (
      <>
        <SimpleHeader onClose={onClose} title="Contact" />
        <PageBody measure="app">
          <div className="flex flex-col gap-3" aria-label="Loading this contact">
            <Skeleton width="14rem" />
            <Skeleton variant="block" height="10rem" />
            <Skeleton variant="block" height="6rem" />
          </div>
        </PageBody>
      </>
    );
  }

  const restricted = isRestricted(contact);
  /* A conversation is what Live Chat opens, and a contact created through the
     API or a CSV import has none. Absent rather than disabled:
     a greyed-out button invites the question "why not?" on every record. */
  const onOpenLiveChat = restricted || !contact.conversation ? null : () => navigate(livechatLink(contact.id));

  return (
    <>
      <RecordHeader
        contact={contact}
        record={record}
        canEdit={canEdit}
        team={team}
        band={band}
        neighbours={onOpenContact ? neighbours : { prev: null, next: null, position: null, total: 0 }}
        onClose={onClose}
        onStep={(next) => onOpenContact?.(next)}
        onOpenLiveChat={onOpenLiveChat}
        /* SEAM — a stub to fill. A one-id selection IS "export this
           contact": `csvContactExportStartByIDsList` takes a list. */
        exportAction={<ExportButton segment={null} selectedIds={[contact.id]} catalog={catalog} />}
        tabs={restricted ? undefined : tabStrip}
      />

      {restricted ? (
        <PageBody measure="app">
          <EmptyState
            icon={<IconLock size={22} />}
            title="This contact is not yours to see"
            description="Your role only shows contacts assigned to you. Everything about this one — name, fields, conversation — comes back empty from the API, so there is nothing here to show."
          />
        </PageBody>
      ) : tab === 'activity' ? (
        <RecordActivity
          contactId={contact.id}
          contactName={displayName(contact.name, phoneOf(contact) ?? usernameOf(contact))}
          api={messages}
        />
      ) : (
        <PageBody measure="app">
          {record.error ? (
            <Alert tone="warning" title="This record may be out of date">
              {record.error}
            </Alert>
          ) : null}

          {tab === 'fields' ? (
            <RecordFields contact={contact} catalog={catalog} canEdit={canEdit} record={record} />
          ) : (
            <RecordOverview
              contact={contact}
              bindings={bindings}
              values={values}
              canEdit={canEdit}
              record={record}
              messages={messages}
              bookings={bookings}
              onOpenLiveChat={onOpenLiveChat}
            />
          )}
        </PageBody>
      )}
    </>
  );
}

/** The frame while there is no contact to put in it — loading, or failed. */
function SimpleHeader({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-raised px-gutter py-3">
      <Button variant="ghost" size="sm" onClick={onClose}>
        Contacts
      </Button>
      <span className="text-heading font-semibold text-text">{title}</span>
    </div>
  );
}
