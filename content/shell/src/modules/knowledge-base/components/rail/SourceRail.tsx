import { useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  IconClock,
  IconInfo,
  IconLayoutGrid,
  IconMessageCircle,
  IconSearch,
  IconSparkles,
  IconTag,
  IconUsers,
  IconWarning,
  Input,
  Skeleton,
  Tooltip,
  useRovingFocus,
} from '~ui';
import type { BudgetBreakdown } from '../../lib/budget';
import type { KnowledgeSourceSummary } from '../../lib/commands';
import { worstSeverity, type Finding, type Severity } from '../../lib/lint';
import { RAIL_SEARCH_ATTRIBUTE } from '../../lib/searchTargets';
import { SOURCE_GROUPS, sourcesIn, type SourceId, type SourceMeta } from '../../lib/sources';
import { BudgetMeter } from './BudgetMeter';

export interface SourceRailProps {
  source: SourceId;
  onSelect: (source: SourceId) => void;
  summaries: readonly KnowledgeSourceSummary[];
  findings: readonly Finding[];
  budget: BudgetBreakdown | null;
  /** Hide the sources this person is not allowed to read. */
  canReadInbox: boolean;
  loading: boolean;
}

const ICONS: Record<SourceId, ReactNode> = {
  overview: <IconLayoutGrid size={14} />,
  profile: <IconInfo size={14} />,
  instructions: <IconSparkles size={14} />,
  faq: <IconMessageCircle size={14} />,
  products: <IconTag size={14} />,
  services: <IconClock size={14} />,
  team: <IconUsers size={14} />,
  gaps: <IconWarning size={14} />,
};

const DOT: Record<Severity, string> = {
  blocker: 'bg-danger',
  warning: 'bg-warning',
  tip: 'bg-border-strong',
};

const DOT_LABEL: Record<Severity, string> = {
  blocker: 'Needs attention',
  warning: 'Worth a look',
  tip: 'A suggestion',
};

/**
 * The sources rail: a search box over the eight, then the groups, each row
 * carrying what a person actually wants to compare - how many entries are in
 * it, how much of the assistant's reading budget it spends, and whether
 * anything on it needs fixing. The budget meter is pinned underneath, because
 * the rail is the only place every source is visible at once.
 *
 * One roving Tab stop over the rows; the search box is its own. `[` / `]` step
 * sources at the workspace level.
 */
export function SourceRail({ source, onSelect, summaries, findings, budget, canReadInbox, loading }: SourceRailProps) {
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map(summaries.map((summary) => [summary.id, summary])), [summaries]);

  const q = query.trim().toLocaleLowerCase();
  const visible = (meta: SourceMeta) =>
    (!meta.needsInbox || canReadInbox) &&
    (q === '' || `${meta.label} ${meta.title} ${meta.blurb} ${meta.group}`.toLocaleLowerCase().includes(q));

  const groups = SOURCE_GROUPS.map((group) => ({ group, items: sourcesIn(group).filter(visible) })).filter(
    (entry) => entry.items.length > 0,
  );
  /* One roving list over every visible row, in rail order. */
  const rows = groups.flatMap((entry) => entry.items);
  const roving = useRovingFocus(rows.length, { orientation: 'vertical', labels: rows.map((meta) => meta.label) });
  const indexOf = (id: SourceId) => rows.findIndex((meta) => meta.id === id);

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={roving.onKeyDown}>
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
          className="pl-8 text-xs"
          {...{ [RAIL_SEARCH_ATTRIBUTE]: true }}
        />
      </div>

      <nav aria-label="Knowledge sources" className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading sources">
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
          </div>
        ) : null}
        {!loading && groups.length === 0 ? (
          <p className="p-3 text-xs text-text-muted">No source matches “{query.trim()}”.</p>
        ) : null}
        {!loading
          ? groups.map(({ group, items }) => (
              <section key={group} aria-label={group} className="border-b border-border-subtle py-1 last:border-b-0">
                <div className="px-3 py-1.5">
                  <span className="text-micro font-semibold uppercase tracking-wide text-text-faint">{group}</span>
                </div>
                <ul role="list">
                  {items.map((meta) => {
                    const selected = meta.id === source;
                    const summary = byId.get(meta.id);
                    const severity = worstSeverity(findings, meta.id);
                    return (
                      <li key={meta.id}>
                        <button
                          type="button"
                          {...roving.itemProps(indexOf(meta.id))}
                          onClick={() => onSelect(meta.id)}
                          aria-current={selected ? 'true' : undefined}
                          title={meta.blurb}
                          className={`flex w-full items-center gap-2 py-1.5 pl-3 pr-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${selected ? 'bg-accent-soft' : ''}`}
                        >
                          <span className="shrink-0 text-text-muted">{ICONS[meta.id]}</span>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm text-text ${selected ? 'font-medium' : ''}`}
                          >
                            {meta.label}
                          </span>
                          {severity ? (
                            <Tooltip
                              label={`${DOT_LABEL[severity]}: ${summary?.issues ?? 0} ${summary?.issues === 1 ? 'finding' : 'findings'}`}
                            >
                              <span
                                role="img"
                                aria-label={DOT_LABEL[severity]}
                                className={`size-1.5 shrink-0 rounded-full ${DOT[severity]}`}
                              />
                            </Tooltip>
                          ) : null}
                          {summary?.count !== null && summary?.count !== undefined ? (
                            <Badge count={summary.count} tone="muted" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          : null}
      </nav>

      {budget ? (
        <div className="shrink-0 border-t border-border p-3">
          <BudgetMeter budget={budget} compact />
        </div>
      ) : null}
    </div>
  );
}
