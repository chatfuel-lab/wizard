import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { bandAtLeast, SplitPane, type Band } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import type { AutomationsParams } from '../../lib/automationsParams';
import { PANEL_INLINE_FROM, RAIL_COLLAPSE_BELOW } from '../../lib/layout';
import type { AutomationsRole } from '../../types';
import { ScopePage } from './ScopePage';
import { ScopeRail } from './ScopeRail';
/* Side-effect import: fills the frozen editor registry with the 15 editors
 * (`components/editors/register.ts`). Once, here — the first place a
 * `SettingSection` can mount from. */
import '../editors/register';

export interface ChannelsViewProps {
  params: AutomationsParams;
  onParams: (patch: Partial<AutomationsParams>) => void;
  band: Band;
  role: AutomationsRole;
  /** Report whether a load is in flight, so the header can spin. */
  onBusy: (busy: boolean) => void;
  onNewRule: (scope?: FuelyAutomationScope) => void;
  /** A rule card was expanded or collapsed — the Test panel follows the last opened one. */
  onRuleOpenChange: (automationId: string, open: boolean) => void;
  /** The Test panel body; the view decides where it sits (a right column, or under the page when narrow). */
  testPanel: ReactNode | null;
}

/**
 * The module's one surface: the rail of 18 sources beside the selected
 * scope's page (its Default rules card and the rules on it), and the Test
 * panel always open beside them from `PANEL_INLINE_FROM` up — below that band
 * it stacks under the scope page instead, never behind a button. `SplitPane`
 * stacks rail and page below `RAIL_COLLAPSE_BELOW`; the URL (`?scope=`,
 * `?automation=`, `?setting=`) is the only state a person can arrive at.
 *
 * Which pane is showing while the panes are stacked is real state, NOT a
 * `scope ? 'detail' : 'side'` expression: a scope is ALWAYS selected here
 * (All is the default), so the derived form would pin this to 'detail'
 * forever and the back control could never reach the rail at all. Even where
 * a selection can be empty the derived form is wrong for the same reason
 * livechat spells out — pressing back sets 'side' while the selection is
 * still set, and the next render derives 'detail' again and throws the
 * reader straight back.
 *
 * Seeded from the DEEP LINK at mount so `?scope=` / `?automation=` opens the
 * scope page at every width — 360 px included — while a cold open lands on
 * the rail, which is the only pane that can be navigated FROM. Every later
 * scope change (a rail click, `[` / `]`, ⌘K) flips to the detail pane.
 */
export function ChannelsView({
  params,
  onParams,
  band,
  role,
  onBusy,
  onNewRule,
  onRuleOpenChange,
  testPanel,
}: ChannelsViewProps) {
  const { state } = useAutomationRecords();
  const scope = params.scope;
  const panelInline = bandAtLeast(band, PANEL_INLINE_FROM);

  const [showing, setShowing] = useState<'side' | 'detail'>(() =>
    params.scope !== FuelyAutomationScope.All || params.automation !== null ? 'detail' : 'side',
  );
  const lastScope = useRef(scope);
  useEffect(() => {
    if (lastScope.current === scope) return;
    lastScope.current = scope;
    setShowing('detail');
  }, [scope]);

  const select = useCallback(
    (next: FuelyAutomationScope) => {
      /* The workspace's dirty guard runs inside `onParams`; the flip to detail
         happens when the scope actually changes (effect above) — or right away
         when the row is the one already selected. */
      if (next === scope) setShowing('detail');
      onParams({ scope: next, automation: null, setting: null });
    },
    [onParams, scope],
  );

  useEffect(() => onBusy(state.loading), [onBusy, state.loading]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SplitPane
          side={<ScopeRail scope={scope} onSelect={select} />}
          sideLabel="Sources"
          sideWidth="sidenav"
          collapseBelow={RAIL_COLLAPSE_BELOW}
          showing={showing}
          onShowingChange={setShowing}
        >
          <ScopePage
            key={scope}
            scope={scope}
            automationId={params.automation}
            settingKey={params.setting}
            role={role}
            onParams={onParams}
            onNewRule={onNewRule}
            onRuleOpenChange={onRuleOpenChange}
            footer={!panelInline && testPanel ? testPanel : null}
          />
        </SplitPane>
      </div>
      {panelInline && testPanel ? (
        <aside
          aria-label="Test"
          className="flex w-inspector shrink-0 flex-col overflow-hidden border-l border-border bg-surface-raised"
        >
          {testPanel}
        </aside>
      ) : null}
    </div>
  );
}
