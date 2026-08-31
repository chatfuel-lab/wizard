import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ChipInput, Drawer, EmptyState, IconBolt, IconCheck, IconSearch, Input, Label, Tag } from '~ui';
import { AdSetDestinationType } from '~api/generated/automations/graphql';
import { useMetaAds, type MetaAdAccountState } from '../../hooks/useMetaAds';
import { adPlatformsOf, adStatusLabel, adStatusTone, parseAdIds, syncFreshness } from '../../lib/adUrl';
import type { MetaAdNode } from '../../types';
import { PICKER_DRAWER_WIDTH } from './InstagramMediaDrawer';
import { LoadMoreRow, MediaThumb, PickerFooter, PickerLoading, usePickerSelection } from './pickerParts';
import type { PickerDrawerProps } from './types';

const AD_ID_MAX_LENGTH = 60;

const DESTINATION_LABELS: Record<AdSetDestinationType, string> = {
  [AdSetDestinationType.InstagramDirect]: 'Instagram DM',
  [AdSetDestinationType.WhatsApp]: 'WhatsApp',
  [AdSetDestinationType.Unknown]: 'Unknown destination',
};

/**
 * The Meta ads picker (`PickerDrawerProps`): one section per ad account, each
 * a paged list of ads (thumbnail or glyph, name, status tag, destination),
 * a select that toggles the `metaAdId`; the sync freshness from
 * `metaAdsSyncState`; and, always, the paste box — an ad id or an Ads Manager
 * URL (`selected_ad_ids=` is parsed client-side, `lib/adUrl.ts`). With no ad
 * accounts the paste box IS the drawer.
 */
export function MetaAdsDrawer({ open, onClose, selected, onChange, maxItems, scope, canEdit }: PickerDrawerProps) {
  const platforms = useMemo(() => adPlatformsOf(scope), [scope]);
  const ads = useMetaAds({ enabled: open, platforms });
  const pick = usePickerSelection(open, selected, maxItems);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const done = () => {
    onChange(pick.list());
    onClose();
  };

  const freshness = syncFreshness(ads.syncState?.finishedAt ?? null);
  const needle = query.trim().toLocaleLowerCase();
  const filterAds = (list: readonly MetaAdNode[]) =>
    needle
      ? list.filter((ad) => ad.name.toLocaleLowerCase().includes(needle) || ad.metaAdId.includes(needle))
      : [...list];
  /** Ids in the selection that are on no loaded page — pasted, or from a page not loaded yet. */
  const knownIds = useMemo(() => new Set(ads.accounts.flatMap((a) => a.ads.map((ad) => ad.metaAdId))), [ads.accounts]);
  const unlisted = pick.list().filter((id) => !knownIds.has(id));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Pick Meta ads"
      width={PICKER_DRAWER_WIDTH}
      padded={false}
      footer={
        <PickerFooter
          count={pick.selected.size}
          maxItems={maxItems}
          emptyMeaning="All ads"
          canEdit={canEdit}
          onClear={pick.clear}
          onDone={done}
          onClose={onClose}
        />
      }
    >
      <div className="@container flex min-h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
              <IconBolt size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">Meta ad accounts</div>
              <div className="text-xs text-text-muted">
                {ads.loading && !ads.loaded ? 'Loading…' : (freshness ?? (ads.loaded ? 'Not synced yet' : ''))}
                {ads.loaded && platforms.length === 1
                  ? ` · ${platforms[0] === 'whatsapp' ? 'WhatsApp' : 'Instagram'} ads`
                  : ''}
              </div>
            </div>
          </div>
          {ads.accounts.length > 0 ? (
            <div className="relative">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ads by name or id…"
                aria-label="Search ads"
                className="h-field-sm pl-8 text-xs"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {ads.error && ads.accounts.length === 0 ? (
            <Alert
              tone="danger"
              title="Could not load Meta ads"
              action={
                <Button variant="secondary" size="sm" onClick={ads.reload}>
                  Retry
                </Button>
              }
            >
              {ads.error}
            </Alert>
          ) : ads.loading && !ads.loaded ? (
            <PickerLoading label="Loading ad accounts…" />
          ) : ads.accounts.length === 0 ? (
            <EmptyState
              icon={<IconBolt />}
              title="No ad accounts"
              description="Meta has not shared an ad account with this login, so there is nothing to pick from. Paste ad ids or an Ads Manager URL below."
            />
          ) : (
            <>
              {ads.error ? <Alert tone="warning">{ads.error}</Alert> : null}
              {ads.accounts.map((account) => (
                <AccountSection
                  key={account.id}
                  account={account}
                  ads={filterAds(account.ads)}
                  filtered={needle !== ''}
                  pick={pick}
                  canEdit={canEdit}
                  onLoadMore={() => ads.loadMore(account.id)}
                />
              ))}
              {pick.full ? (
                <p className="text-xs text-warning">Up to {maxItems} — remove one to pick another.</p>
              ) : null}
            </>
          )}

          <PasteBox pick={pick} maxItems={maxItems} canEdit={canEdit} unlisted={unlisted} />
        </div>
      </div>
    </Drawer>
  );
}

function AccountSection({
  account,
  ads,
  filtered,
  pick,
  canEdit,
  onLoadMore,
}: {
  account: MetaAdAccountState;
  ads: MetaAdNode[];
  filtered: boolean;
  pick: ReturnType<typeof usePickerSelection>;
  canEdit: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section aria-label={account.name} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="min-w-0 truncate text-sm font-medium text-text">{account.name}</h4>
        <span className="shrink-0 text-micro text-text-faint">{account.metaAdAccountID}</span>
      </div>
      {ads.length === 0 ? (
        <p className="text-xs text-text-faint">
          {filtered ? 'No ads match on this account.' : 'No ads for this source on this account.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border">
          {ads.map((ad) => {
            const isSelected = pick.isSelected(ad.metaAdId);
            const disabled = !canEdit || (pick.full && !isSelected);
            return (
              <li key={ad.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() => pick.toggle(ad.metaAdId)}
                  className={`flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring disabled:cursor-not-allowed ${isSelected ? 'bg-accent-soft/40' : ''}`}
                >
                  <MediaThumb
                    src={ad.thumbnailURL}
                    alt=""
                    glyph={<IconBolt size={16} />}
                    className="h-10 w-10 shrink-0 rounded-control"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{ad.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-text-faint">
                      <span>{ad.metaAdId}</span>
                      {ad.adSetDestinationType ? (
                        <span>{DESTINATION_LABELS[ad.adSetDestinationType] ?? ad.adSetDestinationType}</span>
                      ) : null}
                    </span>
                  </span>
                  <Tag tone={adStatusTone(ad.effectiveStatus)}>{adStatusLabel(ad.effectiveStatus)}</Tag>
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong text-transparent'}`}
                  >
                    <IconCheck size={12} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <LoadMoreRow
        hasNext={account.hasNext}
        loading={account.loadingMore}
        onLoadMore={onLoadMore}
        label={`More from ${account.name}`}
      />
    </section>
  );
}

function PasteBox({
  pick,
  maxItems,
  canEdit,
  unlisted,
}: {
  pick: ReturnType<typeof usePickerSelection>;
  maxItems: number;
  canEdit: boolean;
  unlisted: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-4">
      <Label hint="Paste an ad id or an Ads Manager URL — the ids are taken from selected_ad_ids. Bare 15–20 digit ids work too.">
        Paste an ad id or an Ads Manager URL
      </Label>
      <ChipInput
        value={unlisted}
        onChange={(next) => {
          // Expand every chip through the parser: a pasted URL becomes its ids; a bare id stays.
          const expanded = next
            .flatMap((item) => (parseAdIds(item).length > 0 ? parseAdIds(item) : [item.trim()]))
            .filter(Boolean);
          const listed = pick.list().filter((id) => !unlisted.includes(id));
          pick.clear();
          pick.add([...listed, ...expanded]);
        }}
        placeholder={unlisted.length === 0 ? '120210000000000010, or a URL…' : undefined}
        maxItems={Math.max(0, maxItems - (pick.selected.size - unlisted.length))}
        /* No `maxLength` here: a pasted URL is far over 60 and must reach `validate`,
         * which lets it through when it carries ids. The 60-char rule (the setter's)
         * applies to what is STORED — a bare id. */
        separators={/[\n;\s]+/}
        normalize={(item) => item.trim()}
        validate={(item) =>
          parseAdIds(item).length > 0
            ? null
            : item.includes('/') || item.includes('=')
              ? 'No selected_ad_ids in this link — copy the URL from Ads Manager with the ads selected'
              : item.length <= AD_ID_MAX_LENGTH
                ? null
                : `An ad id is at most ${AD_ID_MAX_LENGTH} characters`
        }
        disabled={!canEdit}
        aria-label="Pasted ad ids"
      />
      {unlisted.length > 0 ? (
        <p className="text-micro text-text-faint">
          {unlisted.length === 1 ? 'This id is' : `These ${unlisted.length} ids are`} not on a loaded page — pasted, or
          from further down the list.
        </p>
      ) : null}
    </div>
  );
}
