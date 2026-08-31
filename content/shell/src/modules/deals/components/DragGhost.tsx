import type { DealFieldBindings } from '../lib/dealFieldBinding';
import type { DragPayload } from '../lib/dragPayload';
import type { Density } from '../lib/layout';
import type { DealCard } from '../types';
import { DealCardBody } from './DealCardBody';

export interface DragGhostProps {
  payload: DragPayload;
  byId: Readonly<Record<string, DealCard>>;
  bindings: DealFieldBindings;
  density: Density;
  now: number;
}

/**
 * What follows the pointer: the grabbed card, plus two offset shells and a
 * count when several are moving. The stack is what tells the user their whole
 * selection is coming, before any column has changed.
 */
export function DragGhost({ payload, byId, bindings, density, now }: DragGhostProps) {
  const lead = byId[payload.leadId];
  if (!lead) return null;
  const extra = payload.ids.length - 1;

  return (
    <div className="relative">
      {extra > 0 ? (
        <>
          <span
            aria-hidden
            className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-card border border-border bg-surface-raised"
          />
          <span
            aria-hidden
            className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-card border border-border bg-surface-raised"
          />
        </>
      ) : null}
      <div className="relative rounded-card border border-accent bg-surface-raised">
        <DealCardBody card={lead} bindings={bindings} density={density} now={now} dragging />
        {extra > 0 ? (
          <span className="absolute -right-2 -top-2 rounded-chip bg-accent px-1.5 py-0.5 text-nano font-medium tabular-nums text-accent-fg">
            +{extra}
          </span>
        ) : null}
      </div>
    </div>
  );
}
