import { SalesStageV2 } from '~api/generated/contacts/graphql';
import { formatCount, formatShare, shareOfMax, stageRows, sumStages, type AudienceTotals } from '../../lib/audience';
import { BarRow, type BarTone } from './Bars';
import { SectionCard } from './Bars';

/**
 * Won and Lost are STATES, not series, so they wear the status tokens; the
 * four open stages are one series and share one hue. Every bar is labelled in
 * words, so the colour is a second channel and never the only one.
 */
const TONE: Partial<Record<SalesStageV2, BarTone>> = {
  [SalesStageV2.Won]: 'success',
  [SalesStageV2.Lost]: 'danger',
};

export interface StageCardProps {
  totals: Readonly<Record<SalesStageV2, number>> | null;
  contacts: AudienceTotals | null;
  error: string | null;
  onRetry: () => void;
  stale?: boolean;
}

/**
 * Contacts per stage, from the one call that answers all six at once
 * (`contactDealsByStages`) — never six calls, and never a client-side tally.
 *
 * Pipeline order, never ranked: the order is the meaning here. The card also
 * prints how many contacts the six bars do NOT cover, because a contact with
 * no stage is in none of them and six bars that look like the whole address
 * book would be the wrong reading.
 */
export function StageCard({ totals, error, onRetry, stale }: StageCardProps) {
  const rows = stageRows(totals);
  const staged = sumStages(rows);

  return (
    <SectionCard
      title="Stages"
      description="Every contact that carries a sales stage, counted by the server in one call."
      error={error}
      onRetry={onRetry}
      stale={stale}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No stage counts yet.</p>
      ) : staged === 0 ? (
        <p className="text-sm text-text-muted">No contact carries a stage yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <BarRow
              key={row.stage}
              label={row.label}
              labelWidth="6.5rem"
              tone={TONE[row.stage] ?? 'accent'}
              fraction={shareOfMax(row.count, rows)}
              value={formatCount(row.count)}
              detail={formatShare(row.share)}
              muted={row.count === 0}
              title={`${row.label}: ${row.count.toLocaleString()} contacts, ${formatShare(row.share)} of the ${staged.toLocaleString()} that carry a stage`}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
