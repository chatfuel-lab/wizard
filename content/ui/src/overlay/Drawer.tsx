import type { ReactNode, RefObject } from 'react';
import { IconClose } from '../icons';
import { Button } from '../primitives/Button';
import { Overlay } from './Overlay';

export type DrawerSide = 'right' | 'left' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: DrawerSide;
  size?: DrawerSize;
  /** Explicit CSS width, overriding `size`. */
  width?: string;
  /** Focus this on open instead of the first tabbable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Beside the title, before the close button — who or what this panel is
   * about: an avatar and a handle, a status chip, a count.
   *
   * A header slot rather than a longer title because the two are read
   * differently: the title says what the panel is and stays put, and this says
   * which one, and may be a control. Anything that acts on the panel's contents
   * belongs in `footer`.
   */
  meta?: ReactNode;
  footer?: ReactNode;
  /**
   * Off when the children scroll themselves.
   *
   * A drawer whose body is a single column wants the scroll here. One that
   * splits into columns that scroll independently does not: the outer scroller
   * would let the whole split slide under a pinned footer, and the columns
   * would never reach their own overflow. Turning it off makes the body a
   * fixed-height box the children divide up.
   */
  scroll?: boolean;
  /**
   * Off when the children pad themselves. The drawer is one of two hosts a
   * panel can land in — InspectorHost puts the same children in a plain column
   * above the collapse band — and a padding the drawer adds on its own is a
   * padding that host cannot match, so the panel gains a gutter at exactly the
   * width where it has the least to spare.
   */
  padded?: boolean;
  children: ReactNode;
}

const SIZE_WIDTHS: Record<DrawerSize, string> = {
  sm: '20rem',
  md: '26rem',
  lg: '34rem',
};

const SIDE_CLASSES: Record<DrawerSide, string> = {
  right: 'h-full border-l data-[state=entering]:animate-slide-in-right data-[state=exiting]:animate-slide-out-right',
  left: 'h-full border-r data-[state=entering]:animate-slide-in-left data-[state=exiting]:animate-slide-out-left',
  bottom:
    'max-h-[85vh] w-full rounded-t-card border-t data-[state=entering]:animate-slide-in-bottom data-[state=exiting]:animate-slide-out-bottom',
};

/** Edge-anchored panel: backdrop press and Escape close it. */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  size = 'md',
  width,
  initialFocusRef,
  meta,
  footer,
  padded = true,
  scroll = true,
  children,
}: DrawerProps) {
  const panelStyle = side === 'bottom' ? undefined : { width: width ?? SIZE_WIDTHS[size], maxWidth: '100vw' };

  return (
    <Overlay open={open} onClose={onClose} align={side} initialFocusRef={initialFocusRef}>
      {(state) => (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-state={state}
          className={`flex flex-col border-border bg-surface-raised shadow-modal ${SIDE_CLASSES[side]}`}
          style={panelStyle}
        >
          <div className="flex h-topbar shrink-0 items-center gap-3 border-b border-border px-4">
            <span className="shrink-0 text-sm font-semibold text-text">{title}</span>
            {/* Takes the slack so the close button stays pinned right whether or
                not there is a meta slot to fill it. */}
            <span className="min-w-0 flex-1">{meta}</span>
            <Button iconOnly variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <IconClose />
            </Button>
          </div>
          <div className={`min-h-0 flex-1 ${scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${padded ? 'p-4' : ''}`}>
            {children}
          </div>
          {footer ? <div className="shrink-0 border-t border-border p-4">{footer}</div> : null}
        </div>
      )}
    </Overlay>
  );
}
