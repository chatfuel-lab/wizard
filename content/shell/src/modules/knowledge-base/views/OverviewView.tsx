import { useCallback, useEffect, useMemo } from 'react';
import { Card, PageBody, Skeleton, StatTile } from '~ui';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { BudgetMeter } from '../components/rail/BudgetMeter';
import { FindingsList } from '../components/overview/FindingsList';
import { FirstRunPanel } from '../components/overview/FirstRunPanel';
import { ReadinessCard } from '../components/overview/ReadinessCard';
import { useLint } from '../hooks/useLint';
import { budgetBreakdown, type BudgetBreakdown } from '../lib/budget';
import { selectProducts, selectServices, specialistChars } from '../lib/catalogStore';
import { countBySeverity, readinessScore, type Finding } from '../lib/lint';
import { firstSteps, isFirstRun, overviewStats, readinessVerdict, type OverviewFacts } from '../lib/overview';
import { PROFILE_FIELDS } from '../lib/profileFields';
import type { SourceId } from '../lib/sources';
import type { KnowledgeViewProps } from './types';

/**
 * The health page, and the landing page.
 *
 * It answers three questions in the order somebody actually has them: is this
 * ready, what is in it, and what do I do next. The score and the findings come
 * from `useLint` — the FULL list, not the per-source slice the view contract
 * hands every other page, because the whole point of this one is the list
 * nobody has filtered.
 *
 * The budget breakdown is derived here from the same pure function the
 * workspace uses for the rail meter. It is one call to `budgetBreakdown`, not
 * a second copy of the arithmetic, and passing it down would have meant
 * changing a view contract that is deliberately frozen.
 */
export function OverviewView({ onParams, onBusy }: KnowledgeViewProps) {
  const store = useKnowledge();
  const catalog = useCatalog();
  const findings = useLint();

  useEffect(() => onBusy(false), [onBusy]);

  const products = useMemo(() => selectProducts(catalog.state), [catalog.state]);
  const services = useMemo(() => selectServices(catalog.state), [catalog.state]);
  const kb = store.state.kb;
  const usage = store.state.usage;

  const budget: BudgetBreakdown | null = useMemo(() => {
    if (!kb || !usage) return null;
    return budgetBreakdown({
      total: usage.total,
      catalog: usage.catalog,
      kb,
      products,
      services,
      teamChars: specialistChars(catalog.state.specialists),
      full: store.state.full,
    });
  }, [kb, usage, products, services, catalog.state.specialists, store.state.full]);

  const facts: OverviewFacts | null = useMemo(() => {
    if (!kb) return null;
    return {
      profileText: PROFILE_FIELDS.map((field) => kb[field] ?? '').join(''),
      instructions: kb.additionalInstructions ?? '',
      openDays: (kb.businessHoursSchedule.workingHours ?? []).filter((day) => day.enabled).length,
      faqs: store.state.faqs.length,
      products: products.length,
      services: services.length,
      team: catalog.state.specialists.length,
      catalogReady: catalog.state.ready,
    };
  }, [
    kb,
    store.state.faqs.length,
    products.length,
    services.length,
    catalog.state.specialists.length,
    catalog.state.ready,
  ]);

  const goSource = useCallback(
    (source: SourceId) => onParams({ source, item: null, q: '', import: null, draft: null }),
    [onParams],
  );
  const openFinding = useCallback(
    (finding: Finding) =>
      onParams({ source: finding.source, item: finding.item ?? null, q: '', import: null, draft: null }),
    [onParams],
  );

  if (!kb || !facts) {
    return (
      <PageBody measure="app">
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the overview">
          <Skeleton variant="block" height="8rem" />
          <Skeleton variant="block" height="6rem" />
          <Skeleton variant="block" height="14rem" />
        </div>
      </PageBody>
    );
  }

  if (isFirstRun(facts)) {
    return (
      <PageBody measure="form">
        <FirstRunPanel steps={firstSteps(facts)} onOpen={goSource} />
      </PageBody>
    );
  }

  const score = readinessScore(findings);
  const counts = countBySeverity(findings);
  const stats = overviewStats(facts);

  return (
    <PageBody measure="app">
      <div className="flex flex-col gap-4">
        <ReadinessCard score={score} counts={counts} verdict={readinessVerdict(score, counts)} />

        <div className="grid grid-cols-2 gap-3 @compact:grid-cols-3 @wide:grid-cols-5">
          {stats.map((stat) => (
            <StatTile key={stat.id} label={stat.label} value={stat.value} stale={store.state.loading} />
          ))}
        </div>

        {budget ? (
          <Card title="Where the reading budget goes">
            <BudgetMeter budget={budget} />
          </Card>
        ) : null}

        <FindingsList findings={findings} onOpen={openFinding} />
      </div>
    </PageBody>
  );
}
