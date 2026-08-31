import { useEffect, useState } from 'react';
import { Alert, Button, IconPlus, SplitPane, Spinner, Tag } from '~ui';
import { useAdmin } from '../AdminContext';
import { BotPanel } from '../components/BotPanel';
import { BotsTable } from '../components/BotsTable';
import { CreateBotDialog } from '../components/CreateBotDialog';
import { WorkspaceRail } from '../components/WorkspaceRail';
import type { AdminWorkspaceRef } from '../types';
import type { AdminViewProps } from './types';

/** Chatfuel's word for a workspace that has never been through checkout. */
const NO_PLAN = 'No plan';

/**
 * A stable order for the rail: this deployment's own workspace first, then the
 * ones holding bots, then the rest by name.
 *
 * Chatfuel returns them in no order anybody can rely on, and a list that
 * reshuffles under the pointer is a list nobody can use. Empty workspaces sink
 * because they are usually leftovers.
 */
function orderWorkspaces(workspaces: readonly AdminWorkspaceRef[], homeId: string | null): AdminWorkspaceRef[] {
  return [...workspaces].sort((a, b) => {
    if ((a.id === homeId) !== (b.id === homeId)) return a.id === homeId ? -1 : 1;
    if (a.bots.length > 0 !== b.bots.length > 0) return a.bots.length > 0 ? -1 : 1;
    return (a.title || a.id).localeCompare(b.title || b.id) || a.id.localeCompare(b.id);
  });
}

/**
 * The account's workspaces on the left, one workspace's bots on the right, and
 * one bot in a drawer over them.
 *
 * The workspace in the address wins over the first one in the list, so a link
 * to a workspace opens on it; an address naming a workspace that has since gone
 * falls back rather than showing an empty pane, which is the same rule the rest
 * of the module's address parsing keeps.
 */
export function BotsView({ band, address, patch }: AdminViewProps) {
  const { store, selectBot } = useAdmin();
  const { overview, workspaces: details, bots, busy, loading, error } = store.state;
  const [creating, setCreating] = useState(false);

  const list = orderWorkspaces(overview?.workspaces ?? [], overview?.homeWorkspaceId ?? null);
  /* The address wins; otherwise the workspace this deployment is about. Falling
     straight to the first row would open on whichever workspace the account
     happens to list first, which need not be one its owner has ever used. */
  const selected =
    list.find((workspace) => workspace.id === address.workspace) ??
    list.find((workspace) => workspace.id === overview?.homeWorkspaceId) ??
    list[0] ??
    null;
  const selectedId = selected?.id ?? null;
  const detail = selected ? details[selected.id] : undefined;
  const openBotDetail = address.bot ? bots[address.bot] : undefined;
  const { openWorkspace, openBot } = store;

  /* Selecting a workspace or a bot is what asks for its detail — the account
     tree carries names and ids only, and asking for everything up front would
     be one round trip per workspace on every load. */
  useEffect(() => {
    if (selectedId) openWorkspace(selectedId);
  }, [selectedId, openWorkspace]);

  useEffect(() => {
    if (address.bot) openBot(address.bot);
  }, [address.bot, openBot]);

  if (loading && !overview) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error && !overview) {
    return (
      <div className="p-4">
        <Alert
          tone="danger"
          title="Could not read this account"
          action={
            <Button variant="secondary" onClick={store.refresh}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <>
      <SplitPane
        side={
          <WorkspaceRail
            workspaces={list}
            selected={selected?.id ?? null}
            homeWorkspaceId={overview?.homeWorkspaceId ?? null}
            onSelect={(id) => patch({ workspace: id, bot: null })}
            onCreate={() => setCreating(true)}
          />
        }
        sideLabel="Workspaces"
        sideWidth="list"
        collapseBelow="compact"
        showing={band === 'compact' && selected ? 'detail' : 'side'}
        onShowingChange={(next) => {
          if (next === 'side') patch({ workspace: null, bot: null });
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <span className="text-body font-medium text-text">{selected?.title || selected?.id || '—'}</span>
            {selected ? (
              <Tag tone={selected.bots.length >= selected.botsLimit ? 'warning' : 'neutral'}>
                {selected.bots.length} / {selected.botsLimit}
              </Tag>
            ) : null}
            {detail ? (
              <Tag tone={detail.subscription ? 'success' : 'neutral'}>
                {detail.subscription
                  ? detail.subscription.isOnTrialPeriod
                    ? 'Trial'
                    : detail.subscription.status
                  : NO_PLAN}
              </Tag>
            ) : null}
            <span className="flex-1" />
            <Button variant="primary" onClick={() => setCreating(true)}>
              <IconPlus />
              New bot
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <BotsTable
              bots={selected?.bots ?? []}
              busy={busy}
              onOpenPanel={(botId) => patch({ bot: botId })}
              onOpenBot={selectBot ? (botId) => selectBot(botId, selected?.id) : undefined}
              onCreate={() => setCreating(true)}
            />
          </div>
        </div>
      </SplitPane>

      <BotPanel
        open={address.bot !== null}
        botId={address.bot}
        detail={openBotDetail ?? null}
        busy={address.bot !== null && busy.includes(address.bot)}
        onClose={() => patch({ bot: null })}
        onRename={store.renameBot}
        onDelete={store.deleteBot}
        onOpenBot={selectBot}
      />

      <CreateBotDialog
        open={creating}
        onClose={() => setCreating(false)}
        workspaces={list}
        defaultWorkspaceId={selected?.id ?? null}
        tenants={overview?.capabilities.access ? (store.state.tenants ?? []) : null}
        onCreate={store.createBot}
      />
    </>
  );
}
