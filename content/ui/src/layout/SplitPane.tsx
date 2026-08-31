import type { ReactNode } from 'react';
import { IconChevronLeft } from '../icons';
import { bandAtLeast, type Band } from '../lib/interaction/layout';
import { useBand } from './ModuleRoot';

/** Which `--width-*` token sizes the side pane. */
export type SideWidth = 'rail' | 'sidenav' | 'list' | 'inspector';

const SIDE_WIDTH: Record<SideWidth, string> = {
  rail: 'w-rail',
  sidenav: 'w-sidenav',
  list: 'w-list',
  inspector: 'w-inspector',
};

export interface SplitPaneProps {
  /** The master pane: a conversation list, a scope nav, a flow picker. */
  side: ReactNode;
  /** The detail pane: a thread, a canvas, a settings body. */
  children: ReactNode;
  sideWidth?: SideWidth;
  /** Names the region, and labels the back control when the panes are stacked. */
  sideLabel: string;
  /**
   * Below this band the two panes stack into one. `'never'` keeps them side by
   * side at every width — correct only when the side pane is a `rail`.
   */
  collapseBelow?: Band | 'never';
  /**
   * Which pane is visible while stacked. Controlled: the module already knows
   * whether something is selected, and deriving it here would fight a deep link
   * that opens straight into the detail pane.
   */
  showing?: 'side' | 'detail';
  onShowingChange?: (next: 'side' | 'detail') => void;
}

/**
 * Master/detail. Two panes above the collapse band, one pane plus a back
 * control below it.
 *
 * This is a JS-band decision, not a CSS one, and deliberately so: stacking
 * changes which pane is in the DOM and adds a control that does not otherwise
 * exist. A container query can only restyle what is already rendered — it
 * cannot make a back button appear, and CSS-hiding the other pane would keep
 * mounting, measuring and subscribing for a list nobody can see.
 */
export function SplitPane({
  side,
  children,
  sideWidth = 'list',
  sideLabel,
  collapseBelow = 'wide',
  showing = 'side',
  onShowingChange,
}: SplitPaneProps) {
  const band = useBand();
  const stacked = collapseBelow !== 'never' && !bandAtLeast(band, collapseBelow);

  if (!stacked) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside
          aria-label={sideLabel}
          className={`flex ${SIDE_WIDTH[sideWidth]} min-h-0 shrink-0 flex-col overflow-hidden border-r border-border`}
        >
          {side}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  if (showing === 'side') {
    return (
      <div aria-label={sideLabel} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {side}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center border-b border-border px-2 py-1">
        <button
          type="button"
          onClick={() => onShowingChange?.('side')}
          className="touch-target -ml-1 flex items-center gap-1 rounded-control px-2 text-label text-text-muted transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring"
        >
          <IconChevronLeft size={16} />
          {sideLabel}
        </button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
