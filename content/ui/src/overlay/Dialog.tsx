import type { ReactNode, RefObject } from 'react';
import { IconClose } from '../icons';
import { Button } from '../primitives/Button';
import { Overlay } from './Overlay';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: DialogSize;
  /**
   * Explicit CSS width, overriding `size` — the same escape hatch Drawer has.
   *
   * For a panel whose width is a measure rather than a t-shirt: a column
   * somebody writes in is as wide as the writing wants, and rounding that to
   * the nearest of four sizes is how a measure stops being one. Setting it
   * drops the `max-w-*` the size would have applied, so the value given is the
   * width — bound it yourself if it has to survive a narrow window.
   */
  width?: string;
  /**
   * Explicit CSS max-height, overriding the default of "as much as the scrim
   * leaves". Past it the body scrolls and the header and footer stay put, which
   * is what the default does too; this only moves the ceiling.
   */
  maxHeight?: string;
  /** Focus this on open instead of the first tabbable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Pinned to the right of the header, before the close button — who or what
   * this dialog is about: an avatar and a handle, a status chip, a count.
   *
   * A header slot rather than a longer title because the two are read
   * differently: the title says what the dialog is and stays put, and this says
   * which one. Anything that acts on the contents belongs in `footer`.
   */
  meta?: ReactNode;
  /**
   * Off when the children pad themselves — a body that draws its own regions
   * with rules between them cannot live inside somebody else's gutter.
   */
  padded?: boolean;
  /**
   * Fill the window instead of floating in it.
   *
   * For the narrowest band, where a centred card with a gutter around it is a
   * card with no room left inside it. Everything else is unchanged: same
   * header, same scrolling body, same footer.
   */
  fullScreen?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Centered modal: backdrop press and Escape close it. */
export function Dialog({
  open,
  onClose,
  title,
  size = 'md',
  width,
  maxHeight,
  initialFocusRef,
  meta,
  padded = true,
  fullScreen = false,
  footer,
  children,
}: DialogProps) {
  /* `fixed inset-0` rather than a width and a height: the scrim is the flex
     parent AND it carries the gutter, so a panel that means to reach the edges
     has to leave the flow rather than fight that padding with a negative
     margin. Fixed resolves against the window, which is the box it wants. */
  const frame = fullScreen
    ? 'fixed inset-0'
    : `w-full max-h-full rounded-card border border-border shadow-modal ${width === undefined ? SIZE_CLASSES[size] : ''}`;

  return (
    <Overlay open={open} onClose={onClose} align="center" initialFocusRef={initialFocusRef}>
      {(state) => (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-state={state}
          style={fullScreen ? undefined : { width, maxHeight }}
          className={`flex flex-col bg-surface-overlay data-[state=entering]:animate-scale-in data-[state=exiting]:animate-scale-out ${frame}`}
        >
          {/* The title takes the slack and truncates; the meta slot keeps its
              size and sits against the close button. With no meta the row is
              what it always was — a title on the left, a close button right. */}
          <div className="flex h-topbar shrink-0 items-center gap-3 border-b border-border px-4">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{title}</span>
            {meta ? <span className="shrink-0">{meta}</span> : null}
            <Button iconOnly variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <IconClose />
            </Button>
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'p-4' : ''}`}>{children}</div>
          {footer ? <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">{footer}</div> : null}
        </div>
      )}
    </Overlay>
  );
}
