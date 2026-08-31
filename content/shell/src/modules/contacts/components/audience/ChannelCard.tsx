import { channelRows, formatCount, formatShare, shareOfMax, type AudienceTotals } from '../../lib/audience';
import type { Platform } from '~api/generated/contacts/graphql';
import { BarRow, SectionCard } from './Bars';

export interface ChannelCardProps {
  counts: ReadonlyMap<Platform, number> | null;
  totals: AudienceTotals | null;
  error: string | null;
  onRetry: () => void;
  stale?: boolean;
}

/**
 * Contacts per channel: five separate `contactsCount(platforms: [one])` calls,
 * ranked.
 *
 * Bars are drawn against the biggest channel rather than against the bot
 * total, because the question this card answers is "where do my contacts come
 * from" — a share-of-total view would leave every bar short and unreadable on
 * a bot that is 95% WhatsApp. The share is printed beside each row instead, so
 * both readings are available and neither is implied by the geometry alone.
 */
export function ChannelCard({ counts, totals, error, onRetry, stale }: ChannelCardProps) {
  const total = totals?.total ?? 0;
  const rows = counts === null ? [] : channelRows(counts, total);

  return (
    <SectionCard
      title="Channels"
      description="Contacts per channel, counted by the server one channel at a time."
      error={error}
      onRetry={onRetry}
      stale={stale}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No channel counts yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <BarRow
              key={row.platform}
              label={row.label}
              labelWidth="6.5rem"
              fraction={shareOfMax(row.count, rows)}
              value={formatCount(row.count)}
              detail={total > 0 ? formatShare(row.share) : undefined}
              muted={row.count === 0}
              title={
                total > 0
                  ? `${row.label}: ${row.count.toLocaleString()} contacts, ${formatShare(row.share)} of the ${total.toLocaleString()} on this bot`
                  : `${row.label}: ${row.count.toLocaleString()} contacts`
              }
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
