import { Button, IconPlus, IconRefresh, Kbd, PageHeader, Spinner, Tag, Tooltip } from '~ui';
import { setName } from '../lib/summary';
import type { EventSetView } from '../types';

export interface AdsHeaderProps {
  /** The set that is open, or null while the first load is still running. */
  set: EventSetView | null;
  loading: boolean;
  canCreateSet: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
}

/**
 * The module's top zone: what is open, and everything that acts on the module
 * rather than on the set below it.
 *
 * It carries its own title because a module ships as an embed with no shell
 * chrome above it at all. Creating a set lives here rather than in the rail so
 * that it survives the stacked layout — below the collapse band the rail is not
 * on screen while a set is being read.
 */
export function AdsHeader({
  set,
  loading,
  canCreateSet,
  onCreate,
  onRefresh,
  onOpenPalette,
  onOpenShortcuts,
}: AdsHeaderProps) {
  return (
    <PageHeader
      title={
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate">Ads Optimization</span>
          {set ? (
            <>
              <span aria-hidden className="text-text-faint">
                /
              </span>
              <span className="truncate text-base font-normal text-text-muted">{setName(set)}</span>
            </>
          ) : null}
        </span>
      }
      meta={set && !set.enabled ? <Tag tone="neutral">Off</Tag> : null}
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
          <Tooltip label="Keyboard shortcuts">
            <Button variant="ghost" size="sm" iconOnly aria-label="Keyboard shortcuts" onClick={onOpenShortcuts}>
              ?
            </Button>
          </Tooltip>
          <Tooltip label="Reload the sets">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Reload the sets"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? <Spinner size={14} /> : <IconRefresh size={14} />}
            </Button>
          </Tooltip>
          <Button variant="primary" size="sm" onClick={onCreate} disabled={!canCreateSet}>
            <IconPlus size={14} />
            <span className="hidden @compact:inline">New event set</span>
          </Button>
        </>
      }
    />
  );
}
