import { IconCopy, IconExternal, IconLink, IconUser, type MenuItem } from '~ui';
import type { ContactRow, TeamMember } from '../../types';
import { phoneOf, usernameOf } from '../../types';
import type { BulkAction } from '../../lib/bulk';
import { STAGE_META, STAGE_ORDER } from '../../lib/tableColumns';

export interface RowMenuOptions {
  /** The rows the menu acts on: one row, or the whole selection. */
  targets: ContactRow[];
  canEdit: boolean;
  team: TeamMember[];
  onOpen: (contactId: string) => void;
  onLiveChat: (contactId: string) => void;
  onCopy: (text: string, what: string) => void;
  onLink: (contactId: string) => void;
  onAction: (action: BulkAction, targets: ContactRow[]) => void;
}

/**
 * The row menu, for both the right-click and the `⋯` button.
 *
 * One list for both, because a menu the mouse can reach and a menu the keyboard
 * can reach must offer the same things — and because the right-click convention
 * (inside the selection acts on all of it, outside it acts on that row alone)
 * is decided in `lib/tableSelection.ts` and arrives here as `targets`. This
 * file only asks how many there are.
 *
 * Entries that cannot work are not rendered rather than rendered disabled:
 * there is no phone to copy on an Instagram contact, and a greyed "Copy phone"
 * teaches nothing. The stage and owner sections are dropped entirely without
 * the Edit permission.
 */
export function buildRowMenu({
  targets,
  canEdit,
  team,
  onOpen,
  onLiveChat,
  onCopy,
  onLink,
  onAction,
}: RowMenuOptions): MenuItem[] {
  const first = targets[0];
  if (!first) return [];
  const many = targets.length > 1;
  const suffix = many ? ` (${targets.length})` : '';
  const items: MenuItem[] = [];

  if (!many) {
    items.push(
      { id: 'open', label: 'Open record', icon: <IconExternal size={14} />, onSelect: () => onOpen(first.id) },
      {
        id: 'livechat',
        label: 'Open in Live Chat',
        icon: <IconExternal size={14} />,
        /* The conversation id IS the contact id on this API, so the deep link
           needs nothing else. A contact that has never chatted opens an empty
           thread rather than an error. */
        onSelect: () => onLiveChat(first.id),
      },
      { kind: 'separator', id: 'sep-open' },
    );

    const phone = phoneOf(first);
    const handle = usernameOf(first);
    if (phone) {
      items.push({
        id: 'copy-phone',
        label: 'Copy phone',
        icon: <IconCopy size={14} />,
        onSelect: () => onCopy(phone, 'Phone number'),
      });
    } else if (handle) {
      items.push({
        id: 'copy-handle',
        label: 'Copy @handle',
        icon: <IconCopy size={14} />,
        onSelect: () => onCopy(`@${handle}`, 'Handle'),
      });
    }
    items.push({
      id: 'copy-link',
      label: 'Copy link to contact',
      icon: <IconLink size={14} />,
      onSelect: () => onLink(first.id),
    });
  }

  if (!canEdit) return items;

  items.push({ kind: 'separator', id: 'sep-edit' }, { kind: 'label', id: 'label-stage', label: `Stage${suffix}` });
  for (const stage of STAGE_ORDER) {
    items.push({
      id: `stage-${stage}`,
      label: STAGE_META[stage].label,
      /* A tick, not a disabled row: with several targets it means "all of them
         are already here", which is exactly what stops the click being wasted. */
      checked: targets.every((row) => row.salesStageV2 === stage),
      onSelect: () => onAction({ kind: 'stage', stage }, targets),
    });
  }

  items.push({ kind: 'separator', id: 'sep-owner' }, { kind: 'label', id: 'label-owner', label: `Owner${suffix}` });
  items.push(
    {
      id: 'owner-ai',
      label: 'Fuely AI',
      icon: <IconUser size={14} />,
      onSelect: () => onAction({ kind: 'assign', to: { kind: 'ai' } }, targets),
    },
    {
      id: 'owner-none',
      label: 'Unassign',
      onSelect: () => onAction({ kind: 'assign', to: { kind: 'none' } }, targets),
    },
  );
  for (const member of team) {
    items.push({
      id: `owner-${member.user.id}`,
      label: member.user.name,
      onSelect: () =>
        onAction(
          { kind: 'assign', to: { kind: 'user', userAccountId: member.user.id, name: member.user.name } },
          targets,
        ),
    });
  }

  return items;
}
