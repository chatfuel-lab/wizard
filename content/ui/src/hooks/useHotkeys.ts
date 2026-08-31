import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  isTypingTarget,
  parseBindings,
  resolveHotkey,
  type HotkeyBinding,
  type HotkeyPending,
} from '../lib/interaction/hotkeys';

export interface UseHotkeysOptions {
  /**
   * Focus must be inside this element — or nowhere at all — for anything to
   * fire. Two things fall out of that one rule, and both matter:
   *
   * - **Embed safety.** The module may be one panel of somebody else's app.
   *   ⌘K pressed in the host's own search box is the host's, not ours.
   * - **Layering, for free.** A Dialog, Drawer, Popover or the command palette
   *   itself is portalled to the body and holds focus, which is by definition
   *   outside this root — so module hotkeys stand down while one is open, and
   *   Escape unwinds through `useDismiss` a layer at a time with no ordering
   *   code here. A Tooltip does not move focus, so it correctly changes nothing.
   */
  rootRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

/**
 * One window keydown listener for a whole module.
 *
 * All the judgement lives in `lib/interaction/hotkeys.ts` as pure functions; this is the
 * DOM shell around it — which is the only honest split when vitest here runs
 * node-only with no jsdom.
 */
export function useHotkeys<T extends string>(
  bindings: readonly HotkeyBinding<T>[],
  onFire: (id: T, event: KeyboardEvent) => void,
  options?: UseHotkeysOptions,
): void {
  const { rootRef, enabled = true } = options ?? {};

  /* Signature, not the array: callers build these inline, so a reference dep
   * would tear the listener down and back up on every render. */
  const signature = bindings.map((b) => `${b.id}|${b.keys}|${b.scope ?? ''}`).join(',');
  const parsedRef = useRef(bindings);
  parsedRef.current = bindings;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the signature stands in for the array, which callers rebuild every render
  const parsed = useMemo(() => parseBindings(parsedRef.current), [signature]);

  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;
  const pendingRef = useRef<HotkeyPending<T> | null>(null);

  useEffect(() => {
    if (!enabled) {
      pendingRef.current = null;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      /* Something closer to the keystroke already dealt with it. */
      if (event.defaultPrevented) return;

      const root = rootRef?.current;
      if (root) {
        const active = document.activeElement;
        const inScope = active === null || active === document.body || root.contains(active);
        if (!inScope) {
          pendingRef.current = null;
          return;
        }
      }

      const target = event.target;
      const typing =
        target instanceof HTMLElement
          ? isTypingTarget(
              target.tagName,
              target.isContentEditable,
              target instanceof HTMLInputElement ? target.type : undefined,
            )
          : false;

      const result = resolveHotkey(parsed, event, pendingRef.current, Date.now(), typing);
      pendingRef.current = result.pending;
      if (result.consumed) event.preventDefault();
      if (result.fired !== null) onFireRef.current(result.fired, event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [parsed, enabled, rootRef]);
}
