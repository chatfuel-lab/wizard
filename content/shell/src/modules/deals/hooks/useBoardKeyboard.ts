import { useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { parseBindings, resolveHotkey } from '~ui';
import { columnIds, nextFocus, positionOf, rangeIds, resolveFocus, type BoardOrder } from '../lib/boardFocus';
import { isRestricted } from '../lib/dragPayload';
import { BOARD_BINDINGS, type BoardShortcutId } from '../lib/shortcuts';
import { stageForKey } from '../lib/stageKeys';
import type { DealCard } from '../types';

/* Parsed once. The specs come from lib/shortcuts.ts — the same list the `?`
 * sheet renders — so the documented map and the handler cannot drift. */
const PARSED = parseBindings(BOARD_BINDINGS);

/** id → the nextFocus key it stands for. */
const NAV_KEY: Partial<Record<BoardShortcutId, string>> = {
  focusUp: 'ArrowUp',
  focusDown: 'ArrowDown',
  focusLeft: 'ArrowLeft',
  focusRight: 'ArrowRight',
  focusStart: 'Home',
  focusEnd: 'End',
  extendUp: 'ArrowUp',
  extendDown: 'ArrowDown',
};

const STAGE_KEY: Partial<Record<BoardShortcutId, string>> = {
  stage1: '1',
  stage2: '2',
  stage3: '3',
  stage4: '4',
  stage5: '5',
  stage6: '6',
  stagePrev: '[',
  stageNext: ']',
};

export interface UseBoardKeyboardInput {
  order: BoardOrder;
  collapsed: readonly SalesStageV2[];
  byId: Record<string, DealCard>;
  selection: readonly string[];
  canEdit: boolean;
  /** True while a pointer drag is live — Escape belongs to the drag then. */
  dragging: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSetSelection: (ids: readonly string[]) => void;
  onClearSelection: () => void;
  onSetStage: (card: DealCard, to: SalesStageV2) => void;
}

export interface BoardKeyboard {
  /** The card that owns the board's single tab stop. */
  focusedId: string | null;
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, card: DealCard) => void;
  onCardFocus: (id: string) => void;
  onCardBlur: (event: { relatedTarget: EventTarget | null }) => void;
  registerCard: (id: string) => (node: HTMLElement | null) => void;
}

/**
 * The board's keyboard: one tab stop, arrows inside it, and focus that survives
 * a card moving between columns.
 *
 * Before this every card was `tabIndex={0}`, so reaching the sixth column meant
 * about 120 Tab presses, and a stage change dropped focus on the floor — the
 * card unmounts from one column and remounts in another, so the browser hands
 * focus back to `<body>` and the next keystroke goes nowhere.
 *
 * Focus is keyed by **id**, not by position, which is what makes the second
 * half work: the id is stable across the unmount, so the layout effect below
 * finds the new node and restores focus to the same card in its new column.
 */
export function useBoardKeyboard({
  order,
  collapsed,
  byId,
  selection,
  canEdit,
  dragging,
  onOpen,
  onToggleSelect,
  onSetSelection,
  onClearSelection,
  onSetStage,
}: UseBoardKeyboardInput): BoardKeyboard {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  /** Anchor for Shift+arrow ranges — moves with a plain arrow, like a table. */
  const anchorRef = useRef<string | null>(null);
  /** Whether the board currently owns the user's focus. */
  const ownsFocusRef = useRef(false);

  /* The tab stop. When nothing is focused — or the focused card has gone — it
   * falls to the first card, so Tab always lands somewhere sensible. */
  const tabStop = useMemo(() => resolveFocus(order, collapsed, focusedId), [order, collapsed, focusedId]);

  /**
   * Put focus back after the DOM moved underneath it.
   *
   * Depends on `order` as well as `focusedId`: a stage change does not change
   * which card is focused, only which column it lives in, so without the order
   * dependency this would never re-run and focus would stay on `<body>`.
   *
   * The two guards are what stop it from being a focus thief. It only acts when
   * the board already owned focus, and only when focus has fallen to `<body>`
   * (an unmount) — never when the user has deliberately clicked elsewhere, and
   * never when some other card already holds it.
   */
  useLayoutEffect(() => {
    if (!ownsFocusRef.current || !focusedId) return;
    const node = nodesRef.current.get(focusedId);
    if (!node || node === document.activeElement) return;
    if (document.activeElement !== document.body) return;
    node.focus({ preventScroll: false });
  }, [focusedId, order]);

  const focus = useCallback((id: string | null) => {
    if (!id) return;
    setFocusedId(id);
    ownsFocusRef.current = true;
    /* Focus the node now rather than waiting for the effect: within one keydown
     * the node already exists, and going through the effect would let the
     * browser scroll to the old tab stop first. */
    nodesRef.current.get(id)?.focus({ preventScroll: false });
  }, []);

  const onCardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, card: DealCard) => {
      if (event.defaultPrevented) return;

      const result = resolveHotkey(PARSED, event, null, 0, false);
      const id = result.fired;
      if (!id) return;

      /* Everything except opening needs edit rights; a restricted contact has
       * none of them. `Enter` stays available so the panel is still reachable. */
      const interactive = canEdit && !isRestricted(card);
      if (id !== 'open' && id !== 'clear' && !interactive) return;

      const navKey = NAV_KEY[id];
      if (navKey) {
        const target = nextFocus({ order, collapsed, current: card.id, key: navKey });
        if (!target) return;
        event.preventDefault();

        if (id === 'extendUp' || id === 'extendDown') {
          /* The anchor stays where the range started, so extending and then
           * shrinking walks back over the same cards. */
          if (!anchorRef.current || !positionOf(order, anchorRef.current)) {
            anchorRef.current = card.id;
          }
          const range = rangeIds(order, anchorRef.current, target);
          if (range) onSetSelection(range);
        } else {
          anchorRef.current = target;
        }
        focus(target);
        return;
      }

      const stageKey = STAGE_KEY[id];
      if (stageKey) {
        const to = stageForKey(stageKey, card.salesStageV2);
        /* `[` at New and `]` at Lost return null: no wrapping. Not preventing
         * default there leaves the bracket available to whatever else wants it. */
        if (!to) return;
        event.preventDefault();
        onSetStage(card, to);
        return;
      }

      switch (id) {
        case 'open':
          event.preventDefault();
          onOpen(card.id);
          return;
        case 'toggleSelect':
          // Without this the column scrolls instead of selecting.
          event.preventDefault();
          anchorRef.current = card.id;
          onToggleSelect(card.id);
          return;
        case 'selectColumn':
          event.preventDefault();
          anchorRef.current = card.id;
          onSetSelection(columnIds(order, card.id));
          return;
        case 'clear':
          /* A live drag owns Escape — useDragSession cancels it on window, and
           * clearing the selection out from under a drop would be the opposite
           * of what the key means there. */
          if (dragging) return;
          if (selection.length === 0) return;
          event.preventDefault();
          anchorRef.current = null;
          onClearSelection();
          return;
      }
    },
    [
      order,
      collapsed,
      canEdit,
      dragging,
      selection.length,
      focus,
      onOpen,
      onToggleSelect,
      onSetSelection,
      onClearSelection,
      onSetStage,
    ],
  );

  const onCardFocus = useCallback((id: string) => {
    ownsFocusRef.current = true;
    setFocusedId(id);
  }, []);

  const onCardBlur = useCallback((event: { relatedTarget: EventTarget | null }) => {
    /* Focus left for something that is not a card. If it is another card, its
     * own onFocus is about to fire and this must not undo it. */
    const next = event.relatedTarget;
    if (next instanceof HTMLElement && next.dataset.dealCard === 'true') return;
    ownsFocusRef.current = false;
  }, []);

  const registerCard = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) nodesRef.current.set(id, node);
      else nodesRef.current.delete(id);
    },
    [],
  );

  /* `byId` is not read here, but a card that vanished from it is one whose
   * node has already been unregistered — the map self-cleans on unmount. */
  void byId;

  return { focusedId: tabStop, onCardKeyDown, onCardFocus, onCardBlur, registerCard };
}
