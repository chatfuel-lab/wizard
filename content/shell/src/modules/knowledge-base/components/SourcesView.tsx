import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, EmptyState, IconBook, SplitPane, type Band } from '~ui';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import type { BudgetBreakdown } from '../lib/budget';
import type { KnowledgeSourceSummary } from '../lib/commands';
import type { KnowledgeParams } from '../lib/knowledgeParams';
import { isInitialLoad, isUnavailable } from '../lib/knowledgeStore';
import { findingsFor, type Finding } from '../lib/lint';
import { RAIL_COLLAPSE_BELOW } from '../lib/layout';
import type { SourceId } from '../lib/sources';
import type { KnowledgeRole } from '../types';
import { FaqView } from '../views/FaqView';
import { GapsView } from '../views/GapsView';
import { InstructionsView } from '../views/InstructionsView';
import { OverviewView } from '../views/OverviewView';
import { ProductsView } from '../views/ProductsView';
import { ProfileView } from '../views/ProfileView';
import { ServicesView } from '../views/ServicesView';
import { TeamView } from '../views/TeamView';
import type { KnowledgeViewProps } from '../views/types';
import { SourceRail } from './rail/SourceRail';

export interface SourcesViewProps {
  params: KnowledgeParams;
  onParams: (patch: Partial<KnowledgeParams>) => void;
  band: Band;
  role: KnowledgeRole;
  findings: readonly Finding[];
  summaries: readonly KnowledgeSourceSummary[];
  budget: BudgetBreakdown | null;
  canEditHere: boolean;
  onBusy: (busy: boolean) => void;
}

const VIEWS: Record<SourceId, (props: KnowledgeViewProps) => ReactElement> = {
  overview: OverviewView,
  profile: ProfileView,
  instructions: InstructionsView,
  faq: FaqView,
  products: ProductsView,
  services: ServicesView,
  team: TeamView,
  gaps: GapsView,
};

/**
 * The module's one surface: the rail of knowledge sources beside the selected
 * source's page. `SplitPane` stacks the two below `RAIL_COLLAPSE_BELOW`; the
 * URL (`?source=`, `?item=`, `?q=`, `?import=`) is the only state a person can
 * arrive at.
 *
 * Which pane is showing while stacked is real state, NOT a `source ? 'detail' :
 * 'side'` expression: a source is ALWAYS selected here (Overview is the
 * default), so the derived form would pin this to 'detail' forever and the back
 * control could never reach the rail at all.
 *
 * Seeded from the DEEP LINK at mount so `?source=faq` opens the page at every
 * width - 360px included - while a cold open lands on the rail, which is the
 * only pane that can be navigated FROM.
 */
export function SourcesView({
  params,
  onParams,
  band,
  role,
  findings,
  summaries,
  budget,
  canEditHere,
  onBusy,
}: SourcesViewProps) {
  const store = useKnowledge();
  const source = params.source;

  const [showing, setShowing] = useState<'side' | 'detail'>(() => (params.source !== 'overview' ? 'detail' : 'side'));
  const lastSource = useRef(source);
  useEffect(() => {
    if (lastSource.current === source) return;
    lastSource.current = source;
    setShowing('detail');
  }, [source]);

  const select = useCallback(
    (next: SourceId) => {
      /* The workspace's unsaved-changes guard runs inside `onParams`; the flip
         to detail happens when the source actually changes (effect above) - or
         right away when the row is the one already selected. */
      if (next === source) setShowing('detail');
      onParams({ source: next, item: null, q: '', import: null, draft: null });
    },
    [onParams, source],
  );

  const View = VIEWS[source];
  const loading = isInitialLoad(store.state);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <SplitPane
        side={
          <SourceRail
            source={source}
            onSelect={select}
            summaries={summaries}
            findings={findings}
            budget={budget}
            canReadInbox={role.canReadInbox}
            loading={loading}
          />
        }
        sideLabel="Knowledge sources"
        sideWidth="sidenav"
        collapseBelow={RAIL_COLLAPSE_BELOW}
        showing={showing}
        onShowingChange={setShowing}
      >
        {store.state.error ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title="Could not load the knowledge base"
              action={
                <Button size="sm" variant="secondary" onClick={store.refetch}>
                  Try again
                </Button>
              }
            >
              {store.state.error}
            </Alert>
          </div>
        ) : isUnavailable(store.state) ? (
          <EmptyState
            icon={<IconBook />}
            title="This bot has no AI configuration"
            description="The knowledge base lives on the bot's Fuely config, and this bot does not have one. Nothing here can be read or written until it does."
          />
        ) : (
          <View
            key={source}
            role={role}
            params={params}
            onParams={onParams}
            band={band}
            onBusy={onBusy}
            findings={findingsFor(findings, source)}
            canEditHere={canEditHere}
          />
        )}
      </SplitPane>
    </div>
  );
}
