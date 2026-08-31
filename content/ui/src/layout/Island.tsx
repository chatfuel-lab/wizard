import type { ReactNode } from 'react';

export type IslandPadding = 'none' | 'sm' | 'md';

const PADDING: Record<IslandPadding, string> = {
  none: '',
  sm: 'p-1',
  md: 'p-2',
};

export interface IslandProps {
  children: ReactNode;
  padding?: IslandPadding;
  /** Lays the contents out in a column instead of a row. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * A floating, elevated surface — the one container every toolbar, palette,
 * zoom widget and property panel that hovers over a canvas is built from.
 *
 * Borrowed straight from Excalidraw, where a single `Island` is why a tool
 * strip, a shape-properties panel and a context menu read as the same family
 * without any of them agreeing on their contents. It is deliberately tiny: one
 * radius, one elevation, one border, one padding scale. That is the whole
 * value — a rebrand retunes `--radius-island` and `--shadow-island` and every
 * floating surface in the product moves together.
 *
 * It is NOT a positioning primitive. `FloatingSurface` (portal + anchoring +
 * presence + dismissal) remains the engine for anything anchored to a trigger;
 * `Island` is the skin, and the two compose. For a toolbar pinned to a corner
 * of a canvas, plain absolute positioning plus this is the whole story.
 */
export function Island({ children, padding = 'md', orientation = 'horizontal', className }: IslandProps) {
  return (
    <div
      className={`z-island flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} items-center gap-1 rounded-island border border-border bg-surface-overlay shadow-island ${
        PADDING[padding] ?? ''
      }${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}
