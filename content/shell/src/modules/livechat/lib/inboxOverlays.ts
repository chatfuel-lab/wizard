/**
 * The inbox's overlay state as a pure reducer: the four dialogs, the contact
 * panel choice, and the two requests the thread pane honours.
 *
 * The dialogs are booleans. The two requests are counters, and a bump IS the
 * request: the thing that answers them lives in the thread pane's own hook,
 * this level has nothing to call, and reaching into the pane's DOM is not how
 * a mutation should be started. They only ever increment — the pane compares
 * against the last value it honoured, and a counter that moved any other way
 * would replay a request that was already answered.
 *
 * `assignRequested` couples two things on purpose: `a` opens the contact
 * panel AND asks it to focus its assignee control. One action, because a
 * request focused in a closed panel is a request nobody sees answered.
 *
 * `conversationSwitched` closes ONLY the flow picker: the picker belongs to
 * the conversation being left, while the dialogs above it — palette,
 * shortcuts, new conversation — are the module's, not a conversation's,
 * and stay.
 *
 * `panelChoice` starts as null, meaning "follow the layout"; the owner
 * derives the panel's open state from the band until the operator chooses.
 */
export interface InboxOverlayState {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  flowPickerOpen: boolean;
  newConversationOpen: boolean;
  /** The operator's explicit choice about the contact panel, or null for "follow the layout". */
  panelChoice: boolean | null;
  /** Bumped by `a` — the panel focuses its assignee control when it changes. */
  assignRequest: number;
  /** Bumped by the palette's "Take over" — the same call as the header button. */
  takeOverRequest: number;
}

export type InboxOverlayAction =
  | { type: 'paletteToggled' }
  | { type: 'paletteOpened' }
  | { type: 'paletteClosed' }
  | { type: 'shortcutsOpened' }
  | { type: 'shortcutsClosed' }
  | { type: 'flowPickerOpened' }
  | { type: 'flowPickerClosed' }
  | { type: 'newConversationOpened' }
  | { type: 'newConversationClosed' }
  | { type: 'panelChosen'; choice: boolean }
  | { type: 'assignRequested' }
  | { type: 'takeOverRequested' }
  | { type: 'conversationSwitched' };

export const initialInboxOverlayState: InboxOverlayState = {
  paletteOpen: false,
  shortcutsOpen: false,
  flowPickerOpen: false,
  newConversationOpen: false,
  panelChoice: null,
  assignRequest: 0,
  takeOverRequest: 0,
};

export function inboxOverlaysReducer(state: InboxOverlayState, action: InboxOverlayAction): InboxOverlayState {
  switch (action.type) {
    case 'paletteToggled':
      return { ...state, paletteOpen: !state.paletteOpen };
    case 'paletteOpened':
      return { ...state, paletteOpen: true };
    case 'paletteClosed':
      return { ...state, paletteOpen: false };
    case 'shortcutsOpened':
      return { ...state, shortcutsOpen: true };
    case 'shortcutsClosed':
      return { ...state, shortcutsOpen: false };
    case 'flowPickerOpened':
      return { ...state, flowPickerOpen: true };
    case 'flowPickerClosed':
      return { ...state, flowPickerOpen: false };
    case 'newConversationOpened':
      return { ...state, newConversationOpen: true };
    case 'newConversationClosed':
      return { ...state, newConversationOpen: false };
    case 'panelChosen':
      return { ...state, panelChoice: action.choice };
    case 'assignRequested':
      return { ...state, panelChoice: true, assignRequest: state.assignRequest + 1 };
    case 'takeOverRequested':
      return { ...state, takeOverRequest: state.takeOverRequest + 1 };
    case 'conversationSwitched':
      return state.flowPickerOpen ? { ...state, flowPickerOpen: false } : state;
  }
}
