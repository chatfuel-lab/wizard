/**
 * What ⌘K offers, as data.
 *
 * **Workspace-scoped on purpose.** Every command acts on state
 * `ContactsWorkspace` already owns — the surface, the filter, the density, the
 * saved views, the open record, the pending undo. Nothing reaches into a
 * surface's internals and nothing acts on a selection: bulk actions live on the
 * list's action bar where the count is visible and the target is unambiguous.
 * "Assign 12 contacts to Mira" typed blind into a palette is a worse version of
 * selecting them and pressing a button.
 *
 * That is also what keeps `ContactsViewProps` frozen while six tracks build on
 * it — a palette that needed to reach inside the table would need a prop to do
 * it with.
 *
 * Pure, so "which commands exist in which state" is a test rather than a
 * component to click through. Icons arrive as a map from the component: a `.ts`
 * file cannot render JSX, and turning this into a `.tsx` to hold ten icons
 * would take the rules out of the test suite.
 */
import type { ReactNode } from 'react';
import { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import type { CommandGroup, CommandItem } from '~ui';
import {
  ALL_STAGES,
  ASSIGNEE_PRESETS,
  ASSIGNEE_PRESET_LABELS,
  isFilterEmpty,
  isPlatformSubset,
  userAssigneeKey,
  type AssigneeFilterKey,
  type ContactsFilter,
} from './contactsFilter';
import { DENSITIES, type ContactsView, type Density } from './contactsParams';
import { STAGE_LABELS } from './filterLabels';
import { ALL_PLATFORMS, PLATFORM_LABELS } from './platforms';
import { DENSITY_LABELS } from './tableColumns';

export type ContactsCommandId =
  | 'view.list'
  | 'view.fields'
  | 'view.audience'
  | 'filter.clear'
  | 'filter.assignee'
  | 'filter.stage'
  | 'filter.channel'
  | 'filter.unread'
  | 'density'
  | 'search'
  | 'refresh'
  | 'undo'
  | 'shortcuts'
  | 'closeRecord'
  | 'savedView';

export interface ContactsCommandTeammate {
  /** `member.user.id` — the UserAccountID the assignee filter takes. */
  userAccountId: string;
  name: string;
}

export interface ContactsCommandSavedView {
  id: string;
  name: string;
  description: string;
}

export interface ContactsCommandContext {
  view: ContactsView;
  filter: ContactsFilter;
  density: Density;
  /** The label of the pending undo, or null when there is nothing to undo. */
  undoLabel: string | null;
  /** True while a contact is open as a full record page. */
  recordOpen: boolean;
  teammates: readonly ContactsCommandTeammate[];
  savedViews: readonly ContactsCommandSavedView[];
  /** The saved view the filter currently IS — not offered as a destination. */
  appliedViewId: string | null;
}

export interface ContactsCommandHandlers {
  setView: (view: ContactsView) => void;
  setAssignee: (key: AssigneeFilterKey) => void;
  setStages: (stages: SalesStageV2[]) => void;
  setPlatforms: (platforms: Platform[]) => void;
  setUnreadOnly: (unreadOnly: boolean) => void;
  setDensity: (density: Density) => void;
  clearFilter: () => void;
  focusSearch: () => void;
  refresh: () => void;
  undo: () => void;
  openShortcuts: () => void;
  closeRecord: () => void;
  applySavedView: (id: string) => void;
}

export type ContactsCommandIcons = Partial<Record<ContactsCommandId, ReactNode>>;

const VIEW_LABELS: Record<ContactsView, string> = {
  list: 'Contacts',
  fields: 'Fields',
  audience: 'Audience',
};

const VIEW_KEYWORDS: Record<ContactsView, string[]> = {
  list: ['table', 'rows', 'people', 'address book'],
  fields: ['attributes', 'catalog', 'schema', 'custom'],
  audience: ['segments', 'breakdown', 'coverage', 'stats'],
};

const VIEW_SHORTCUT: Record<ContactsView, string[]> = {
  list: ['g', 'l'],
  fields: ['g', 'f'],
  audience: ['g', 'a'],
};

const VIEWS: readonly ContactsView[] = ['list', 'fields', 'audience'];

/** True when the filter already asks for exactly this one stage. */
const onlyStage = (filter: ContactsFilter, stage: SalesStageV2): boolean =>
  filter.stages.length === 1 && filter.stages[0] === stage;

const onlyPlatform = (filter: ContactsFilter, platform: Platform): boolean =>
  filter.platforms.length === 1 && filter.platforms[0] === platform;

export function buildCommandGroups(
  context: ContactsCommandContext,
  handlers: ContactsCommandHandlers,
  icons: ContactsCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const { filter } = context;

  /* Actions first: a palette is opened to DO something far more often than to
     navigate, and an empty query shows the top group first. */
  const actions: CommandItem[] = [];

  if (context.undoLabel !== null) {
    actions.push({
      id: 'undo',
      label: context.undoLabel,
      description: 'Writes the old values back — this API keeps no history to roll back to',
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    });
  }

  if (context.recordOpen) {
    actions.push({
      id: 'closeRecord',
      label: 'Close the contact',
      keywords: ['back', 'list', 'escape'],
      shortcut: ['esc'],
      icon: icons.closeRecord,
      onSelect: handlers.closeRecord,
    });
  }

  /* Only the list has a search box. Offering it anywhere else would be a dead
     affordance pointing at a control that is not on screen. */
  if (context.view === 'list' && !context.recordOpen) {
    actions.push({
      id: 'search',
      label: 'Search contacts',
      description: 'By name or phone',
      keywords: ['find', 'filter', 'name', 'phone'],
      shortcut: ['/'],
      icon: icons.search,
      onSelect: handlers.focusSearch,
    });
  }

  if (!isFilterEmpty(filter)) {
    actions.push({
      id: 'filter.clear',
      label: 'Clear all filters',
      keywords: ['reset', 'show everything'],
      icon: icons['filter.clear'],
      onSelect: handlers.clearFilter,
    });
  }

  actions.push({
    id: 'filter.unread',
    label: filter.unreadOnly ? 'Include contacts you have read' : 'Only unread conversations',
    keywords: ['unread', 'inbox', 'waiting'],
    icon: icons['filter.unread'],
    onSelect: () => handlers.setUnreadOnly(!filter.unreadOnly),
  });

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

  /* The surface you are already on is not a destination. An open record is,
     though — going to a surface closes it, which is the point. */
  const elsewhere = VIEWS.filter((view) => view !== context.view || context.recordOpen);
  if (elsewhere.length > 0) {
    groups.push({
      id: 'go',
      label: 'Go to',
      items: elsewhere.map((view) => ({
        id: `view.${view}`,
        label: VIEW_LABELS[view],
        keywords: VIEW_KEYWORDS[view],
        shortcut: VIEW_SHORTCUT[view],
        icon: icons[`view.${view}` as ContactsCommandId],
        onSelect: () => handlers.setView(view),
      })),
    });
  }

  const saved = context.savedViews.filter((view) => view.id !== context.appliedViewId);
  if (saved.length > 0) {
    groups.push({
      id: 'saved',
      label: 'Your views',
      items: saved.map((view) => ({
        id: `saved.${view.id}`,
        label: view.name,
        description: view.description,
        keywords: ['view', 'preset', 'saved'],
        icon: icons.savedView,
        onSelect: () => handlers.applySavedView(view.id),
      })),
    });
  }

  const owners: CommandItem[] = [
    ...ASSIGNEE_PRESETS.filter((key) => key !== filter.assignee).map((key) => ({
      id: `assignee.${key}`,
      label: ASSIGNEE_PRESET_LABELS[key],
      keywords: ['owner', 'assignee', 'filter'],
      icon: icons['filter.assignee'],
      onSelect: () => handlers.setAssignee(key),
    })),
    ...context.teammates
      .filter((member) => userAssigneeKey(member.userAccountId) !== filter.assignee)
      .map((member) => ({
        id: `assignee.u:${member.userAccountId}`,
        label: member.name,
        description: 'Show only their contacts',
        keywords: ['owner', 'assignee', 'mine'],
        icon: icons['filter.assignee'],
        onSelect: () => handlers.setAssignee(userAssigneeKey(member.userAccountId)),
      })),
  ];
  if (owners.length > 0) {
    groups.push({ id: 'assignee', label: 'Filter by owner', items: owners });
  }

  const stages: CommandItem[] = ALL_STAGES.filter((stage) => !onlyStage(filter, stage)).map((stage) => ({
    id: `stage.${stage}`,
    label: `Only ${STAGE_LABELS[stage]}`,
    keywords: ['stage', 'pipeline', 'sales'],
    icon: icons['filter.stage'],
    onSelect: () => handlers.setStages([stage]),
  }));
  if (filter.stages.length > 0) {
    stages.unshift({
      id: 'stage.all',
      label: 'All stages',
      keywords: ['stage', 'clear'],
      icon: icons['filter.stage'],
      onSelect: () => handlers.setStages([]),
    });
  }
  if (stages.length > 0) groups.push({ id: 'stage', label: 'Filter by stage', items: stages });

  const channels: CommandItem[] = ALL_PLATFORMS.filter((platform) => !onlyPlatform(filter, platform)).map(
    (platform) => ({
      id: `channel.${platform}`,
      label: `Only ${PLATFORM_LABELS[platform]}`,
      keywords: ['channel', 'platform', 'source'],
      icon: icons['filter.channel'],
      onSelect: () => handlers.setPlatforms([platform]),
    }),
  );
  if (isPlatformSubset(filter)) {
    channels.unshift({
      id: 'channel.all',
      label: 'All channels',
      keywords: ['channel', 'clear'],
      icon: icons['filter.channel'],
      onSelect: () => handlers.setPlatforms([...ALL_PLATFORMS]),
    });
  }
  if (channels.length > 0) groups.push({ id: 'channel', label: 'Filter by channel', items: channels });

  /* Density is a property of rows. On a surface that renders no rows the
     command would change nothing anyone can see. */
  if (context.view === 'list' && !context.recordOpen) {
    const densities = DENSITIES.filter((density) => density !== context.density);
    if (densities.length > 0) {
      groups.push({
        id: 'density',
        label: 'Row density',
        items: densities.map((density) => ({
          id: `density.${density}`,
          label: `${DENSITY_LABELS[density]} rows`,
          keywords: ['rows', 'spacing', 'compact'],
          icon: icons.density,
          onSelect: () => handlers.setDensity(density),
        })),
      });
    }
  }

  return groups;
}
