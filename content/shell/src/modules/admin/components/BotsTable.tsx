import { Button, DataTable, EmptyState, IconChat, IconExternal, IconPlus } from '~ui';
import type { AdminBotRef } from '../types';

export interface BotsTableProps {
  bots: readonly AdminBotRef[];
  busy: readonly string[];
  onOpenPanel: (botId: string) => void;
  /** Absent in an embed, where there is no app around this module to re-point. */
  onOpenBot?: (botId: string) => void;
  onCreate: () => void;
}

export function BotsTable({ bots, busy, onOpenPanel, onOpenBot, onCreate }: BotsTableProps) {
  return (
    <DataTable<AdminBotRef>
      rows={bots as AdminBotRef[]}
      rowKey={(row) => row.id}
      caption="Bots in this workspace"
      stickyHeader
      rowNavigation
      onRowClick={(row) => onOpenPanel(row.id)}
      isRowDisabled={(row) => busy.includes(row.id)}
      columns={[
        { key: 'title', header: 'Name', render: (row) => row.title || row.id },
        { key: 'id', header: 'Bot id', width: '20rem', render: (row) => <code className="text-meta">{row.id}</code> },
      ]}
      rowActions={
        onOpenBot
          ? (row) => (
              <Button
                variant="ghost"
                iconOnly
                aria-label={`Open ${row.title || row.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenBot(row.id);
                }}
              >
                <IconExternal />
              </Button>
            )
          : undefined
      }
      empty={
        <EmptyState
          icon={<IconChat />}
          title="No bots in this workspace"
          action={
            <Button variant="primary" onClick={onCreate}>
              <IconPlus />
              New bot
            </Button>
          }
        />
      }
    />
  );
}
