import { useEffect, useRef } from 'react';
import { Button, IconPlus } from '~ui';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { AutomationRecord } from '../../types';
import { RuleCard } from '../customs/RuleCard';

export interface RulesListProps {
  scope: FuelyAutomationScope;
  customs: readonly AutomationRecord[];
  canEdit: boolean;
  /** `?automation=` — the card to expand and scroll to. */
  focusedId: string | null;
  /** `?setting=` typename to open inside that card (consumed once by the page). */
  focusSetting: string | null;
  loaded: boolean;
  onNewRule: (scope: FuelyAutomationScope) => void;
  /** A card was expanded or collapsed — the Test panel follows the last opened one. */
  onRuleOpenChange: (automationId: string, open: boolean) => void;
}

/**
 * "Rules on this source (n)" + New rule, then one `RuleCard` per custom
 * automation. The `?automation=` card scrolls into view
 * ONCE after the data has landed — a ref + a `scrolled` flag, reset only when
 * the id changes, never on a live update (a base edit fans out to every rule
 * and would otherwise yank the page on each event).
 */
export function RulesList({
  scope,
  customs,
  canEdit,
  focusedId,
  focusSetting,
  loaded,
  onNewRule,
  onRuleOpenChange,
}: RulesListProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!focusedId || !loaded) return;
    if (scrolledFor.current === focusedId) return;
    const node = cardRefs.current.get(focusedId);
    if (!node) return;
    scrolledFor.current = focusedId;
    node.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [focusedId, loaded, customs]);

  useEffect(() => {
    if (focusedId === null) scrolledFor.current = null;
  }, [focusedId]);

  return (
    <section aria-label="Rules on this source" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-heading font-semibold text-text">
          Rules on this source <span className="font-normal text-text-muted">({customs.length})</span>
        </h3>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={() => onNewRule(scope)}>
            <IconPlus /> New rule
          </Button>
        ) : null}
      </div>
      {customs.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
          No rules yet — every conversation here follows the Default rules above.
          {canEdit ? ' A rule reacts to specific comments, posts, ads or links and can answer differently.' : ''}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {customs.map((rule) => (
            <div
              key={rule.id}
              ref={(node) => {
                if (node) cardRefs.current.set(rule.id, node);
                else cardRefs.current.delete(rule.id);
              }}
              data-automation-id={rule.id}
              className="scroll-mt-4"
            >
              <RuleCard
                automation={rule}
                canEdit={canEdit}
                expanded={focusedId === rule.id}
                focusSetting={focusedId === rule.id ? focusSetting : null}
                onOpenChange={onRuleOpenChange}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
