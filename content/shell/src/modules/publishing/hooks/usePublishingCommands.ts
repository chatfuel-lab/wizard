import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useHotkeys, type Band } from '~ui';
import { effectiveMode } from '../lib/calendarPlacement';
import type { PublishingCommandContext, PublishingCommandHandlers } from '../lib/commands';
import { NEW_POST, type PublishingAddress } from '../lib/publishingParams';
import { WORKSPACE_BINDINGS, type WorkspaceShortcutId } from '../lib/shortcuts';

export interface PublishingCommandsArgs {
  /** The module root: what every shortcut in here is scoped against. */
  rootRef: RefObject<HTMLElement | null>;
  address: PublishingAddress;
  band: Band;
  /** True once a connected account may publish — the gate the workspace answered. */
  accountReady: boolean;
  patch: (next: Partial<PublishingAddress>) => void;
  onCompose: (target: string, at?: string | null) => void;
  refresh: () => void;
}

export interface PublishingCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: PublishingCommandContext;
  commandHandlers: PublishingCommandHandlers;
}

/**
 * The keyboard and the palette: what the commands can see, what they can do,
 * and the workspace shortcuts that reach the same handlers. Binds `useHotkeys`
 * itself, so mounting this hook IS enabling the module's keyboard.
 */
export function usePublishingCommands({
  rootRef,
  address,
  band,
  accountReady,
  patch,
  onCompose,
  refresh,
}: PublishingCommandsArgs): PublishingCommandsApi {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /**
   * `/`, on whichever view is open.
   *
   * A view's filter is the view's own control, so the shortcut reaches it
   * through the DOM rather than through a prop every view would have to thread:
   * `data-publishing-filter` is the contract. It is a segmented control and not
   * a text box, so what gets focus is its one roving tab stop — from there the
   * arrow keys walk the options. The calendar has no filter and answers nothing.
   */
  const focusFilter = useCallback(() => {
    const control = rootRef.current?.querySelector<HTMLElement>('[data-publishing-filter]');
    const target =
      control?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ??
      control?.querySelector<HTMLElement>('[role="radio"]');
    target?.focus();
  }, [rootRef]);

  /**
   * Today, and the library's pull from Instagram: two commands whose state
   * belongs to the view, reached the same way `/` reaches a view's filter.
   *
   * Neither could be done from up here. The day a week is drawn around is the
   * calendar's own state — the address carries a month and no day, so writing
   * `?month=` would leave the anchor exactly where it was — and the library's
   * media is fetched by the library. Pressing the view's own button is one data
   * attribute against a prop every view would have to thread up and back, and
   * it keeps the command and the button honest: the palette offers each of them
   * only on the view whose toolbar draws it.
   */
  const pressInView = useCallback(
    (attribute: string) => {
      rootRef.current?.querySelector<HTMLButtonElement>(`[${attribute}]`)?.click();
    },
    [rootRef],
  );

  const goToday = useCallback(() => pressInView('data-publishing-today'), [pressInView]);
  const pullLibrary = useCallback(() => pressInView('data-publishing-pull'), [pressInView]);

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'filter':
          return focusFilter();
        case 'refresh':
          return refresh();
        case 'newPost':
          /* Same condition as the button: there is no composer to open onto an
             account that cannot publish. */
          return accountReady ? onCompose(NEW_POST) : undefined;
        case 'goCalendar':
          return patch({ view: 'calendar' });
        case 'goQueue':
          return patch({ view: 'queue' });
        case 'goLibrary':
          return patch({ view: 'library' });
      }
    },
    [focusFilter, refresh, accountReady, onCompose, patch],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  const commandContext: PublishingCommandContext = useMemo(
    () => ({
      view: address.view,
      requestedMode: address.mode,
      mode: effectiveMode(address.mode, band),
      status: address.status,
      kind: address.kind,
      accountReady,
    }),
    [address.view, address.mode, address.status, address.kind, band, accountReady],
  );

  const commandHandlers: PublishingCommandHandlers = useMemo(
    () => ({
      setView: (next) => patch({ view: next }),
      setMode: (mode) => patch({ mode }),
      setStatus: (status) => patch({ status }),
      setKind: (kind) => patch({ kind }),
      newPost: () => onCompose(NEW_POST),
      today: goToday,
      refresh,
      pullLibrary,
      openShortcuts: () => setShortcutsOpen(true),
    }),
    [patch, onCompose, goToday, refresh, pullLibrary],
  );

  return { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers };
}
