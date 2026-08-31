import { useMemo } from 'react';
import {
  Command,
  IconClose,
  IconContacts,
  IconFilter,
  IconLayoutGrid,
  IconLayoutList,
  IconMessage,
  IconPin,
  IconRefresh,
  IconSearch,
  IconTag,
  IconUndo,
  IconUser,
} from '~ui';
import {
  buildCommandGroups,
  type ContactsCommandContext,
  type ContactsCommandHandlers,
  type ContactsCommandIcons,
} from '../lib/commands';

export interface ContactsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: ContactsCommandContext;
  handlers: ContactsCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * Every judgement — which commands exist in which state — lives in
 * `lib/commands.ts` and has tests. This file is the JSX that pure module cannot
 * hold: a `.ts` cannot render an icon, and moving the rules into a `.tsx` to
 * carry twelve of them would take them out of the test suite.
 */
const ICONS: ContactsCommandIcons = {
  'view.list': <IconContacts size={14} />,
  'view.fields': <IconTag size={14} />,
  'view.audience': <IconLayoutGrid size={14} />,
  'filter.clear': <IconFilter size={14} />,
  'filter.assignee': <IconUser size={14} />,
  'filter.stage': <IconTag size={14} />,
  'filter.channel': <IconMessage size={14} />,
  'filter.unread': <IconMessage size={14} />,
  density: <IconLayoutList size={14} />,
  search: <IconSearch size={14} />,
  refresh: <IconRefresh size={14} />,
  undo: <IconUndo size={14} />,
  closeRecord: <IconClose size={14} />,
  savedView: <IconPin size={14} />,
};

export function ContactsCommandPalette({ open, onClose, context, handlers }: ContactsCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);

  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
