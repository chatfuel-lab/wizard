import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { IconClose } from '../icons';
import { isTypingTarget } from '../lib/interaction/hotkeys';
import { bandAtLeast, type Band } from '../lib/interaction/layout';
import { Drawer } from '../overlay/Drawer';
import { useBand } from './ModuleRoot';

/** Which `--width-*` token sizes the inline column. */
export type InspectorWidth = 'inspector' | 'panel';

const WIDTH: Record<InspectorWidth, string> = {
  inspector: 'w-inspector',
  panel: 'w-panel',
};

export interface InspectorHostProps {
  open: boolean;
  onClose: () => void;
  /** Labels the region, the Drawer and the close button. */
  title: string;
  /**
   * The panel body, which pads itself. Both hosts hand it through untouched, so
   * a panel looks the same either side of the collapse band — the caller has no
   * way to know which host it landed in, so the hosts must not differ.
   */
  children: ReactNode;
  width?: InspectorWidth;
  /** From this band up the panel is an inline column; below it, a Drawer. */
  inlineFrom?: Band;
}

/**
 * Where a detail panel lives: a Drawer in a narrow container, an inline
 * right-hand column in a wide one, one body either way.
 *
 * Generalized out of Deals, where all of the following was learned the hard
 * way. Nothing below should be re-derived per module — flow-builder's inspector
 * has none of it today and is a permanent Escape-and-focus bug because of that.
 *
 * **Escape, and why it is a local handler rather than a layer.** The Drawer gets
 * Escape from `useDismiss` for free; an inline column gets nothing, which leaves
 * it with no keyboard close at all. The two tempting fixes are both wrong:
 *
 * - `useLayer` would register the column in `lib/interaction/layers.ts`. But it is not an
 *   overlay — it traps no focus, locks no scroll, owns no backdrop — and it
 *   stays open across dialogs, so it would sit permanently at the bottom of the
 *   stack. `Overlay` reads `isBottom()` to decide whether to make the
 *   background inert, so every dialog opened afterwards would quietly stop
 *   inerting the page behind it.
 * - A window listener would race the module's own `useHotkeys`, which is the
 *   only global binding a module is allowed to own.
 *
 * A React `onKeyDown` on the `<aside>` only ever sees keys pressed with focus
 * *inside* the panel, and that buys the unwinding order for nothing: a Dialog,
 * Popover or command palette portals to `document.body` and holds focus, so its
 * own `useDismiss` takes that Escape and this handler is never reached. Same
 * scoping rule `useHotkeys` relies on, one level down.
 *
 * **And focus has to actually go in.** Because that handler only fires for keys
 * pressed inside the column, without moving focus there it is unreachable by
 * the one path everybody takes: clicking a row leaves focus on the row, and
 * Escape goes to the list's handler instead. Moving focus also makes the two
 * hosts behave alike — the Drawer's focus trap has always done exactly this.
 * Keyed on the open transition rather than on the selected id, so selecting a
 * second row while the panel is open does not yank focus out of a field being
 * edited.
 */
export function InspectorHost({
  open,
  onClose,
  title,
  children,
  width = 'panel',
  inlineFrom = 'inline',
}: InspectorHostProps) {
  const band = useBand();
  const inline = bandAtLeast(band, inlineFrom);

  /* Where focus was when the column opened, so closing it from the keyboard
   * lands the user back where they came from instead of on <body>. The Drawer
   * gets this from `useFocusTrap`; a non-modal column has to remember for
   * itself, and only while it is the host — otherwise this would fight the
   * Drawer's own restore at the moment the band changes. */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const columnRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!inline || !open) return;
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    columnRef.current?.focus({ preventScroll: true });
    return () => {
      const previous = returnFocusRef.current;
      returnFocusRef.current = null;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [inline, open]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    /* Escape in a text field belongs to the field. Closing the panel out from
     * under a half-typed value is the worst of the available answers — the same
     * rule the workspace bindings use to stand down while typing. */
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      isTypingTarget(
        target.tagName,
        target.isContentEditable,
        target instanceof HTMLInputElement ? target.type : undefined,
      )
    ) {
      return;
    }
    event.preventDefault();
    onClose();
  };

  if (inline) {
    if (!open) return null;
    return (
      <aside
        ref={columnRef}
        // -1, not 0: the column is a landing spot for focus, never a Tab stop of
        // its own — Tab from here should reach the close button, not this.
        tabIndex={-1}
        aria-label={title}
        onKeyDown={onKeyDown}
        className={`flex ${WIDTH[width]} shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-raised focus:outline-none`}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-body font-medium">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="rounded-control px-2 text-text-muted transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring"
          >
            <IconClose size={16} />
          </button>
        </div>
        {children}
      </aside>
    );
  }

  return (
    // padded={false}: the inline column above hands `children` straight through,
    // so a panel pads itself. The drawer adding its own on top would give the
    // same panel a second gutter at exactly the width where it has the least to
    // spare — and the caller cannot compensate, because it does not know which
    // of the two hosts it landed in.
    <Drawer open={open} onClose={onClose} title={title} size="lg" padded={false}>
      {children}
    </Drawer>
  );
}
