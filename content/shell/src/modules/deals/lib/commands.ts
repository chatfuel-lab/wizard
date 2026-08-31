/**
 * What the ⌘K palette offers, as data.
 *
 * **Workspace-scoped on purpose.** Every command here acts on state
 * `DealsWorkspace` already owns — the view, the filter, the density, the saved
 * views, the undo entry. Nothing reaches into a view's internals, and nothing
 * acts on a selection: bulk actions live on the `ActionBar`, where the count is
 * visible and the target is unambiguous. "Move 3 deals to Won" typed blind into
 * a palette is a worse version of pressing `5`.
 *
 * That is not only a product call — it is what keeps `DealsViewProps` frozen at
 * its fourteen props while three tracks build on top of it.
 *
 * Pure, so "which commands appear in which state" is a test rather than a
 * component to click through. Icons come in as a map from the component: a
 * `.ts` file cannot render JSX, and turning this into a `.tsx` to hold six
 * icons would take the rules out of the test suite.
 */
import type { CommandGroup, CommandItem } from '~ui';
import type { ReactNode } from 'react';
import {
  ASSIGNEE_PRESETS,
  ASSIGNEE_PRESET_LABELS,
  isFilterEmpty,
  userAssigneeKey,
  type AssigneeFilterKey,
  type DealsFilter,
} from './dealsFilter';
import type { DealsView } from './dealsParams';
import type { Density } from './layout';

export type DealsCommandId =
  | 'view.board'
  | 'view.table'
  | 'view.forecast'
  | 'filter.clear'
  | 'filter.assignee'
  | 'density.compact'
  | 'density.comfortable'
  | 'search'
  | 'refresh'
  | 'undo'
  | 'shortcuts'
  | 'savedView';

export interface DealsCommandTeammate {
  userAccountId: string;
  name: string;
}

export interface DealsCommandSavedView {
  id: string;
  name: string;
}

export interface DealsCommandContext {
  view: DealsView;
  filter: DealsFilter;
  density: Density;
  /** The label of the pending undo, or null when there is nothing to undo. */
  undoLabel: string | null;
  teammates: readonly DealsCommandTeammate[];
  savedViews: readonly DealsCommandSavedView[];
}

export interface DealsCommandHandlers {
  setView: (view: DealsView) => void;
  setAssignee: (key: AssigneeFilterKey) => void;
  setDensity: (density: Density) => void;
  clearFilter: () => void;
  focusSearch: () => void;
  refresh: () => void;
  undo: () => void;
  openShortcuts: () => void;
  applySavedView: (id: string) => void;
}

export type DealsCommandIcons = Partial<Record<DealsCommandId, ReactNode>>;

const VIEW_LABELS: Record<DealsView, string> = {
  board: 'Board',
  table: 'Table',
  forecast: 'Forecast',
};

const VIEW_KEYWORDS: Record<DealsView, string[]> = {
  board: ['kanban', 'pipeline', 'columns'],
  table: ['list', 'rows', 'grid', 'search'],
  forecast: ['stats', 'analytics', 'win rate', 'export'],
};

const VIEW_SHORTCUT: Record<DealsView, string[]> = {
  board: ['g', 'b'],
  table: ['g', 't'],
  forecast: ['g', 'f'],
};

const VIEWS: DealsView[] = ['board', 'table', 'forecast'];

/** Only these two ever reach the board or the table; forecast has no density. */
const DENSITIES: { value: Density; label: string }[] = [
  { value: 'compact', label: 'Compact rows' },
  { value: 'comfortable', label: 'Comfortable rows' },
];

export function buildCommandGroups(
  context: DealsCommandContext,
  handlers: DealsCommandHandlers,
  icons: DealsCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];

  /* Actions first: the palette is opened to DO something far more often than to
   * navigate, and an empty query shows this group at the top. */
  const actions: CommandItem[] = [];

  if (context.undoLabel !== null) {
    actions.push({
      id: 'undo',
      label: context.undoLabel,
      description: 'The cards return to the top of their column, not to where they were',
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    });
  }

  /* The board has no search box to focus — offering one would be a dead
   * affordance, and §3.6 forbids those. */
  if (context.view === 'table') {
    actions.push({
      id: 'search',
      label: 'Search deals',
      description: 'By name or phone, on the server',
      keywords: ['find', 'filter', 'name', 'phone'],
      shortcut: ['/'],
      icon: icons.search,
      onSelect: handlers.focusSearch,
    });
  }

  if (!isFilterEmpty(context.filter)) {
    actions.push({
      id: 'filter.clear',
      label: 'Clear all filters',
      keywords: ['reset', 'show everything'],
      icon: icons['filter.clear'],
      onSelect: handlers.clearFilter,
    });
  }

  actions.push({
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'refetch'],
    shortcut: ['r'],
    icon: icons.refresh,
    onSelect: handlers.refresh,
  });

  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  groups.push({ id: 'actions', label: 'Actions', items: actions });

  /* The view you are already in is not a destination. */
  const elsewhere = VIEWS.filter((view) => view !== context.view);
  if (elsewhere.length > 0) {
    groups.push({
      id: 'go',
      label: 'Go to',
      items: elsewhere.map((view) => ({
        id: `view.${view}`,
        label: VIEW_LABELS[view],
        keywords: VIEW_KEYWORDS[view],
        shortcut: VIEW_SHORTCUT[view],
        icon: icons[`view.${view}` as DealsCommandId],
        onSelect: () => handlers.setView(view),
      })),
    });
  }

  const assignees: CommandItem[] = [
    ...ASSIGNEE_PRESETS.filter((key) => key !== context.filter.assignee).map((key) => ({
      id: `assignee.${key}`,
      label: ASSIGNEE_PRESET_LABELS[key],
      keywords: ['owner', 'assignee', 'filter'],
      icon: icons['filter.assignee'],
      onSelect: () => handlers.setAssignee(key),
    })),
    ...context.teammates
      .filter((member) => userAssigneeKey(member.userAccountId) !== context.filter.assignee)
      .map((member) => ({
        id: `assignee.u:${member.userAccountId}`,
        label: member.name,
        description: 'Show only their deals',
        keywords: ['owner', 'assignee', 'mine'],
        icon: icons['filter.assignee'],
        onSelect: () => handlers.setAssignee(userAssigneeKey(member.userAccountId)),
      })),
  ];
  if (assignees.length > 0) {
    groups.push({ id: 'assignee', label: 'Filter by owner', items: assignees });
  }

  /* Forecast renders cards, not rows: a density command there would change
   * nothing the user can see. */
  if (context.view !== 'forecast') {
    const densities = DENSITIES.filter((entry) => entry.value !== context.density);
    if (densities.length > 0) {
      groups.push({
        id: 'density',
        label: 'Density',
        items: densities.map((entry) => ({
          id: `density.${entry.value}`,
          label: entry.label,
          keywords: ['rows', 'compact', 'spacing'],
          icon: icons[`density.${entry.value}` as DealsCommandId],
          onSelect: () => handlers.setDensity(entry.value),
        })),
      });
    }
  }

  if (context.savedViews.length > 0) {
    groups.push({
      id: 'saved',
      label: 'Saved views',
      items: context.savedViews.map((view) => ({
        id: `saved.${view.id}`,
        label: view.name,
        description: 'Saved for you only — the API has no shared storage',
        keywords: ['view', 'preset'],
        icon: icons.savedView,
        onSelect: () => handlers.applySavedView(view.id),
      })),
    });
  }

  return groups;
}
