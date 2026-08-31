import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  DataCards,
  DataTable,
  DropdownMenu,
  EmptyState,
  IconLink,
  IconMail,
  IconMore,
  IconPlus,
  IconUsers,
  Select,
  Spinner,
  Tag,
  useBand,
  useCopyToClipboard,
  useToast,
  type DataTableColumn,
  type MenuItem,
  type ToastApi,
} from '~ui';
import type { AssignableRole, TeamBot, TeamInvite, TeamMember } from '../../types';
import { assignableRoles, canRemove, canResetPassword, canTransfer, roleLabel, roleTone } from '../../lib/roles';
import { useTeam, type TeamValue } from '../TeamContext';
import { messageForError } from '../../lib/copy';
import { absoluteTime, relativeTime } from '../lib/relativeTime';
import { botAccessOf, isBusy, rowKey, teamRows, type TeamRow } from '../lib/teamStore';

/** What a row menu asks the page to open. The dialogs live in `TeamBody`. */
export type TeamAction =
  | { kind: 'remove'; member: TeamMember }
  | { kind: 'revoke'; invite: TeamInvite }
  | { kind: 'recovery'; member: TeamMember }
  | { kind: 'transfer'; userId: string | null }
  | { kind: 'leave' }
  | { kind: 'invite' }
  | { kind: 'newBot' }
  | { kind: 'renameBot'; bot: TeamBot }
  | { kind: 'deleteBot'; bot: TeamBot }
  | { kind: 'botAccess'; member: TeamMember };

export interface TeamTableProps {
  onAction: (action: TeamAction) => void;
}

const personName = (member: TeamMember): string => member.name ?? member.email ?? 'Unknown person';

/**
 * Members and pending invites in ONE table.
 *
 * They are one list because they answer one question — who can open this
 * workspace — and a separate "Invitations" panel is how a revoked link ends up
 * forgotten in a second place. Expired, revoked and accepted invites are not
 * rows at all: they are history, and the page is a roster.
 *
 * Below the compact band the same columns render as cards (`DataCards` reads
 * the very same `DataTableColumn[]`), so a column added here cannot go missing
 * on a phone.
 */
export function TeamTable({ onAction }: TeamTableProps) {
  /* Safe here: TeamPage renders the ModuleRoot, this is a child of it. */
  const band = useBand();
  const team = useTeam();
  const toast = useToast();
  const rows = teamRows(team.state);
  const loading = team.state.status === 'loading' || team.state.status === 'idle';

  const columns: DataTableColumn<TeamRow>[] = [
    {
      key: 'person',
      header: 'Person',
      minWidth: 180,
      wrap: true,
      render: (row) =>
        row.kind === 'member' ? (
          <MemberCell member={row.member} isMe={row.member.userId === team.me.id} />
        ) : (
          <InviteCell invite={row.invite} />
        ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '9.5rem',
      wrap: true,
      render: (row) =>
        row.kind === 'invite' ? (
          <Tag tone={roleTone(row.invite.role)}>{roleLabel(row.invite.role)}</Tag>
        ) : (
          <RoleCell member={row.member} team={team} toast={toast} />
        ),
    },
    {
      key: 'bots',
      header: 'Bots',
      width: '9rem',
      wrap: true,
      render: (row) =>
        row.kind === 'member' ? (
          <BotsCell member={row.member} team={team} onAction={onAction} />
        ) : (
          <InviteBotsCell invite={row.invite} bots={team.state.bots} />
        ),
    },
    {
      key: 'when',
      header: 'Joined / Expires',
      width: '10rem',
      render: (row) =>
        row.kind === 'member' ? (
          <span className="text-text-muted" title={absoluteTime(row.member.joinedAt)}>
            {relativeTime(row.member.joinedAt)}
          </span>
        ) : (
          <span className="text-text-muted" title={absoluteTime(row.invite.expiresAt)}>
            Expires {relativeTime(row.invite.expiresAt)}
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '7rem',
      render: (row) => (row.kind === 'member' ? <Tag tone="success">Active</Tag> : <Tag tone="warning">Pending</Tag>),
    },
    {
      key: 'actions',
      header: '',
      width: '3.5rem',
      align: 'end',
      /* `wrap` is what turns OFF the cell's truncation. A control in a
       * truncating cell gets an ellipsis painted beside it — the row menu
       * rendered as "⋯ …" until this was set. */
      wrap: true,
      render: (row) => <RowMenu row={row} team={team} toast={toast} onAction={onAction} />,
    },
  ];

  const empty = (
    <EmptyState
      icon={<IconUsers />}
      title="Nobody here yet"
      description="Invite people with a link — they pick their own password."
    />
  );

  return (
    <Card
      title="People"
      actions={
        team.actorRole === 'owner' || team.actorRole === 'admin' ? (
          <Button variant="secondary" size="sm" onClick={() => onAction({ kind: 'invite' })}>
            <IconPlus size={14} /> Invite people
          </Button>
        ) : null
      }
    >
      {band === 'compact' ? (
        loading && rows.length === 0 ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <DataCards columns={columns} rows={rows} rowKey={rowKey} empty={empty} />
        )
      ) : (
        <DataTable<TeamRow>
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          loading={loading}
          skeletonRows={4}
          caption="Members and pending invites"
          empty={empty}
          /* Between the cards and a comfortable table the four fixed columns eat
           * the identity column: at 600 px "Andrei Admin" truncated to "An…".
           * The date is the one that can go — the status Tag already says whether
           * a row is a person or an outstanding link. */
          hiddenColumns={band === 'narrow' ? ['when'] : undefined}
        />
      )}
    </Card>
  );
}

function MemberCell({ member, isMe }: { member: TeamMember; isMe: boolean }) {
  const name = personName(member);
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar src={member.avatarUrl} name={name} size={28} />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-text">{name}</span>
          {isMe ? <Tag>You</Tag> : null}
        </span>
        {member.email && member.name ? <span className="truncate text-xs text-text-muted">{member.email}</span> : null}
      </span>
    </span>
  );
}

function InviteCell({ invite }: { invite: TeamInvite }) {
  const restricted = invite.email !== null;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-muted">
        {restricted ? <IconMail size={14} /> : <IconLink size={14} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-text">{invite.email ?? 'Anyone with the link'}</span>
        {invite.createdByName ? (
          <span className="truncate text-xs text-text-muted">Invited by {invite.createdByName}</span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * An owner or admin reaches every bot because of their role, so there is
 * nothing here to grant or take away — the cell says so and offers no control.
 * A member's cell is the control.
 */
function BotsCell({
  member,
  team,
  onAction,
}: {
  member: TeamMember;
  team: TeamValue;
  onAction: (action: TeamAction) => void;
}) {
  const access = botAccessOf(team.state, member);
  if (access === 'all') return <Tag tone="neutral">All bots</Tag>;
  const canEdit = team.actorRole === 'owner' || team.actorRole === 'admin';
  const label = access.length === 0 ? 'No bots' : access.length === 1 ? access[0]!.name : `${access.length} bots`;
  if (!canEdit) return <span className="text-text-muted">{label}</span>;
  return (
    <Button variant="ghost" size="sm" onClick={() => onAction({ kind: 'botAccess', member })}>
      {label}
    </Button>
  );
}

function InviteBotsCell({ invite, bots }: { invite: TeamInvite; bots: TeamBot[] }) {
  if (invite.role === 'admin') return <Tag tone="neutral">All bots</Tag>;
  const named = bots.filter((bot) => invite.bots.includes(bot.id));
  const label = named.length === 0 ? 'No bots' : named.length === 1 ? named[0]!.name : `${named.length} bots`;
  return <span className="text-text-muted">{label}</span>;
}

function RoleCell({ member, team, toast }: { member: TeamMember; team: TeamValue; toast: ToastApi }) {
  const options = assignableRoles(team.actorRole, member.role);
  const busy = isBusy(team.state, member.userId);
  if (options.length === 0 || member.userId === team.me.id) {
    return <Tag tone={roleTone(member.role)}>{roleLabel(member.role)}</Tag>;
  }
  return (
    <Select
      aria-label={`Role for ${personName(member)}`}
      value={member.role}
      disabled={busy}
      onChange={(next) => void changeRoleWithUndo(team, toast, member, next as AssignableRole)}
      options={[member.role, ...options].map((role) => ({ value: role, label: roleLabel(role) }))}
      className="w-full"
    />
  );
}

function RowMenu({
  row,
  team,
  toast,
  onAction,
}: {
  row: TeamRow;
  team: TeamValue;
  toast: ToastApi;
  onAction: (action: TeamAction) => void;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const { copy, copied, failed } = useCopyToClipboard();

  /* `copy` is fire-and-forget (the shared hook keeps the outcome as state), and
     the affordance here is a menu item, not a button that can wear a check —
     so the outcome is reported as a toast when the hook settles. */
  useEffect(() => {
    if (copied) toast.show({ tone: 'success', title: 'Invite link copied' });
  }, [copied, toast]);
  useEffect(() => {
    if (failed) {
      toast.show({
        tone: 'danger',
        title: 'Could not copy the link',
        description: 'Copy it from the invite dialog instead.',
      });
    }
  }, [failed, toast]);

  const focusTrigger = () => anchorRef.current?.querySelector('button')?.focus({ preventScroll: true });

  /* A dialog opened straight out of `onSelect` mounts on the same commit that
   * unmounts the menu, so its focus trap captures a menu item that is already
   * gone and, on close, restores focus to nothing. Focus the trigger first —
   * synchronously, while the menu is still up — then let the menu close and
   * open the dialog on the next microtask, so the trap sees the button. */
  const afterMenu = (run: () => void) => {
    focusTrigger();
    queueMicrotask(run);
  };

  /* Escape, an outside click and an activated item all leave through
     DropdownMenu, which puts focus back on this trigger itself. */
  const onOpenChange = (next: boolean) => setOpen(next);

  const items: MenuItem[] = [];

  if (row.kind === 'member') {
    const { member } = row;
    const name = personName(member);
    const isMe = member.userId === team.me.id;
    const busy = isBusy(team.state, member.userId);

    if (!isMe) {
      for (const role of assignableRoles(team.actorRole, member.role)) {
        items.push({
          id: `role-${role}`,
          label: role === 'admin' ? 'Make admin' : 'Make member',
          disabled: busy,
          onSelect: () => void changeRoleWithUndo(team, toast, member, role),
        });
      }
    }
    if (team.recoveryLink && member.email && canResetPassword(team.actorRole, member.role)) {
      items.push({
        id: 'recovery',
        label: 'Reset password link',
        onSelect: () => afterMenu(() => onAction({ kind: 'recovery', member })),
      });
    }
    if (canTransfer(team.actorRole) && !isMe && member.role !== 'owner') {
      items.push({
        id: 'transfer',
        label: 'Transfer ownership',
        onSelect: () => afterMenu(() => onAction({ kind: 'transfer', userId: member.userId })),
      });
    }
    if (isMe) {
      items.push({
        id: 'leave',
        label: 'Leave workspace',
        tone: 'danger',
        onSelect: () => afterMenu(() => onAction({ kind: 'leave' })),
      });
    } else if (canRemove(team.actorRole, member.role)) {
      items.push({
        id: 'remove',
        label: 'Remove from workspace',
        tone: 'danger',
        disabled: busy,
        onSelect: () => afterMenu(() => onAction({ kind: 'remove', member })),
      });
    }
    if (items.length === 0) return null;

    return (
      <span ref={anchorRef} className="inline-flex">
        <RowMenuSurface items={items} label={`Actions for ${name}`} open={open} onOpenChange={onOpenChange} />
      </span>
    );
  }

  const { invite } = row;
  const link = team.state.sessionLinks[invite.id] ?? null;
  const busy = isBusy(team.state, invite.id);

  /* The raw token exists only in the session that created it — the database
     keeps a hash. Nothing to copy afterwards, so the item is simply not there. */
  if (link !== null) {
    items.push({
      id: 'copy',
      label: 'Copy invite link',
      onSelect: () => copy(link),
    });
  }
  items.push({
    id: 'revoke',
    label: 'Revoke invite',
    tone: 'danger',
    disabled: busy,
    onSelect: () => afterMenu(() => onAction({ kind: 'revoke', invite })),
  });

  return (
    <span ref={anchorRef} className="inline-flex">
      <RowMenuSurface
        items={items}
        label={`Actions for the invite to ${invite.email ?? 'anyone with the link'}`}
        open={open}
        onOpenChange={onOpenChange}
      />
    </span>
  );
}

/**
 * `MenuButton` with its open state lifted out — the row needs to know whether
 * its menu is up (a dialog opened from an item must wait for it to close).
 * Same trigger MenuButton renders: the ghost `⋯` with an accessible name.
 */
function RowMenuSurface({
  items,
  label,
  open,
  onOpenChange,
}: {
  items: readonly MenuItem[];
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenu
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      aria-label={label}
      placement="bottom-end"
      trigger={(props) => (
        <Button {...props} iconOnly variant="ghost" size="sm" aria-label={label}>
          <IconMore />
        </Button>
      )}
    />
  );
}

/**
 * A role change is the one team action with an inverse, so it is the one that
 * offers Undo. The runner asks the STORE what the row looks like now rather
 * than trusting the closure: by the time anyone presses it the member may have
 * been removed, or moved again from another tab.
 */
async function changeRoleWithUndo(team: TeamValue, toast: ToastApi, member: TeamMember, role: AssignableRole) {
  const previous = member.role;
  if (previous === 'owner' || previous === role) return;
  const name = personName(member);
  try {
    await team.changeRole(member.userId, role);
  } catch (err) {
    toast.show({ tone: 'danger', title: `Could not change ${name}'s role`, description: messageForError(err) });
    return;
  }
  toast.show({
    tone: 'success',
    title: `${name} is now ${role === 'admin' ? 'an admin' : 'a member'}`,
    action: {
      label: 'Undo',
      onClick: () => {
        void (async () => {
          try {
            const result = await team.undoRoleChange(member.userId, previous, role);
            if (result === 'noop') {
              toast.show({ tone: 'info', title: 'Nothing to undo', description: `${name}'s role has changed since.` });
            }
          } catch (err) {
            toast.show({ tone: 'danger', title: 'Could not undo the role change', description: messageForError(err) });
          }
        })();
      },
    },
  });
}
