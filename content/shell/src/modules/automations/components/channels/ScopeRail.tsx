import { useMemo, useState } from 'react';
import { Badge, IconSearch, Input, Skeleton, Tag, useRovingFocus } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import type { ChannelConnection } from '../../hooks/useBootstrap';
import {
  isInitialLoad,
  selectAllBase,
  selectBase,
  selectCustomsCount,
  selectScopeStatus,
  type ScopeStatus,
} from '../../lib/automationsStore';
import { customizedCount } from '../../lib/inheritance';
import { SCOPE_GROUPS, scopeLabel, scopeShortLabel, type Platform } from '../../lib/scopes';
import { PlatformGlyph } from './PlatformGlyph';
import { ScopeGlyph } from './ScopeGlyph';

export interface ScopeRailProps {
  scope: FuelyAutomationScope;
  onSelect: (scope: FuelyAutomationScope) => void;
}

const STATUS_LABEL: Record<ScopeStatus, string> = { on: 'On', off: 'Off', unknown: 'Unknown' };

/** The connection chip of a platform group header. */
export function ConnectionChip({ channel, platform }: { channel: ChannelConnection | undefined; platform: Platform }) {
  if (!channel) return null;
  if (channel.connected) return <Tag tone="success">{channel.handle ?? 'Connected'}</Tag>;
  return <Tag>{platform === 'Web Widget' ? 'Widget off' : 'Not connected'}</Tag>;
}

/**
 * The Channels rail: a search box over the 18, the Default row under its own
 * heading, then the five platform groups (glyph, name, connection chip) with a
 * row per source — source glyph, short label, an `Off` tag when the source is
 * not running, "n customized", rules count.
 *
 * A row carries a glyph rather than a status dot because the label alone does
 * not identify it: three quarters of the short labels ("Direct messages",
 * "Post comments", "Click from ads") repeat across the groups. Being off is the
 * rarer thing and the one worth a word, so it is a tag; the full state is on
 * the row's `title` either way.
 *
 * One roving Tab stop over the rows; the search box is its own. `[` / `]` step
 * scopes at the workspace level.
 */
export function ScopeRail({ scope, onSelect }: ScopeRailProps) {
  const { state } = useAutomationRecords();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');

  const allBase = selectAllBase(state);
  const customs = useMemo(() => selectCustomsCount(state), [state]);
  const customized = useMemo(() => {
    const out: Partial<Record<FuelyAutomationScope, number>> = {};
    for (const group of SCOPE_GROUPS) {
      for (const s of group.scopes) {
        const base = selectBase(state, s);
        out[s] = base ? customizedCount(base, state.byId) : 0;
      }
    }
    return out;
  }, [state]);

  const q = query.trim().toLocaleLowerCase();
  const matches = (s: FuelyAutomationScope, platform: Platform) =>
    !q || `${platform} ${scopeShortLabel(s)} ${scopeLabel(s)}`.toLocaleLowerCase().includes(q);
  const showDefault = !q || 'default all channels'.includes(q);
  const groups = SCOPE_GROUPS.map((group) => ({
    ...group,
    scopes: group.scopes.filter((s) => matches(s, group.platform)),
  })).filter((g) => g.scopes.length > 0);

  /* One roving list over every visible row: Default first, then the groups' rows in order. */
  const rows = useMemo(
    () => [...(showDefault ? [FuelyAutomationScope.All] : []), ...groups.flatMap((g) => g.scopes)],
    [showDefault, groups],
  );
  const roving = useRovingFocus(rows.length, {
    orientation: 'vertical',
    labels: rows.map((s) => (s === FuelyAutomationScope.All ? 'Default' : scopeShortLabel(s))),
  });
  const indexOf = (s: FuelyAutomationScope) => rows.indexOf(s);

  const loading = isInitialLoad(state);
  const allStatus: ScopeStatus = allBase ? (allBase.enabled ? 'on' : 'off') : 'unknown';

  return (
    /* The background is the rail's own: below the collapse band there is no
       `<aside>` at all and this nav is the whole screen, so a background left
       on the parent would disappear at exactly the width where it is all there
       is to see. */
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised" onKeyDown={roving.onKeyDown}>
      {/* Search */}
      <div className="relative shrink-0 border-b border-border px-3 py-2">
        <IconSearch
          size={14}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a source…"
          aria-label="Find a source"
          data-automations-scope-search
          className="pl-8 text-xs"
        />
      </div>

      {/* Groups */}
      <nav aria-label="Sources" className="min-h-0 flex-1 overflow-y-auto">
        {loading && !allBase ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading sources">
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
          </div>
        ) : null}
        {!showDefault && groups.length === 0 ? (
          <p className="p-3 text-xs text-text-muted">No source matches “{query.trim()}”.</p>
        ) : null}
        {showDefault && !(loading && !allBase) ? (
          <section aria-label="Default" className="border-b border-border-subtle py-1">
            <div className="px-3 py-1.5">
              <span className="text-micro font-semibold uppercase tracking-wide text-text-faint">Default</span>
            </div>
            <button
              type="button"
              {...roving.itemProps(indexOf(FuelyAutomationScope.All))}
              onClick={() => onSelect(FuelyAutomationScope.All)}
              aria-current={scope === FuelyAutomationScope.All ? 'true' : undefined}
              title={allStatus === 'unknown' ? 'Unknown' : allStatus === 'on' ? 'AI is on' : 'AI is off'}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${scope === FuelyAutomationScope.All ? 'bg-accent-soft' : ''}`}
            >
              <span className="shrink-0 text-text-muted">
                <ScopeGlyph scope={FuelyAutomationScope.All} />
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${scope === FuelyAutomationScope.All ? 'font-medium' : ''} text-text`}
              >
                Default · All channels
              </span>
              {allStatus === 'off' ? <Tag tone="neutral">Off</Tag> : null}
            </button>
          </section>
        ) : null}
        {groups.map((group) => {
          const channel = catalog.channels.find((c) => c.platform === group.platform);
          return (
            <section
              key={group.platform}
              aria-label={group.platform}
              className="border-b border-border-subtle py-1 last:border-b-0"
            >
              <div className="flex items-center gap-2 px-3 py-1.5">
                <PlatformGlyph platform={group.platform} size="sm" />
                <span className="min-w-0 flex-1 truncate text-micro font-semibold uppercase tracking-wide text-text-faint">
                  {group.platform}
                </span>
                <ConnectionChip channel={channel} platform={group.platform} />
              </div>
              <ul role="list">
                {group.scopes.map((s) => {
                  const status = selectScopeStatus(state, s);
                  const selected = s === scope;
                  const rules = customs[s] ?? 0;
                  const own = customized[s] ?? 0;
                  return (
                    <li key={s}>
                      <button
                        type="button"
                        {...roving.itemProps(indexOf(s))}
                        onClick={() => onSelect(s)}
                        aria-current={selected ? 'true' : undefined}
                        title={STATUS_LABEL[status]}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${selected ? 'bg-accent-soft' : ''}`}
                      >
                        <span className="shrink-0 text-text-muted">
                          <ScopeGlyph scope={s} />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${selected ? 'font-medium text-text' : 'text-text'}`}
                        >
                          {scopeShortLabel(s)}
                        </span>
                        {status === 'off' ? <Tag tone="neutral">Off</Tag> : null}
                        {own > 0 ? <span className="shrink-0 text-micro text-text-faint">{own} customized</span> : null}
                        <Badge count={rules} tone="muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </div>
  );
}
