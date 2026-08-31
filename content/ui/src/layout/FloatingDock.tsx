import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { IconChevronDown, IconChevronUp } from '../icons';
import { Drawer } from '../overlay/Drawer';
import { Island } from './Island';
import { isTypingTarget } from '../lib/interaction/hotkeys';
import { bandAtLeast, type Band } from '../lib/interaction/layout';

export interface FloatingDockSize {
  width: number;
  height: number;
}

export type FloatingDockAnchor = 'bottom-right' | 'bottom-left';

export interface FloatingDockProps {
  /** Expanded, or a pill in the corner. The session behind it survives either way. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The header's own line — a name, a glyph, a tag. */
  title: ReactNode;
  /** What the pill says when it is collapsed. Also the panel's accessible name. */
  label: string;
  /** A dot on the pill: something is running behind it. */
  active?: boolean;
  /** Header controls, before the collapse button. */
  actions?: ReactNode;
  /** Pixels. Controlled, so the host can remember it across sessions. */
  size: FloatingDockSize;
  onSizeChange?: (size: FloatingDockSize) => void;
  minSize?: FloatingDockSize;
  /**
   * Below this band the dock is a bottom Drawer instead — a floating window is
   * not a shape a 360px screen has room for. The host measures its own width
   * (`useBand`) and says which band it is in; `~ui` never asks the viewport.
   */
  band: Band;
  inlineFrom?: Band;
  anchor?: FloatingDockAnchor;
  children: ReactNode;
}

const DEFAULT_MIN: FloatingDockSize = { width: 288, height: 320 };

const ANCHOR_CLASS: Record<FloatingDockAnchor, string> = {
  'bottom-right': 'bottom-3 right-3',
  'bottom-left': 'bottom-3 left-3',
};

/** The resize grip sits on the corner diagonally opposite the anchor. */
const GRIP_CLASS: Record<FloatingDockAnchor, string> = {
  'bottom-right': 'left-0 top-0 cursor-nwse-resize',
  'bottom-left': 'right-0 top-0 cursor-nesw-resize',
};

/**
 * A floating window over a canvas: a test chat, a notes pane, anything that has
 * to stay open while the scene behind it stays whole.
 *
 * The alternative was a third column, and on a canvas a column is the wrong
 * trade: the inspector already takes 20rem from the right, and a canvas that
 * has been narrowed twice is no longer the thing being edited. A window costs
 * the scene the rectangle it covers and nothing else — pan it out from under
 * the dock and the canvas is whole again, which is not true of a column.
 *
 * It is positioned against its nearest positioned ancestor, so the host wraps
 * it in a `relative` element (the same one the canvas fills). `Island` is the
 * skin — one radius, one elevation, one border, shared with every toolbar and
 * palette floating over the same scene.
 *
 * Collapsing is not closing. The pill keeps its place and the children stay
 * mounted, because what is behind a test chat is a live conversation and a
 * subscription, and unmounting them to get thirty square centimetres back is a
 * bad bargain. Below `inlineFrom` the whole thing becomes a bottom Drawer,
 * where mounting IS the open transition and the children unmount with it — the
 * same dual-surface split a canvas palette makes.
 */
export function FloatingDock({
  open,
  onOpenChange,
  title,
  label,
  active = false,
  actions,
  size,
  onSizeChange,
  minSize = DEFAULT_MIN,
  band,
  inlineFrom = 'narrow',
  anchor = 'bottom-right',
  children,
}: FloatingDockProps) {
  const floating = bandAtLeast(band, inlineFrom);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!floating) setDrawerOpen(false);
  }, [floating]);

  /**
   * Escape collapses, and only from inside, and never out of a text field.
   *
   * A canvas has its own Escape — clear the selection, cancel a half-made
   * connection — and a floating panel that swallowed the key from across the
   * screen would take it away. And Escape pressed in a half-written message is
   * about the message, not about the window: `isTypingTarget` is the same rule
   * `useHotkeys` applies to every other binding in the product.
   */
  useEffect(() => {
    if (!floating || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const node = panelRef.current;
      const active = document.activeElement;
      if (!node || !active || !node.contains(active)) return;
      if (
        active instanceof HTMLElement &&
        isTypingTarget(
          active.tagName,
          active.isContentEditable,
          active instanceof HTMLInputElement ? active.type : undefined,
        )
      ) {
        return;
      }
      event.preventDefault();
      onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [floating, open, onOpenChange]);

  /**
   * Resize from the far corner.
   *
   * Pointer capture rather than window listeners: the grip keeps receiving
   * moves after the pointer has left it, which it will immediately, and a
   * pointer lost to a scroll or an alt-tab ends the drag on its own. The size
   * is clamped by `minSize` here and by the container's own `max-*` in CSS, so
   * a number bigger than the canvas can never paint outside it.
   */
  const onGripDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!onSizeChange || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const grip = event.currentTarget;
      grip.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const start = size;
      const dirX = anchor === 'bottom-right' ? -1 : 1;

      const onMove = (move: PointerEvent) => {
        onSizeChange({
          width: Math.max(minSize.width, start.width + (move.clientX - startX) * dirX),
          height: Math.max(minSize.height, start.height - (move.clientY - startY)),
        });
      };
      const onUp = () => {
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);
        grip.removeEventListener('pointercancel', onUp);
      };
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
      grip.addEventListener('pointercancel', onUp);
    },
    [anchor, minSize.height, minSize.width, onSizeChange, size],
  );

  const pill = (onPress: () => void) => (
    <div className={`pointer-events-auto absolute ${ANCHOR_CLASS[anchor]}`}>
      <Island padding="sm">
        <button
          type="button"
          aria-expanded={false}
          onClick={onPress}
          className="flex items-center gap-1.5 rounded-control px-2 py-1 text-sm font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
        >
          {/* A live session behind a collapsed pill is the one thing the pill
              has to say, and a dot says it without a second word. */}
          {active ? <span className="size-1.5 rounded-full bg-success" aria-hidden /> : null}
          {label}
          <IconChevronUp size={14} />
        </button>
      </Island>
    </div>
  );

  /**
   * Below the band this is a modal drawer, and a modal is opened, not
   * remembered: a preference set at 1600px must not put a sheet over the whole
   * screen the moment the same person opens the page on a phone. So the drawer
   * has its own open state, reset whenever the band drops, and the pill is the
   * way in — which is also the only way in, because there is no window to
   * collapse from down here.
   */
  if (!floating) {
    return (
      <>
        {pill(() => setDrawerOpen(true))}
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={label} side="bottom" padded={false}>
          <div className="flex h-[70vh] flex-col">{children}</div>
        </Drawer>
      </>
    );
  }

  if (!open) return pill(() => onOpenChange(true));

  return (
    <div
      className={`pointer-events-auto absolute ${ANCHOR_CLASS[anchor]} max-h-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)]`}
      style={{ width: size.width, height: size.height }}
    >
      <Island padding="none" orientation="vertical" className="relative h-full w-full overflow-hidden">
        <div ref={panelRef} role="region" aria-label={label} className="flex h-full w-full flex-col">
          {/* `pl-4` and not `pl-3`: the resize grip owns the top-left 16px,
              and a glyph half under a resize cursor is a glyph nobody can
              click. */}
          <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border pl-4 pr-1">
            <div className="min-w-0 flex-1">{title}</div>
            {actions}
            <button
              type="button"
              aria-expanded
              aria-label={`Collapse ${label}`}
              onClick={() => onOpenChange(false)}
              className="flex size-7 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
            >
              <IconChevronDown size={14} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
        {onSizeChange ? (
          <div role="presentation" onPointerDown={onGripDown} className={`absolute size-4 ${GRIP_CLASS[anchor]}`} />
        ) : null}
      </Island>
    </div>
  );
}
