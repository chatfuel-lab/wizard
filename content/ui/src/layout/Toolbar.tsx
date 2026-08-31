import type { ReactNode } from 'react';

export interface ToolbarProps {
  children: ReactNode;
  /** Drop the bottom rule when the toolbar sits directly above another one. */
  divided?: boolean;
  className?: string;
}

/**
 * The filter/search/action strip under a PageHeader.
 *
 * Four modules had four versions of this within two pixels of each other
 * (`h-11` here, `px-4 py-3` there, wrapping in one and not the other). It wraps
 * — a filter bar is the first thing to overflow in a narrow container, and a
 * row of controls that wraps is strictly better than one that clips.
 */
export function Toolbar({ children, divided = true, className }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      className={`flex min-h-11 shrink-0 flex-wrap items-center gap-2 px-gutter py-2 ${
        divided ? 'border-b border-border' : ''
      } ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
