import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { rovingAction, typeaheadIndex, type RovingOptions } from '../lib/interaction/roving';

export interface UseRovingFocusOptions extends RovingOptions {
  /** Item labels, enabling type-ahead. Omit to disable it. */
  labels?: readonly string[];
  /** How long a typed buffer stays alive. Default 500ms — the native menu feel. */
  typeaheadMs?: number;
}

export interface UseRovingFocusResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Spread onto each item: exactly one has tabIndex 0. */
  itemProps: (index: number) => { tabIndex: number; ref: (node: HTMLElement | null) => void };
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * One Tab stop for a group, arrow keys within it.
 *
 * `activeIndex` is clamped whenever `count` shrinks — menus here are built from
 * live server data, so items can disappear under the cursor.
 */
export function useRovingFocus(count: number, options?: UseRovingFocusOptions): UseRovingFocusResult {
  const { labels, typeaheadMs = 500, ...rovingOptions } = options ?? {};
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);
  const bufferRef = useRef('');
  const bufferTimerRef = useRef(0);

  useEffect(() => {
    itemsRef.current.length = count;
    setActiveIndex((current) => (current >= count ? count - 1 : current));
  }, [count]);

  /*
   * `.focus()` is a no-op inside a `visibility: hidden` subtree, and a floating
   * surface is exactly that between mount and measurement — FloatingSurface
   * hides it until useAnchoredPosition answers (it arms its own focus trap on
   * the same condition, for the same reason). A menu arming its first item on
   * mount therefore left focus on the trigger: arrow keys went nowhere,
   * because the keydown handler lives on the menu the user was never in.
   *
   * So: try, and if the element refused, try again on the next few frames.
   * Bounded, and abandoned the moment the node goes away or something else
   * legitimately takes focus.
   */
  const focusIndex = useCallback((index: number) => {
    setActiveIndex(index);
    const attempt = (framesLeft: number) => {
      const node = itemsRef.current[index];
      if (!node) return;
      node.focus({ preventScroll: false });
      if (document.activeElement === node || framesLeft === 0) return;
      requestAnimationFrame(() => attempt(framesLeft - 1));
    };
    attempt(5);
  }, []);

  const itemProps = useCallback(
    (index: number) => ({
      /* Exactly one Tab stop. Before anything is active that is the first
       * item, so Tab always lands somewhere sensible. */
      tabIndex: activeIndex === index || (activeIndex === -1 && index === 0) ? 0 : -1,
      ref: (node: HTMLElement | null) => {
        itemsRef.current[index] = node;
      },
    }),
    [activeIndex],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = rovingAction(event.key, count, activeIndex, rovingOptions);
      if (action.type === 'move') {
        event.preventDefault();
        focusIndex(action.index);
        return;
      }

      /* Type-ahead: single printable characters only, and never while a
       * modifier is held (Cmd+A must stay Select All). */
      if (!labels || event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === ' ' && bufferRef.current === '') return; // Space activates, it does not search

      window.clearTimeout(bufferTimerRef.current);
      bufferRef.current += event.key;
      bufferTimerRef.current = window.setTimeout(() => {
        bufferRef.current = '';
      }, typeaheadMs);

      const index = typeaheadIndex(labels, bufferRef.current, activeIndex, rovingOptions);
      if (index !== -1) {
        event.preventDefault();
        focusIndex(index);
      }
    },
    [count, activeIndex, focusIndex, labels, typeaheadMs, rovingOptions],
  );

  useEffect(() => () => window.clearTimeout(bufferTimerRef.current), []);

  return { activeIndex, setActiveIndex: focusIndex, itemProps, onKeyDown };
}
