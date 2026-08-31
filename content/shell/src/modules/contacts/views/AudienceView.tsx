import { useEffect } from 'react';
import { Button, PageBody, Skeleton, StatTile } from '~ui';
import { formatCount } from '../lib/audience';
import { useAudience } from '../hooks/useAudience';
import { ChannelCard } from '../components/audience/ChannelCard';
import { ConversationsCard } from '../components/audience/ConversationsCard';
import { CoverageCard } from '../components/audience/CoverageCard';
import { StageCard } from '../components/audience/StageCard';
import type { ContactsViewProps } from './types';

/**
 * What the address book is made of.
 *
 * Every figure is a count the server returned — eleven-plus separate calls,
 * grouped so that one failure marks one card instead of blanking the page.
 * Nothing is folded over loaded rows, because a page that pages 50 at a time
 * would otherwise print "the first fifty contacts" while looking like the whole
 * list.
 *
 * The chart that is not here is the point of the last card: `Contact` has no
 * `createdAt` anywhere in the schema, so "contacts added this month" is not a
 * number this API can answer. Deriving it from the `signed up` attribute would
 * be a different number wearing that name — the attribute is optional and
 * absent on most contacts — so the page says so instead of drawing it.
 */
export function AudienceView({ team, catalog, refreshToken, onCount, onBusy }: ContactsViewProps) {
  const audience = useAudience(team, refreshToken);
  const totals = audience.totals.value;

  useEffect(() => {
    onCount(totals ? { shown: totals.visible, server: totals.total } : null);
  }, [totals, onCount]);

  useEffect(() => {
    onBusy(audience.loading || audience.refreshing);
  }, [audience.loading, audience.refreshing, onBusy]);

  const stale = audience.refreshing;

  return (
    <PageBody>
      <div className="flex flex-col gap-gutter">
        <div className="grid grid-cols-1 gap-3 @inline/module:grid-cols-3">
          {audience.loading && !totals ? (
            [0, 1, 2].map((index) => <Skeleton key={index} variant="block" height="6.5rem" />)
          ) : (
            <>
              <StatTile label="Contacts you can see" value={formatCount(totals?.visible ?? null)} stale={stale} />
              <StatTile label="Contacts on the bot" value={formatCount(totals?.total ?? null)} stale={stale} />
              <StatTile
                label="With a conversation"
                value={formatCount(audience.conversations.value?.total ?? null)}
                stale={stale}
              />
            </>
          )}
        </div>

        {audience.totals.error ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-muted">{audience.totals.error}</p>
            <Button variant="secondary" size="sm" onClick={audience.refresh}>
              Try again
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-gutter @wide/module:grid-cols-2">
          <ChannelCard
            counts={audience.channels.value}
            totals={totals}
            error={audience.channels.error}
            onRetry={audience.refresh}
            stale={stale}
          />
          <StageCard
            totals={audience.stages.value}
            contacts={totals}
            error={audience.stages.error}
            onRetry={audience.refresh}
            stale={stale}
          />
          <ConversationsCard
            conversations={audience.conversations.value}
            owners={audience.owners.value}
            ownersTruncated={audience.ownersTruncated}
            error={audience.conversations.error}
            ownersError={audience.owners.error}
            onRetry={audience.refresh}
            stale={stale}
          />
          <CoverageCard
            entries={catalog.entries}
            totals={totals}
            loading={catalog.loading}
            error={catalog.error}
            onRetry={catalog.refresh}
            stale={stale}
          />
        </div>
      </div>
    </PageBody>
  );
}
