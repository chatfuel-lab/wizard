import type { KeyboardEvent } from 'react';
import { useCallback, useId, useRef, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState';
import type { Placement } from '../lib/geometry/position';
import { FloatingSurface } from './FloatingSurface';

export interface PopoverTriggerProps {
  id: string;
  onClick: () => void;
  /** Menus add ArrowDown / ArrowUp opening here (APG); Popover leaves it undefined. */
  onKeyDown?: (event: KeyboardEvent) => void;
  'aria-expanded': boolean;
  'aria-haspopup': 'dialog' | 'menu' | 'listbox';
  'aria-controls': string | undefined;
}

export interface PopoverProps {
  /**
   * Render function so the ARIA state lands on the real control.
   *
   * There is no ref here on purpose: Popover wraps the trigger in its own
   * inline-flex span and measures that. One extra element buys a component that
   * works with every trigger — a button, a chip, a table cell — without
   * cloneElement guessing or every control having to forward a ref.
   */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
  matchAnchorWidth?: boolean;
  /** Popovers hold real content, so Tab stays inside by default. */
  trapFocus?: boolean;
  'aria-label'?: string;
  /** Classes for the floating panel. */
  className?: string;
  /** Classes for the measurement wrapper around the trigger. */
  triggerClassName?: string;
}

export function Popover({
  trigger,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-start',
  offset,
  matchAnchorWidth,
  trapFocus = true,
  className = '',
  triggerClassName = '',
  ...aria
}: PopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerId = useId();
  const panelId = useId();
  const [open, setOpen] = useControllableState(controlledOpen, defaultOpen, onOpenChange);

  const close = useCallback(() => setOpen(false), [setOpen]);

  return (
    <>
      <span ref={anchorRef} className={`inline-flex ${triggerClassName}`}>
        {trigger({
          id: triggerId,
          onClick: () => setOpen(!open),
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-controls': open ? panelId : undefined,
        })}
      </span>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open}
        onDismiss={close}
        placement={placement}
        offset={offset}
        matchAnchorWidth={matchAnchorWidth}
        trapFocus={trapFocus}
        id={panelId}
        role="dialog"
        aria-labelledby={aria['aria-label'] === undefined ? triggerId : undefined}
        aria-label={aria['aria-label']}
        className={`min-w-40 rounded-card border border-border bg-surface-overlay p-3 text-sm text-text shadow-overlay ${className}`}
      >
        {children}
      </FloatingSurface>
    </>
  );
}
