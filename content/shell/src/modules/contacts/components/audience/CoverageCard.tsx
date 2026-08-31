import { useMemo, useState } from 'react';
import { SegmentedControl } from '~ui';
import { fieldCoverage, formatCount, formatShare, type AudienceTotals } from '../../lib/audience';
import type { CatalogEntry } from '../../hooks/useAttributeCatalog';
import { BarRow, SectionCard } from './Bars';

/** How many fields the card ranks before it stops. */
const TOP = 12;

export interface CoverageCardProps {
  entries: readonly CatalogEntry[];
  totals: AudienceTotals | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  stale?: boolean;
}

/**
 * How much of the address book each field actually covers.
 *
 * This is the one breakdown on the page that costs nothing: `usersCount` is
 * already on every catalog entry the module loaded for its column picker, so
 * ranking it is arithmetic rather than eleven more requests. It is also the
 * most directly useful number a person selling this module can point at — "you
 * have a phone for 96% of your list and an email for 12%" is the sentence that
 * sells an import.
 *
 * Bars are shares of the whole address book, not of the biggest field: the
 * question here IS "what fraction is filled in", so the geometry has to answer
 * it directly. A field carrying a bot-wide default is badged, because its bar
 * is measuring the default rather than anything anyone typed.
 */
export function CoverageCard({ entries, totals, loading, error, onRetry, stale }: CoverageCardProps) {
  const [scope, setScope] = useState<'all' | 'custom'>('all');

  const data = useMemo(
    () => fieldCoverage(entries, totals?.visible ?? 0, { customOnly: scope === 'custom' }),
    [entries, totals, scope],
  );

  const rows = data.rows.slice(0, TOP);
  const hidden = data.rows.length - rows.length;

  return (
    <SectionCard
      title="Field coverage"
      description="How many contacts carry each field, from the catalog the module already loaded."
      error={error}
      onRetry={onRetry}
      stale={stale}
      actions={
        <SegmentedControl
          size="sm"
          value={scope}
          onChange={(next) => setScope(next as 'all' | 'custom')}
          options={[
            { value: 'all', label: 'All fields' },
            { value: 'custom', label: 'Custom' },
          ]}
          aria-label="Which fields to rank"
        />
      }
    >
      {loading && rows.length === 0 ? (
        <p className="text-sm text-text-muted">Reading the field catalog…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          {scope === 'custom'
            ? 'This bot has no custom fields yet. One appears the moment a value is written on a contact.'
            : 'No field carries a value yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <BarRow
              key={row.name}
              label={row.name}
              labelWidth="11rem"
              shape="meter"
              tone={row.hasDefault ? 'accent' : 'series'}
              fraction={row.share}
              value={formatCount(row.count)}
              detail={formatShare(row.share)}
              muted={row.count === 0}
              badge={
                row.hasDefault ? (
                  <span className="rounded-chip bg-accent-soft px-1.5 py-0.5 text-micro text-accent">default set</span>
                ) : null
              }
              title={`${row.count.toLocaleString()} of ${data.total.toLocaleString()} contacts carry “${row.name}” (${formatShare(row.share)})${
                row.hasDefault ? ' — a bot-wide default makes every contact read it as filled in' : ''
              }`}
            />
          ))}
        </ul>
      )}

      {hidden > 0 || data.uncounted > 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          {hidden > 0 ? `${hidden} more field${hidden === 1 ? '' : 's'} below these. ` : ''}
          {data.uncounted > 0
            ? `${data.uncounted} field${data.uncounted === 1 ? '' : 's'} the API declined to count ${
                data.uncounted === 1 ? 'is' : 'are'
              } left out rather than drawn as zero.`
            : ''}
        </p>
      ) : null}
    </SectionCard>
  );
}
