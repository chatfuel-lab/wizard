import {
  Button,
  IconCalendar,
  IconLayoutGrid,
  IconLayoutList,
  IconPlus,
  IconRefresh,
  Kbd,
  PageHeader,
  SegmentedControl,
  type Band,
} from '~ui';
import type { PublishingView } from '../lib/publishingParams';

const VIEW_OPTIONS = [
  { value: 'calendar' as const, label: 'Calendar', icon: <IconCalendar /> },
  { value: 'queue' as const, label: 'Queue', icon: <IconLayoutList /> },
  { value: 'library' as const, label: 'Library', icon: <IconLayoutGrid /> },
];

export interface PublishingHeaderProps {
  view: PublishingView;
  onViewChange: (view: PublishingView) => void;
  band: Band;
  /** A refresh is still in flight, so the button spins instead of firing again. */
  busy: boolean;
  onRefresh: () => void;
  /** Only a ready account gets a compose button — see the workspace's gate. */
  canCompose: boolean;
  onCompose: () => void;
  onOpenPalette: () => void;
}

/**
 * The module's top zone: the title, the view switch, and everything that acts
 * on the module rather than on the view below it.
 *
 * No `meta`. It used to carry the account handle and a bare count, and a
 * number with nothing to say what it counts is noise wherever it is put.
 * Whose account this goes to is answered where it is acted on — in the
 * composer's own header — and how many posts there are is the list the
 * reader is already looking at. The refresh button carries the busy
 * state, next to the thing that causes it.
 */
export function PublishingHeader({
  view,
  onViewChange,
  band,
  busy,
  onRefresh,
  canCompose,
  onCompose,
  onOpenPalette,
}: PublishingHeaderProps) {
  return (
    <PageHeader
      title="Publishing"
      actions={
        <div className="flex items-center gap-2">
          {/* Hidden in the smallest band: ⌘K is not a phone control, and
              every command behind it is reachable another way. */}
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open the command palette"
            className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-meta text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
          >
            Commands
            <Kbd keys={['mod', 'k']} />
          </button>
          <SegmentedControl
            aria-label="View"
            value={view}
            onChange={onViewChange}
            options={VIEW_OPTIONS}
            iconOnly={band === 'compact'}
            size="sm"
          />
          <Button variant="ghost" size="sm" iconOnly aria-label="Refresh" onClick={onRefresh} disabled={busy}>
            <IconRefresh className={busy ? 'animate-spin' : undefined} />
          </Button>
          {canCompose ? (
            <Button variant="primary" size="sm" onClick={onCompose}>
              <IconPlus />
              New post
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
