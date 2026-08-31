import { useMemo } from 'react';
import {
  Command,
  IconCalendar,
  IconFilter,
  IconKanban,
  IconLayoutList,
  IconPin,
  IconRefresh,
  IconSearch,
  IconUndo,
  IconUser,
} from '~ui';
import {
  buildCommandGroups,
  type DealsCommandContext,
  type DealsCommandHandlers,
  type DealsCommandIcons,
} from '../lib/commands';

export interface DealsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: DealsCommandContext;
  handlers: DealsCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state — is in
 * `lib/commands.ts` and has tests. This file is the JSX the pure module cannot
 * hold: a `.ts` cannot render an icon, and turning the rules into a `.tsx` to
 * carry eight of them would take them out of the test suite.
 */
const ICONS: DealsCommandIcons = {
  'view.board': <IconKanban size={14} />,
  'view.table': <IconLayoutList size={14} />,
  'view.forecast': <IconCalendar size={14} />,
  'filter.clear': <IconFilter size={14} />,
  'filter.assignee': <IconUser size={14} />,
  search: <IconSearch size={14} />,
  refresh: <IconRefresh size={14} />,
  undo: <IconUndo size={14} />,
  savedView: <IconPin size={14} />,
};

export function DealsCommandPalette({ open, onClose, context, handlers }: DealsCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);

  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
