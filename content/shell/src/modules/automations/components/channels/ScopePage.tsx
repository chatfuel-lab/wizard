import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, EmptyState, IconSparkles, PageBody, Skeleton } from '~ui';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { typenameOfKey, type AutomationsParams, type SettingKey } from '../../lib/automationsParams';
import { isInitialLoad, selectBase, selectCustoms } from '../../lib/automationsStore';
import { allowsCustomAutomations } from '../../lib/scopes';
import type { AutomationsRole, SettingTypename } from '../../types';
import { BaseCard } from './BaseCard';
import { RulesList } from './RulesList';
import { ScopeHeader } from './ScopeHeader';

export interface ScopePageProps {
  scope: FuelyAutomationScope;
  /** `?automation=` — the rule card to expand and scroll to. */
  automationId: string | null;
  /** `?setting=` — the section to open on arrival (consumed once). */
  settingKey: SettingKey | null;
  role: AutomationsRole;
  onParams: (patch: Partial<AutomationsParams>) => void;
  onNewRule: (scope?: FuelyAutomationScope) => void;
  /** A rule card was expanded or collapsed — the Test panel follows the last opened one. */
  onRuleOpenChange: (automationId: string, open: boolean) => void;
  /** Rendered under the page — the Test panel when the band is too narrow for a column. */
  footer?: ReactNode;
}

/**
 * The detail pane of Channels for one scope: header, the Default rules card,
 * and (where the scope accepts rules) the rules list. Mounted with
 * `key={scope}` by the view, so the open-sections set and the consumed deep
 * link start fresh per scope.
 *
 * `?setting=` is consumed ONCE: latched into local state the first time the
 * data is there, the matching section opened (on the Default card when no
 * `?automation=`, else handed to that `RuleCard`), and the param cleared from
 * the URL — a reload must not re-open it, and a live update must not either.
 */
export function ScopePage({
  scope,
  automationId,
  settingKey,
  role,
  onParams,
  onNewRule,
  onRuleOpenChange,
  footer,
}: ScopePageProps) {
  const store = useAutomationRecords();
  const { state } = store;
  const base = useMemo(() => selectBase(state, scope), [state, scope]);
  const customs = useMemo(() => selectCustoms(state, scope), [state, scope]);
  const loading = isInitialLoad(state);
  const canEdit = role.canEdit && !role.loading;

  const [expanded, setExpanded] = useState<ReadonlySet<SettingTypename>>(() => new Set());
  const toggle = useCallback((typename: SettingTypename, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(typename);
      else next.delete(typename);
      return next;
    });
  }, []);

  /* The deep-linked section, latched once (see above). Kept as the URL's KEY
     ('bookingRules') — B2's RuleCard takes `focusSetting` in the `?setting=`
     vocabulary; the BaseCard wants the typename, derived below. */
  const [focus, setFocus] = useState<{ automationId: string | null; key: SettingKey } | null>(null);
  useEffect(() => {
    if (!settingKey || !base) return;
    setFocus({ automationId, key: settingKey });
    if (!automationId) setExpanded((prev) => new Set(prev).add(typenameOfKey(settingKey) as SettingTypename));
    onParams({ setting: null });
  }, [settingKey, base, automationId, onParams]);

  const errorAlert = state.error ? (
    <Alert
      tone="danger"
      title="Could not load the automations"
      action={
        <Button size="sm" variant="secondary" onClick={() => store.refetch()}>
          Retry
        </Button>
      }
    >
      {state.error}
    </Alert>
  ) : null;

  return (
    <PageBody measure="form">
      <div className="flex flex-col gap-4">
        {errorAlert}
        {!role.loading && !role.canEdit ? (
          <Alert tone="info" title="Read only">
            Your role can see these settings but not change them — editing needs the Ai · Edit permission on this bot.
          </Alert>
        ) : null}
        {loading && !base ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the source">
            <Skeleton variant="block" height="4rem" />
            <Skeleton variant="block" height="18rem" />
            <Skeleton variant="block" height="8rem" />
          </div>
        ) : base ? (
          <>
            <ScopeHeader base={base} customs={customs} canEdit={canEdit} />
            <BaseCard
              base={base}
              canEdit={canEdit}
              expanded={expanded}
              onExpandedChange={toggle}
              focusTypename={
                focus && focus.automationId === null ? (typenameOfKey(focus.key) as SettingTypename) : null
              }
            />
            {allowsCustomAutomations(scope) ? (
              <RulesList
                scope={scope}
                customs={customs}
                canEdit={canEdit}
                focusedId={automationId}
                focusSetting={
                  focus && focus.automationId !== null && focus.automationId === automationId ? focus.key : null
                }
                loaded={state.loaded}
                onNewRule={onNewRule}
                onRuleOpenChange={onRuleOpenChange}
              />
            ) : null}
          </>
        ) : state.loaded ? (
          <EmptyState
            icon={<IconSparkles />}
            title="This source has no Default rules"
            description="The bot answered without a base automation for this source. Refresh, and if it stays empty, check the bot in Chatfuel."
            action={
              <Button variant="secondary" onClick={() => store.refetch()}>
                Refresh
              </Button>
            }
          />
        ) : null}
        {footer ? (
          <section
            aria-label="Test"
            className="flex h-[28rem] min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface-raised"
          >
            {footer}
          </section>
        ) : null}
      </div>
    </PageBody>
  );
}
