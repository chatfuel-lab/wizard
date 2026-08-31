import { describe, expect, it } from 'vitest';
import {
  inboxOverlaysReducer,
  initialInboxOverlayState,
  type InboxOverlayAction,
  type InboxOverlayState,
} from './inboxOverlays';

const run = (state: InboxOverlayState, ...actions: InboxOverlayAction[]): InboxOverlayState =>
  actions.reduce(inboxOverlaysReducer, state);

describe('the request counters', () => {
  it('only ever increment — a value that moved any other way would replay an answered request', () => {
    let state = initialInboxOverlayState;
    const everyAction: InboxOverlayAction[] = [
      { type: 'paletteToggled' },
      { type: 'paletteOpened' },
      { type: 'paletteClosed' },
      { type: 'shortcutsOpened' },
      { type: 'shortcutsClosed' },
      { type: 'flowPickerOpened' },
      { type: 'flowPickerClosed' },
      { type: 'newConversationOpened' },
      { type: 'newConversationClosed' },
      { type: 'panelChosen', choice: false },
      { type: 'assignRequested' },
      { type: 'takeOverRequested' },
      { type: 'conversationSwitched' },
    ];
    for (const action of everyAction) {
      const next = inboxOverlaysReducer(state, action);
      expect(next.assignRequest).toBeGreaterThanOrEqual(state.assignRequest);
      expect(next.takeOverRequest).toBeGreaterThanOrEqual(state.takeOverRequest);
      state = next;
    }
    expect(run(state, { type: 'assignRequested' }).assignRequest).toBe(state.assignRequest + 1);
    expect(run(state, { type: 'takeOverRequested' }).takeOverRequest).toBe(state.takeOverRequest + 1);
  });
});

describe('assignRequested', () => {
  it('opens the panel and bumps the request in one action', () => {
    const state = inboxOverlaysReducer(initialInboxOverlayState, { type: 'assignRequested' });
    expect(state.panelChoice).toBe(true);
    expect(state.assignRequest).toBe(1);
  });

  it('overrides an explicit "closed" choice — the focus request must be seen', () => {
    const closed = inboxOverlaysReducer(initialInboxOverlayState, { type: 'panelChosen', choice: false });
    const state = inboxOverlaysReducer(closed, { type: 'assignRequested' });
    expect(state.panelChoice).toBe(true);
  });
});

describe('conversationSwitched', () => {
  it("closes only the flow picker — the other dialogs are the module's, not a conversation's", () => {
    const everything = run(
      initialInboxOverlayState,
      { type: 'paletteOpened' },
      { type: 'shortcutsOpened' },
      { type: 'flowPickerOpened' },
      { type: 'newConversationOpened' },
    );
    const state = inboxOverlaysReducer(everything, { type: 'conversationSwitched' });
    expect(state.flowPickerOpen).toBe(false);
    expect(state.paletteOpen).toBe(true);
    expect(state.shortcutsOpen).toBe(true);
    expect(state.newConversationOpen).toBe(true);
  });

  it('is a no-op object when the picker is already shut', () => {
    expect(inboxOverlaysReducer(initialInboxOverlayState, { type: 'conversationSwitched' })).toBe(
      initialInboxOverlayState,
    );
  });
});

describe('the dialogs', () => {
  it('open, close, and the palette toggles', () => {
    const open = run(
      initialInboxOverlayState,
      { type: 'paletteToggled' },
      { type: 'shortcutsOpened' },
      { type: 'flowPickerOpened' },
      { type: 'newConversationOpened' },
    );
    expect(open.paletteOpen).toBe(true);
    expect(open.shortcutsOpen).toBe(true);
    expect(open.flowPickerOpen).toBe(true);
    expect(open.newConversationOpen).toBe(true);
    const shut = run(
      open,
      { type: 'paletteToggled' },
      { type: 'shortcutsClosed' },
      { type: 'flowPickerClosed' },
      { type: 'newConversationClosed' },
    );
    expect(shut.paletteOpen).toBe(false);
    expect(shut.shortcutsOpen).toBe(false);
    expect(shut.flowPickerOpen).toBe(false);
    expect(shut.newConversationOpen).toBe(false);
  });

  it('the panel choice starts as "follow the layout" and holds a choice once made', () => {
    expect(initialInboxOverlayState.panelChoice).toBeNull();
    const chosen = inboxOverlaysReducer(initialInboxOverlayState, { type: 'panelChosen', choice: true });
    expect(chosen.panelChoice).toBe(true);
    expect(inboxOverlaysReducer(chosen, { type: 'panelChosen', choice: false }).panelChoice).toBe(false);
  });
});
