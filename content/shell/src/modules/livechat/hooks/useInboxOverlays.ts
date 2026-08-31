import { useMemo, useReducer } from 'react';
import { inboxOverlaysReducer, initialInboxOverlayState, type InboxOverlayState } from '../lib/inboxOverlays';

export interface InboxOverlayActions {
  paletteToggled: () => void;
  paletteOpened: () => void;
  paletteClosed: () => void;
  shortcutsOpened: () => void;
  shortcutsClosed: () => void;
  flowPickerOpened: () => void;
  flowPickerClosed: () => void;
  newConversationOpened: () => void;
  newConversationClosed: () => void;
  panelChosen: (choice: boolean) => void;
  assignRequested: () => void;
  takeOverRequested: () => void;
  conversationSwitched: () => void;
}

/**
 * `lib/inboxOverlays` bound to a reducer, one stable callback per action.
 *
 * Consumers DESTRUCTURE the actions — they go into dependency arrays, and an
 * actions object rebuilt per render would re-key every one of those arrays on
 * every render.
 */
export function useInboxOverlays(): InboxOverlayState & InboxOverlayActions {
  const [state, dispatch] = useReducer(inboxOverlaysReducer, initialInboxOverlayState);
  const actions = useMemo<InboxOverlayActions>(
    () => ({
      paletteToggled: () => dispatch({ type: 'paletteToggled' }),
      paletteOpened: () => dispatch({ type: 'paletteOpened' }),
      paletteClosed: () => dispatch({ type: 'paletteClosed' }),
      shortcutsOpened: () => dispatch({ type: 'shortcutsOpened' }),
      shortcutsClosed: () => dispatch({ type: 'shortcutsClosed' }),
      flowPickerOpened: () => dispatch({ type: 'flowPickerOpened' }),
      flowPickerClosed: () => dispatch({ type: 'flowPickerClosed' }),
      newConversationOpened: () => dispatch({ type: 'newConversationOpened' }),
      newConversationClosed: () => dispatch({ type: 'newConversationClosed' }),
      panelChosen: (choice: boolean) => dispatch({ type: 'panelChosen', choice }),
      assignRequested: () => dispatch({ type: 'assignRequested' }),
      takeOverRequested: () => dispatch({ type: 'takeOverRequested' }),
      conversationSwitched: () => dispatch({ type: 'conversationSwitched' }),
    }),
    [],
  );
  return { ...state, ...actions };
}
