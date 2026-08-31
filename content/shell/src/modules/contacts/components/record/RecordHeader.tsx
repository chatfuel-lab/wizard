import type { ReactNode } from 'react';
import {
  Avatar,
  Button,
  IconChevronDown,
  IconChevronLeft,
  IconChevronUp,
  IconExternal,
  IconLink,
  IconLock,
  PageHeader,
  Spinner,
  Tag,
  bandAtLeast,
  useToast,
  type Band,
} from '~ui';
import type { ContactRecordApi } from '../../hooks/useContactRecord';
import { displayName, type Neighbours } from '../../lib/contactFields';
import { contactLinkFor } from '../../lib/tableSelection';
import { platformOf } from '../../lib/platforms';
import { ago } from '../../lib/time';
import type { ContactRecord, TeamMember } from '../../types';
import { isRestricted, phoneOf, usernameOf } from '../../types';
import { InlineText } from './InlineText';
import { OwnerControl } from './OwnerControl';
import { StageControl } from './StageControl';

export interface RecordHeaderProps {
  contact: ContactRecord;
  record: ContactRecordApi;
  canEdit: boolean;
  team: TeamMember[];
  band: Band;
  neighbours: Neighbours;
  onClose: () => void;
  onStep: (contactId: string) => void;
  /** Null when there is no conversation to open. */
  onOpenLiveChat: (() => void) | null;
  /** SEAM — the export control, rendered as-is. It renders nothing today. */
  exportAction?: ReactNode;
  tabs?: ReactNode;
}

/**
 * Who this is, what state they are in, and every way out of the page.
 *
 * Stage and owner live in the header rather than on a tab because they are true
 * of the contact rather than of a tab: someone moving a deal along should not
 * have to remember which tab the control was on.
 *
 * The neighbour arrows are UP and DOWN, not left and right. They step through a
 * vertical list, which is what every record page that has them draws — and the
 * left chevron beside them already means "back to the list", so a second left
 * chevron meaning "previous row" would be one arrow with two jobs.
 *
 * A restricted contact (`UnavailableContact`) keeps the frame and loses every
 * control: nothing may be read off it and nothing may be written to it, so a
 * disabled stage picker over an empty value would only invite a click.
 */
export function RecordHeader({
  contact,
  record,
  canEdit,
  team,
  band,
  neighbours,
  onClose,
  onStep,
  onOpenLiveChat,
  exportAction,
  tabs,
}: RecordHeaderProps) {
  const toast = useToast();
  const restricted = isRestricted(contact);
  const channel = platformOf(contact.__typename);
  const wide = bandAtLeast(band, 'wide');
  const handle = phoneOf(contact) ?? usernameOf(contact);
  const name = displayName(contact.name, handle);

  const copyLink = async () => {
    /* An absolute URL, because the point of copying is to paste it somewhere
       that is not this app. `navigator.clipboard` is unavailable over plain
       http, so the toast carries the link itself when the write is refused —
       a "Copy" that silently does nothing is worse than no button. */
    const url = contactLinkFor(window.location.href, contact.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ tone: 'success', title: 'Link copied' });
    } catch {
      toast.show({ title: 'Copy this link', description: url, duration: 0 });
    }
  };

  return (
    <PageHeader
      title={
        <span className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <IconChevronLeft size={16} /> Contacts
          </Button>
          {neighbours.position !== null ? (
            <span className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Previous contact"
                title="Previous contact in the list"
                disabled={neighbours.prev === null}
                onClick={() => neighbours.prev !== null && onStep(neighbours.prev)}
              >
                <IconChevronUp size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Next contact"
                title="Next contact in the list"
                disabled={neighbours.next === null}
                onClick={() => neighbours.next !== null && onStep(neighbours.next)}
              >
                <IconChevronDown size={16} />
              </Button>
            </span>
          ) : null}
          <Avatar name={name} src={contact.profilePictureUrl ?? undefined} size={28} />
          {restricted || !canEdit ? (
            <span className="min-w-0 truncate">{name}</span>
          ) : (
            <InlineText
              size="title"
              value={contact.name ?? ''}
              placeholder="Unnamed contact"
              aria-label="Contact name"
              onSave={(next) => record.rename(next)}
            />
          )}
        </span>
      }
      meta={
        <span className="flex flex-wrap items-center gap-2">
          {restricted ? (
            <Tag>
              <span className="flex items-center gap-1">
                <IconLock size={12} /> Restricted
              </span>
            </Tag>
          ) : (
            <Tag tone={channel.tone}>{channel.label}</Tag>
          )}
          {contact.unreadMessagesCount > 0 ? <Tag tone="danger">{contact.unreadMessagesCount} unread</Tag> : null}
          {contact.unhandledSwitchToHuman ? <Tag tone="warning">Asked for a human</Tag> : null}
          {/* "loaded", not "of 50": the list pages, so this is how many rows it
              had in hand — not how many the filter matches. */}
          {neighbours.position !== null ? (
            <span className="text-micro text-text-faint">
              {neighbours.position} of {neighbours.total} loaded
            </span>
          ) : null}
          <span className="text-micro text-text-muted">Updated {ago(contact.updatedAt)}</span>
          {record.busy ? <Spinner size={14} /> : null}
        </span>
      }
      actions={
        restricted ? null : (
          <span className="flex flex-wrap items-center justify-end gap-2">
            <StageControl
              stage={contact.salesStageV2 ?? null}
              disabled={!canEdit}
              onChange={record.setStage}
              className="w-36"
            />
            <OwnerControl
              assignee={contact.assignee}
              team={team}
              disabled={!canEdit}
              onAssign={record.assignTo}
              onAssignAI={record.assignToAi}
              onUnassign={record.unassign}
              className="w-44"
            />
            {onOpenLiveChat ? (
              <Button variant="secondary" size="sm" onClick={onOpenLiveChat}>
                <IconExternal size={14} />
                {wide ? 'Open in Live Chat' : null}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Copy a link to this contact"
              onClick={() => void copyLink()}
            >
              <IconLink size={16} />
            </Button>
            {exportAction}
          </span>
        )
      }
      tabs={tabs}
    />
  );
}
