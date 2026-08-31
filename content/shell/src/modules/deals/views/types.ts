import type { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealFieldsState } from '../hooks/useDealFields';
import type { DealsFilter } from '../lib/dealsFilter';
import type { Band, Density } from '../lib/layout';

/**
 * The contract between `DealsApp` and a view. Frozen: every view takes exactly
 * this, so adding or rewriting one never edits `DealsApp.tsx`.
 *
 * A view owns its own data, its own toolbar and its own live channel. It shares
 * only the filter model, the layout band and the open deal — and it reports its
 * count upward so the header can show one number.
 *
 * Only the active view is mounted. Switching away and back therefore refetches;
 * that is the price of views never being able to corrupt each other's state.
 */
export interface DealsViewProps {
  filter: DealsFilter;
  onFilterChange: (next: DealsFilter) => void;
  /** Already resolved against the band — a view never re-applies `effectiveDensity`. */
  density: Density;
  onDensityChange: (next: Density) => void;
  band: Band;
  collapsed: SalesStageV2[];
  onCollapsedChange: (next: SalesStageV2[]) => void;
  fields: DealFieldsState;
  canEdit: boolean;
  /** Report the view's own total, or null while it does not know one. */
  onCount: (count: number | null) => void;
  /** Report whether a refresh is still in flight, so the header can spin. */
  onBusy: (busy: boolean) => void;
  /** Bumped by the header's refresh button; a view refetches when it changes. */
  refreshToken: number;
  openDealId: string | null;
  onOpenDeal: (contactId: string | null) => void;
}
