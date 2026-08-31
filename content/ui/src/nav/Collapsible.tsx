import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconChevronDown } from '../icons';

export interface CollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header content. Omit to drive the panel entirely from outside. */
  trigger?: ReactNode;
  /** Right-aligned header slot — a count, a badge — outside the toggle button. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Animated disclosure.
 *
 * The height animation is the `grid-template-rows: 0fr -> 1fr` trick, which is
 * the only CSS-only way to transition to a content-derived height. The
 * alternative — measuring scrollHeight and writing a pixel value — needs a
 * ResizeObserver to survive content that changes while open, and gets it wrong
 * every time a font loads late.
 */
export function Collapsible({ open, onOpenChange, trigger, meta, children, className = '' }: CollapsibleProps) {
  const panelId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  /* Collapsed content is still in the tab order — zero height does not remove
   * it. `inert` is set as a DOM property rather than a JSX attribute because
   * React 18 would serialise `inert={false}` to the string "false", which the
   * browser reads as present-and-therefore-true. */
  useEffect(() => {
    const node = contentRef.current;
    if (node) node.inert = !open;
  }, [open]);

  return (
    <div className={className}>
      {trigger !== undefined ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onOpenChange(!open)}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-control py-1 text-left text-sm font-medium text-text transition-colors duration-fast ease-standard hover:text-accent focus-visible:focus-ring"
          >
            <IconChevronDown
              size={14}
              className={`shrink-0 text-text-muted transition-transform duration-fast ease-standard ${
                open ? '' : '-rotate-90'
              }`}
            />
            <span className="truncate">{trigger}</span>
          </button>
          {meta !== undefined ? <span className="shrink-0">{meta}</span> : null}
        </div>
      ) : null}

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-base ease-standard ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div ref={contentRef} className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
