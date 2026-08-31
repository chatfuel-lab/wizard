import { Button, EmptyState, IconLayoutGrid, IconPlus, Tag, useRovingFocus } from '~ui';
import type { AdminWorkspaceRef } from '../types';

export interface WorkspaceRailProps {
  workspaces: readonly AdminWorkspaceRef[];
  selected: string | null;
  homeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

/**
 * The account's workspaces, as the rail every in-module left pane in this app
 * is: a list of what the pane beside it is about, and the way to add one more.
 *
 * The count against the limit is the number an operator opens this panel to
 * see — a workspace whose plan is full cannot take the bot they came to make,
 * and finding that out from a refusal after typing a name is finding it out
 * twice.
 */
export function WorkspaceRail({ workspaces, selected, homeWorkspaceId, onSelect, onCreate }: WorkspaceRailProps) {
  const roving = useRovingFocus(workspaces.length, {
    orientation: 'vertical',
    labels: workspaces.map((workspace) => workspace.title || workspace.id),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={roving.onKeyDown}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-label text-text-muted">Workspaces</span>
        <Button variant="ghost" iconOnly aria-label="New bot" onClick={onCreate}>
          <IconPlus />
        </Button>
      </div>
      <nav aria-label="Workspaces" className="min-h-0 flex-1 overflow-y-auto">
        {workspaces.length === 0 ? (
          <EmptyState icon={<IconLayoutGrid />} title="No workspaces" />
        ) : (
          <ul role="list">
            {workspaces.map((workspace, index) => {
              const active = workspace.id === selected;
              return (
                <li key={workspace.id}>
                  <button
                    type="button"
                    {...roving.itemProps(index)}
                    onClick={() => onSelect(workspace.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full flex-col gap-0.5 py-2 pl-3 pr-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${active ? 'bg-accent-soft' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-body text-text ${active ? 'font-medium' : ''}`}>
                        {workspace.title || workspace.id}
                      </span>
                      {workspace.id === homeWorkspaceId ? <Tag tone="accent">This app</Tag> : null}
                    </span>
                    <span className="text-meta text-text-muted">
                      {workspace.bots.length} / {workspace.botsLimit}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
