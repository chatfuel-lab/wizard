import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useContainerBand } from '../hooks/useContainerBand';
import { isTypingTarget } from '../lib/interaction/hotkeys';
import type { Band } from '../lib/interaction/layout';

/**
 * Defaults to 'wide' outside a ModuleRoot, matching `useContainerBand`'s own
 * default — a component rendered in a gallery cell or a test with no root above
 * it gets the ordinary desktop layout rather than throwing.
 */
const BandContext = createContext<Band>('wide');

/** The module's own width band. Only meaningful inside a `ModuleRoot`. */
export function useBand(): Band {
  return useContext(BandContext);
}

export interface ModuleRootProps {
  children: ReactNode;
  className?: string;
}

/**
 * The outermost element of every module, and the thing that makes the rest of
 * the layout system work.
 *
 * It does three jobs at once, and they are the same job seen from three sides:
 *
 * 1. **It is the container.** `@container/module` means every `@wide:` /
 *    `@inline:` class anywhere below resolves against the module's box, not the
 *    viewport. That is the whole embed argument: a module can be 700px wide
 *    inside a 2560px screen.
 * 2. **It is the observed node.** The band comes from a ResizeObserver on this
 *    same element. That equality is the point — the rule "observe the module
 *    root, never the canvas" was a comment before, and comments do not stop
 *    anyone. A detail panel that opens beside the content narrows the canvas,
 *    so an observer *there* flips the band, closes the panel, widens the canvas
 *    and oscillates forever. Here it is structurally impossible to attach it to
 *    the wrong element, because the component owns the ref.
 * 3. **It scopes the fluid gutter.** `[data-band-scope]` is on the INNER
 *    element, because a container element cannot match its own container query.
 *    tokens.css re-assigns `--spacing-gutter` there, which retunes every
 *    `p-gutter` / `px-gutter` / `gap-gutter` already written below it — no
 *    responsive classes, no call-site edits.
 *
 * `useBand()` is NOT called here: validate pass 10b exists because a hook that
 * reads a context in the same component that renders its provider gets the
 * outer value, and the provider is still only a return value at that point.
 * Read the band in a child.
 *
 * 4. **It takes focus when it mounts.** `useHotkeys` fires only while focus is
 *    inside the module root or nowhere at all — that is what keeps a host's own
 *    keyboard working when the module is embedded. The cost, until this
 *    existed, was that arriving from a menu left focus on the menu item that
 *    was clicked, which is outside this root, and so every module shortcut was
 *    dead until something inside the module was clicked. Moving focus to the
 *    page that just opened is what a navigation is supposed to do anyway. It
 *    stands down while somebody is typing, because in an embed the host's own
 *    search box must not lose the caret to a panel appearing beside it.
 *
 * The ref is forwarded to the outer element — the module root proper, the one
 * that is the container and the observed node. A module needs that handle for
 * the things a band cannot answer: `useHotkeys` scoping focus, a
 * `querySelector` for the search input, `relative` for an `ActionBar` that is
 * deliberately not portalled. Without it every module grew its own wrapper div
 * to hold a ref to something that already existed one level up.
 */
export const ModuleRoot = forwardRef<HTMLDivElement, ModuleRootProps>(function ModuleRoot(
  { children, className },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const band = useContainerBand(rootRef);

  /* Merged, not replaced. The caller's ref and the ResizeObserver's ref have to
     be the same node or job 2 above quietly stops being true — an observer on
     one element and a hotkey scope on another is precisely the mismatch this
     component exists to make impossible. */
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const active = document.activeElement;
    const typing =
      active instanceof HTMLElement &&
      isTypingTarget(
        active.tagName,
        active.isContentEditable,
        active instanceof HTMLInputElement ? active.type : undefined,
      );
    if (typing) return;
    node.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={attach}
      /* Focusable only programmatically, and never drawn: this is the page, not
         a control. It is out of the Tab order and out of the focus ring. */
      tabIndex={-1}
      className="@container/module flex min-h-0 min-w-0 flex-1 flex-col outline-none"
    >
      <BandContext.Provider value={band}>
        <div data-band-scope data-band={band} className={`flex min-h-0 min-w-0 flex-1 flex-col ${className ?? ''}`}>
          {children}
        </div>
      </BandContext.Provider>
    </div>
  );
});
