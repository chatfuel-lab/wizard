import { StackedMeter, type EventChipTone, type StackedMeterSegment } from '~ui';
import { BUDGET_SLICES, type BudgetBreakdown, type BudgetSlice } from '../../lib/budget';

export interface BudgetMeterProps {
  budget: BudgetBreakdown;
  /** The rail's one-line form. */
  compact?: boolean;
}

const LABELS: Record<BudgetSlice, string> = {
  profile: 'Business profile',
  instructions: 'About the business',
  faq: 'FAQ',
  products: 'Products',
  services: 'Services',
  team: 'Team',
  other: 'Other',
};

/** Nominal tones, not a ramp: no slice is "more" than another. `other` stays neutral. */
const TONES: Record<BudgetSlice, EventChipTone> = {
  profile: 1,
  instructions: 3,
  faq: 2,
  products: 5,
  services: 6,
  team: 4,
  other: 'neutral',
};

/**
 * Where the assistant's reading budget goes.
 *
 * There is no ceiling to draw against - the schema exposes `usage.total` and
 * `usage.catalog` and no limit - so this is a composition, not a gauge. What
 * it answers is the question a person actually has when a write is refused:
 * which part of my knowledge base is eating the room?
 *
 * "Full" is a server verdict carried on `budget.full`, set by a write that
 * came back with `FuelyKnowledgeBaseLimitReached`.
 */
export function BudgetMeter({ budget, compact = false }: BudgetMeterProps) {
  const segments: StackedMeterSegment[] = BUDGET_SLICES.map((slice) => ({
    id: slice,
    label: LABELS[slice],
    value: budget.bySource[slice],
    tone: TONES[slice],
  }));

  return (
    <div>
      {compact ? (
        <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-text-faint">Budget</p>
      ) : null}
      <StackedMeter
        segments={segments}
        label="Characters the assistant reads"
        compact={compact}
        footer={
          !compact && budget.full ? (
            <span className="text-danger">The last write was refused because the knowledge base is full.</span>
          ) : null
        }
      />
    </div>
  );
}
