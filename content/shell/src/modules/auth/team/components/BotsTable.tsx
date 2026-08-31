import {
  Button,
  Card,
  DataCards,
  DataTable,
  DropdownMenu,
  IconMore,
  IconPlus,
  Tag,
  useBand,
  type DataTableColumn,
  type MenuItem,
} from '~ui';
import type { TeamBot } from '../../types';
import { useTeam, type TeamValue } from '../TeamContext';
import { absoluteTime, relativeTime } from '../lib/relativeTime';
import { isBusy } from '../lib/teamStore';
import type { TeamAction } from './TeamTable';

export interface BotsTableProps {
  onAction: (action: TeamAction) => void;
}

/**
 * The workspace's bots — every one of them, which is wider than the switcher in
 * the topbar: an admin can hand out a bot they have not opened themselves.
 *
 * Members are not listed per bot here; the Bots column on the roster above is
 * where access is read and changed, because the question people actually ask is
 * "what can this person open", not "who can open this".
 */
export function BotsTable({ onAction }: BotsTableProps) {
  const band = useBand();
  const team = useTeam();
  const canEdit = team.actorRole === 'owner' || team.actorRole === 'admin';

  const columns: DataTableColumn<TeamBot>[] = [
    {
      key: 'name',
      header: 'Bot',
      minWidth: 160,
      wrap: true,
      render: (bot) => <span className="truncate font-medium text-text">{bot.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '8rem',
      render: (bot) => (bot.botId ? <Tag tone="success">Ready</Tag> : <Tag tone="warning">Setting up</Tag>),
    },
    {
      key: 'people',
      header: 'People',
      width: '7rem',
      render: (bot) => <span className="text-text-muted">{peopleLabel(team, bot)}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '9rem',
      render: (bot) => (
        <span className="text-text-muted" title={absoluteTime(bot.createdAt)}>
          {relativeTime(bot.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '3.5rem',
      align: 'end',
      wrap: true,
      render: (bot) => (canEdit ? <BotMenu bot={bot} team={team} onAction={onAction} /> : null),
    },
  ];

  return (
    <Card
      title="Bots"
      actions={
        canEdit ? (
          <Button variant="secondary" size="sm" onClick={() => onAction({ kind: 'newBot' })}>
            <IconPlus size={14} /> New bot
          </Button>
        ) : null
      }
    >
      {band === 'compact' ? (
        <DataCards columns={columns} rows={team.state.bots} rowKey={(bot) => bot.id} />
      ) : (
        <DataTable<TeamBot>
          columns={columns}
          rows={team.state.bots}
          rowKey={(bot) => bot.id}
          loading={team.state.status === 'loading' || team.state.status === 'idle'}
          skeletonRows={2}
          caption="The bots in this workspace"
          hiddenColumns={band === 'narrow' ? ['created'] : undefined}
        />
      )}
    </Card>
  );
}

/** Owners and admins reach every bot by role, so they are counted, not granted. */
function peopleLabel(team: TeamValue, bot: TeamBot): string {
  const byRole = team.state.members.filter((m) => m.role === 'owner' || m.role === 'admin').length;
  return String(byRole + bot.members.length);
}

function BotMenu({ bot, team, onAction }: { bot: TeamBot; team: TeamValue; onAction: (action: TeamAction) => void }) {
  const busy = isBusy(team.state, bot.id);
  const items: MenuItem[] = [
    { id: 'rename', label: 'Rename…', disabled: busy, onSelect: () => onAction({ kind: 'renameBot', bot }) },
    {
      id: 'delete',
      label: 'Delete…',
      tone: 'danger',
      disabled: busy,
      onSelect: () => onAction({ kind: 'deleteBot', bot }),
    },
  ];
  return (
    <DropdownMenu
      items={items}
      aria-label={`Actions for ${bot.name}`}
      placement="bottom-end"
      trigger={(props) => (
        <Button {...props} iconOnly variant="ghost" size="sm" aria-label={`Actions for ${bot.name}`}>
          <IconMore />
        </Button>
      )}
    />
  );
}
