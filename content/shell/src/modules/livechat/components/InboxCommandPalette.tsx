import { useMemo } from 'react';
import { Command, IconBook, IconCheck, IconFilter, IconFlow, IconPlus, IconSearch, IconUser } from '~ui';
import {
  buildInboxCommandGroups,
  type InboxCommandContext,
  type InboxCommandHandlers,
  type InboxCommandIcons,
} from '../lib/inboxCommands';

export interface InboxCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: InboxCommandContext;
  handlers: InboxCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state — is in
 * `lib/inboxCommands.ts` and has tests. This file is the JSX the pure module
 * cannot hold: a `.ts` cannot render an icon, and turning the rules into a
 * `.tsx` to carry six of them would take them out of the test suite.
 */
const ICONS: InboxCommandIcons = {
  close: <IconFlow size={14} />,
  takeOver: <IconCheck size={14} />,
  assign: <IconUser size={14} />,
  contact: <IconUser size={14} />,
  newConversation: <IconPlus size={14} />,
  search: <IconSearch size={14} />,
  'filter.clear': <IconFilter size={14} />,
  shortcuts: <IconBook size={14} />,
};

export function InboxCommandPalette({ open, onClose, context, handlers }: InboxCommandPaletteProps) {
  const groups = useMemo(() => buildInboxCommandGroups(context, handlers, ICONS), [context, handlers]);

  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
