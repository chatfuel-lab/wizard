import { Button, IconPlus, IconRefresh, Kbd, PageHeader, Tabs } from '~ui';
import type { BroadcastsView } from '../lib/broadcastsParams';

const TABS = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'templates', label: 'Templates' },
];

export interface BroadcastsHeaderProps {
  view: BroadcastsView;
  onViewChange: (view: BroadcastsView) => void;
  busy: boolean;
  onRefresh: () => void;
  /** Only a role with Flows: Edit gets the button; the server would refuse the rest. */
  canCreate: boolean;
  creating: boolean;
  onNewCampaign: () => void;
  onOpenPalette: () => void;
}

/**
 * The module's top zone: the title, the two tabs, and what acts on the module
 * rather than on the view below it. The composer is a route of its own and
 * draws no header from here.
 */
export function BroadcastsHeader({
  view,
  onViewChange,
  busy,
  onRefresh,
  canCreate,
  creating,
  onNewCampaign,
  onOpenPalette,
}: BroadcastsHeaderProps) {
  return (
    <PageHeader
      title="Broadcasts"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open the command palette"
            className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-meta text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
          >
            Commands
            <Kbd keys={['mod', 'k']} />
          </button>
          <Button variant="ghost" size="sm" iconOnly aria-label="Refresh" onClick={onRefresh} disabled={busy}>
            <IconRefresh className={busy ? 'animate-spin' : undefined} />
          </Button>
          {canCreate ? (
            <Button variant="primary" size="sm" onClick={onNewCampaign} loading={creating}>
              <IconPlus />
              New campaign
            </Button>
          ) : null}
        </div>
      }
      tabs={
        <Tabs
          tabs={TABS}
          active={view === 'templates' ? 'templates' : 'campaigns'}
          onSelect={(id) => onViewChange(id as BroadcastsView)}
        />
      }
    />
  );
}
