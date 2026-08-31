import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLayer } from '../hooks/useLayer';
import { usePresence } from '../hooks/usePresence';
import { useScrollLock } from '../hooks/useScrollLock';
import type { PresenceState } from '../lib/interaction/presence';
import { Portal } from './Portal';

export type OverlayAlign = 'center' | 'right' | 'left' | 'bottom';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Where the panel sits. 'center' is a Dialog, the rest are Drawer sides. */
  align: OverlayAlign;
  /** Focus this on open instead of the first tabbable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Backdrop press closes. Default true. */
  dismissOnOutside?: boolean;
  /**
   * Children may be a render function to read the presence state — the panel
   * needs it to pick its own enter/exit animation, which differs per side.
   */
  children: ReactNode | ((state: PresenceState) => ReactNode);
}

const ALIGN_CLASSES: Record<OverlayAlign, string> = {
  center: 'items-center justify-center p-4',
  right: 'justify-end',
  left: 'justify-start',
  bottom: 'items-end',
};

/**
 * Backdrop + portal + Escape machinery shared by Dialog and Drawer.
 *
 * Unlike the previous version this does NOT unmount the moment `open` flips
 * false — usePresence holds the tree through an exit phase so the panel can
 * animate out. Everything downstream (Dialog, Drawer) gets presence, a focus
 * trap, scroll lock and layer-aware Escape for free, with unchanged props.
 */
export function Overlay({ open, onClose, align, initialFocusRef, dismissOnOutside = true, children }: OverlayProps) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /* The panel as STATE as well as a ref, and the focus trap is keyed on the
     state. `open` flips two commits before the panel is in the DOM — presence
     mounts a render later, and the Portal resolves its host in an effect after
     that — so a trap armed on `open` found nothing to trap, bailed, and never
     ran again: ⌘K opened a palette nobody could type into. The callback ref
     fires on the commit that has the panel, and `initialFocusRef` (the input
     inside it) is populated by that same commit. */
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const attachPanel = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node;
    setPanel(node);
  }, []);
  const { mounted, state } = usePresence(open, scrimRef);
  const layer = useLayer(open);

  useScrollLock(mounted);
  useFocusTrap(panel, open, { initialFocusRef, inertBackground: layer.isBottom() });

  /* Outside-press is handled by the scrim's own onPointerDown rather than
   * useDismiss's document listener: the scrim already covers the page, so a
   * press that lands on it IS the outside press — and this way a drag that
   * starts inside the panel and releases over the scrim does not close it. */
  const dismiss = useCallback(() => onClose(), [onClose]);
  useDismiss(panelRef, open, dismiss, { isTop: layer.isTop, closeOnOutsidePointer: false });

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={scrimRef}
        data-layer={layer.id}
        data-state={state}
        className={`fixed inset-0 z-overlay flex bg-scrim font-sans data-[state=entering]:animate-scrim-in data-[state=exiting]:animate-scrim-out ${ALIGN_CLASSES[align]}`}
        onPointerDown={(event) => {
          if (!dismissOnOutside) return;
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {/* `contents` keeps this wrapper out of the layout while still giving
            the focus trap a single element that contains the whole panel. */}
        <div ref={attachPanel} className="contents">
          {typeof children === 'function' ? children(state) : children}
        </div>
      </div>
    </Portal>
  );
}
