import { Badge, Button, IconPlus, IconRefresh, Kbd, PageHeader, Spinner, Tooltip } from '~ui';

export interface AutomationsHeaderProps {
  /** True while a live event has just landed (the dot pulses briefly). */
  live: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  canEdit: boolean;
  onNewRule: () => void;
  /** Unsaved drafts across the workspace. */
  dirtyCount: number;
  onOpenPalette: () => void;
}

/**
 * The module's top zone: title, the unsaved badge, the live dot, ⌘K, Refresh,
 * New rule. The AI master switch lives ONCE, on the rail's pinned Default row.
 * It carries its own `title` because a module ships as an embed with no shell
 * chrome at all.
 */
export function AutomationsHeader({
  live,
  onRefresh,
  refreshing,
  canEdit,
  onNewRule,
  dirtyCount,
  onOpenPalette,
}: AutomationsHeaderProps) {
  return (
    <PageHeader
      title="AI Automations"
      meta={
        <>
          {dirtyCount > 0 ? (
            <Tooltip label="Unsaved drafts — ⌘S saves them all">
              <span className="inline-flex items-center gap-1 text-meta text-warning">
                <Badge tone="accent" count={dirtyCount} /> unsaved
              </span>
            </Tooltip>
          ) : null}
          {live ? (
            <Tooltip label="Live — something changed just now">
              <span
                aria-label="Live update received"
                className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
              />
            </Tooltip>
          ) : null}
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open the command palette"
            className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
          >
            Commands
            <Kbd keys={['mod', 'k']} />
          </button>
          <Tooltip label="Refresh">
            <Button variant="ghost" size="sm" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size={14} /> : <IconRefresh />}
            </Button>
          </Tooltip>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={onNewRule}>
              <IconPlus />
              <span className="hidden @compact:inline">New rule</span>
            </Button>
          ) : null}
        </>
      }
    />
  );
}
