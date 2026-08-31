import { useMemo } from 'react';
import {
  Command,
  IconBook,
  IconChevronDown,
  IconChevronUp,
  IconMessage,
  IconPin,
  IconPlus,
  IconSearch,
  IconSend,
  IconTag,
} from '~ui';
import {
  buildCommandGroups,
  type CoworkerCommandContext,
  type CoworkerCommandHandlers,
  type CoworkerCommandIcons,
} from '../lib/commands';

export interface CoworkerCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: CoworkerCommandContext;
  handlers: CoworkerCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state — is in
 * `lib/commands.ts` and has tests. This file is the JSX the pure module cannot
 * hold: a `.ts` cannot render an icon, and turning the rules into a `.tsx` to
 * carry a dozen of them would take them out of the suite.
 */
const ICONS: CoworkerCommandIcons = {
  newChat: <IconPlus size={14} />,
  search: <IconSearch size={14} />,
  focusComposer: <IconSend size={14} />,
  nextChat: <IconChevronDown size={14} />,
  prevChat: <IconChevronUp size={14} />,
  pin: <IconPin size={14} />,
  unpin: <IconPin size={14} />,
  rename: <IconTag size={14} />,
  shortcuts: <IconBook size={14} />,
  chat: <IconMessage size={14} />,
  chatPinned: <IconPin size={14} />,
};

export function CoworkerCommandPalette({ open, onClose, context, handlers }: CoworkerCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);
  return (
    <Command
      open={open}
      onClose={onClose}
      groups={groups}
      placeholder="Search commands, chats and suggestions…"
      empty="Nothing matches"
    />
  );
}
