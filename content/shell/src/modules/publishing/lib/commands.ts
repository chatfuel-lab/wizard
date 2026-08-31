/**
 * What the ⌘K palette offers, as data.
 *
 * **Workspace-scoped on purpose** (deals' rule): every command acts on state
 * `PublishingWorkspace` already owns — the view, the shape the calendar is
 * drawn in, the queue's status filter, the library's kind filter, the composer
 * and the account gate. Nothing acts on a selection: the queue's bulk actions
 * live on its action bar, where the count is visible and the target is
 * unambiguous. "Delete 4 posts" typed blind into a palette is a worse version
 * of selecting them and pressing a button.
 *
 * Two commands reach a control the workspace does not own — Today and the
 * library's pull — and both go through a data attribute rather than a prop, the
 * same way `/` reaches whichever filter is on screen. They are offered only on
 * the view whose toolbar draws the control, so the command and the button
 * appear and disappear together.
 *
 * Nothing here restates a key. `shortcutChips` reads the binding out of
 * `lib/shortcuts.ts`, so a rebinding moves the palette with it — the rule the
 * `?` sheet already lives by.
 *
 * Pure, so "which commands exist in which state" is a test rather than a
 * component to click through. Icons arrive as a map from the component: a `.ts`
 * file cannot render JSX, and turning this into a `.tsx` to hold ten icons
 * would take the rules out of the test suite.
 */
import type { ReactNode } from 'react';
import type { CommandGroup, CommandItem } from '~ui';
import { LIBRARY_KINDS, LIBRARY_KIND_LABEL } from './libraryItems';
import type { CalendarMode, LibraryKind, PublishingView } from './publishingParams';
import { STATUS_META, STATUS_ORDER } from './queueColumns';
import { shortcutChips } from './shortcuts';
import type { PostStatus } from '../types';

export type PublishingCommandId =
  | 'new'
  | 'pull'
  | 'refresh'
  | 'shortcuts'
  | 'today'
  | 'mode.month'
  | 'mode.week'
  | 'mode.list'
  | 'view.calendar'
  | 'view.queue'
  | 'view.library'
  | 'filter.status'
  | 'filter.kind';

export interface PublishingCommandContext {
  view: PublishingView;
  /**
   * What the address asks the calendar for — the shape the mode control shows
   * as chosen, and so the one this does not offer again.
   */
  requestedMode: CalendarMode;
  /**
   * The shape actually drawn. A container too narrow for seven columns falls
   * the month back to the list, and the list has no period to go home to — the
   * same reason the toolbar draws no Today button there.
   */
  mode: CalendarMode;
  /** The queue's filter. Null is every status. */
  status: PostStatus | null;
  /** The library's filter. Null is every kind. */
  kind: LibraryKind | null;
  /**
   * True once a connected account may publish. Nothing composes without one,
   * and nothing can be pulled from an account that has not answered.
   */
  accountReady: boolean;
}

export interface PublishingCommandHandlers {
  setView: (view: PublishingView) => void;
  setMode: (mode: CalendarMode) => void;
  setStatus: (status: PostStatus | null) => void;
  setKind: (kind: LibraryKind | null) => void;
  newPost: () => void;
  today: () => void;
  refresh: () => void;
  pullLibrary: () => void;
  openShortcuts: () => void;
}

export type PublishingCommandIcons = Partial<Record<PublishingCommandId, ReactNode>>;

const VIEW_LABELS: Record<PublishingView, string> = {
  calendar: 'Calendar',
  queue: 'Queue',
  library: 'Library',
};

const VIEW_KEYWORDS: Record<PublishingView, readonly string[]> = {
  calendar: ['schedule', 'month', 'week', 'grid', 'when'],
  queue: ['list', 'table', 'rows', 'failed', 'errors', 'drafts'],
  library: ['media', 'instagram', 'photos', 'reels', 'grid', 'account'],
};

const VIEW_SHORTCUT: Record<PublishingView, readonly string[]> = {
  calendar: shortcutChips('goCalendar'),
  queue: shortcutChips('goQueue'),
  library: shortcutChips('goLibrary'),
};

const VIEWS: readonly PublishingView[] = ['calendar', 'queue', 'library'];

/** The names the calendar's own control prints, in the order it prints them. */
const MODE_LABELS: Record<CalendarMode, string> = {
  month: 'Month',
  week: 'Week',
  list: 'List',
};

const MODE_SHORTCUT: Record<CalendarMode, readonly string[]> = {
  month: shortcutChips('modeMonth'),
  week: shortcutChips('modeWeek'),
  list: shortcutChips('modeList'),
};

const MODES: readonly CalendarMode[] = ['month', 'week', 'list'];

export function buildCommandGroups(
  context: PublishingCommandContext,
  handlers: PublishingCommandHandlers,
  icons: PublishingCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];

  /* Actions first: a palette is opened to DO something far more often than to
     navigate, and an empty query shows the top group first. */
  const actions: CommandItem[] = [];

  if (context.accountReady) {
    actions.push({
      id: 'new',
      label: 'New post',
      keywords: ['create', 'add', 'compose', 'write', 'schedule'],
      shortcut: shortcutChips('newPost'),
      icon: icons.new,
      onSelect: handlers.newPost,
    });
  }

  actions.push({
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'refetch'],
    shortcut: shortcutChips('refresh'),
    icon: icons.refresh,
    onSelect: handlers.refresh,
  });

  /* The library's own button, and only where it is drawn. The other two views
     read this app's queue and have nothing to pull down. */
  if (context.view === 'library' && context.accountReady) {
    actions.push({
      id: 'pull',
      label: 'Refresh from Instagram',
      keywords: ['pull', 'sync', 'fetch', 'media', 'account'],
      icon: icons.pull,
      onSelect: handlers.pullLibrary,
    });
  }

  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: shortcutChips('help'),
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  groups.push({ id: 'actions', label: 'Actions', items: actions });

  if (context.view === 'calendar') {
    const calendar: CommandItem[] = [];

    /* The list runs from the first post to the last: it has no period, so it
       has nowhere to go home to — which is why the toolbar draws no Today
       button there either. */
    if (context.mode !== 'list') {
      calendar.push({
        id: 'today',
        label: 'Go to today',
        keywords: ['now', 'jump', 'this week', 'this month'],
        shortcut: shortcutChips('today'),
        icon: icons.today,
        onSelect: handlers.today,
      });
    }

    /* The shape already chosen is not a destination. It is the REQUESTED one,
       not the drawn one: a month that fell back to the list is still the
       choice, and offering "Month" would be offering what is already selected. */
    for (const mode of MODES) {
      if (mode === context.requestedMode) continue;
      calendar.push({
        id: `mode.${mode}`,
        label: MODE_LABELS[mode],
        keywords: ['calendar', 'layout', 'shape', 'period'],
        shortcut: MODE_SHORTCUT[mode],
        icon: icons[`mode.${mode}` as PublishingCommandId],
        onSelect: () => handlers.setMode(mode),
      });
    }

    groups.push({ id: 'calendar', label: 'Calendar', items: calendar });
  }

  /* The view you are already on is not a destination. */
  const elsewhere = VIEWS.filter((view) => view !== context.view);
  groups.push({
    id: 'go',
    label: 'Go to',
    items: elsewhere.map((view) => ({
      id: `view.${view}`,
      label: VIEW_LABELS[view],
      keywords: VIEW_KEYWORDS[view],
      shortcut: VIEW_SHORTCUT[view],
      icon: icons[`view.${view}` as PublishingCommandId],
      onSelect: () => handlers.setView(view),
    })),
  });

  if (context.view === 'queue') {
    const statuses: CommandItem[] = [];
    if (context.status !== null) {
      statuses.push({
        id: 'status.all',
        label: 'All posts',
        keywords: ['status', 'filter', 'clear', 'everything'],
        icon: icons['filter.status'],
        onSelect: () => handlers.setStatus(null),
      });
    }
    for (const status of STATUS_ORDER) {
      if (status === context.status) continue;
      statuses.push({
        id: `status.${status}`,
        label: STATUS_META[status].label,
        keywords: ['status', 'filter', 'queue'],
        icon: icons['filter.status'],
        onSelect: () => handlers.setStatus(status),
      });
    }
    groups.push({ id: 'status', label: 'Filter by status', items: statuses });
  }

  if (context.view === 'library') {
    const kinds: CommandItem[] = [];
    if (context.kind !== null) {
      kinds.push({
        id: 'kind.all',
        label: 'All media',
        keywords: ['kind', 'filter', 'clear', 'everything'],
        icon: icons['filter.kind'],
        onSelect: () => handlers.setKind(null),
      });
    }
    for (const kind of LIBRARY_KINDS) {
      if (kind === context.kind) continue;
      kinds.push({
        id: `kind.${kind}`,
        label: LIBRARY_KIND_LABEL[kind],
        keywords: ['kind', 'filter', 'media'],
        icon: icons['filter.kind'],
        onSelect: () => handlers.setKind(kind),
      });
    }
    groups.push({ id: 'kind', label: 'Filter by kind', items: kinds });
  }

  return groups;
}
