import { Badge, Button, IconPlus, IconRefresh, Kbd, PageHeader, Spinner, Tooltip } from '~ui';
import type { BudgetBreakdown } from '../lib/budget';
import { sourceMeta, type SourceId } from '../lib/sources';

export interface KnowledgeBaseHeaderProps {
  source: SourceId;
  budget: BudgetBreakdown | null;
  dirtyCount: number;
  onRefresh: () => void;
  refreshing: boolean;
  canEditHere: boolean;
  /** What the primary button creates here, or null on a source that creates nothing. */
  createLabel: string | null;
  /**
   * Presses the page's own create control (`[data-knowledge-create]`), which is
   * also what `n` and the palette press - one code path, so the dialog the page
   * opens is the same one however it was asked for.
   */
  onCreate: () => void;
  onOpenPalette: () => void;
}

/**
 * The module's top zone: the module name and the open source, the unsaved
 * badge, the character budget, the command palette, Refresh, and the source's
 * one primary action.
 *
 * It carries its own title because a module ships as an embed with no shell
 * chrome at all. The budget sits here rather than only on the Overview because
 * it is the one number that constrains every page underneath.
 */
export function KnowledgeBaseHeader({
  source,
  budget,
  dirtyCount,
  onRefresh,
  refreshing,
  canEditHere,
  createLabel,
  onCreate,
  onOpenPalette,
}: KnowledgeBaseHeaderProps) {
  const meta = sourceMeta(source);
  return (
    <PageHeader
      title={
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate">Knowledge Base</span>
          <span aria-hidden className="text-text-faint">
            /
          </span>
          <span className="truncate text-base font-normal text-text-muted">{meta.title}</span>
        </span>
      }
      meta={
        <>
          {dirtyCount > 0 ? (
            <Tooltip label="Unsaved changes - Command S saves them all">
              <span className="inline-flex items-center gap-1 text-meta text-warning">
                <Badge tone="accent" count={dirtyCount} /> unsaved
              </span>
            </Tooltip>
          ) : null}
          {/* The count itself is gone from every surface: it is a number nobody
              can act on, and "2 463 characters" beside a page of real work is
              noise. What is left is the one state that stops a save. */}
          {budget?.full ? <span className="text-meta text-danger">Knowledge base is full</span> : null}
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
          {canEditHere && createLabel ? (
            <Button variant="primary" size="sm" onClick={onCreate}>
              <IconPlus />
              <span className="hidden @compact:inline">{createLabel}</span>
            </Button>
          ) : null}
        </>
      }
    />
  );
}
