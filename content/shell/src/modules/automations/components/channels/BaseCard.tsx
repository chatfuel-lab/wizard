import { Card } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { settingRowGroups } from '../../lib/settingRows';
import type { AutomationRecord, SettingTypename } from '../../types';
import { SettingSection } from './SettingSection';

export interface BaseCardProps {
  base: AutomationRecord;
  canEdit: boolean;
  /** Which sections are open (typenames). */
  expanded: ReadonlySet<SettingTypename>;
  onExpandedChange: (typename: SettingTypename, expanded: boolean) => void;
  /** The typename the deep link asked to focus (consumed once by the page). */
  focusTypename: SettingTypename | null;
}

/**
 * The Default rules card of a scope: the base automation's settings grouped
 * by behaviour (`settingRowGroups` → `BEHAVIOR_GROUPS` order) under small
 * group headings, one `SettingSection` per setting. For Default itself the
 * title is "Default rules"; for a source, what every conversation on it
 * starts from.
 */
export function BaseCard({ base, canEdit, expanded, onExpandedChange, focusTypename }: BaseCardProps) {
  const isAll = base.scope === FuelyAutomationScope.All;
  const groups = settingRowGroups(base);
  return (
    <Card
      title="Default rules"
      description={
        isAll
          ? 'What every source starts from — a source or a rule that follows Default takes these values.'
          : 'What every conversation on this source starts from. Rules below refine them.'
      }
      padded={false}
    >
      <div className="flex flex-col">
        {/* Keyed by label: `groupSettings` reuses the 'sales' id for its "Other"
            group (named-not-fixed) — the label is unique. */}
        {groups.map(({ group, rows }) => (
          <section key={group.label} aria-label={group.label} className="border-t border-border first:border-t-0">
            <h4 className="px-4 pb-1 pt-3 text-micro font-semibold uppercase tracking-wide text-text-faint">
              {group.label}
            </h4>
            <div className="px-4 pb-2">
              {rows.map((row) => (
                <SettingSection
                  key={row.typename}
                  automation={base}
                  setting={row.setting}
                  canEdit={canEdit}
                  expanded={expanded.has(row.typename)}
                  onExpandedChange={(open) => onExpandedChange(row.typename, open)}
                  autoFocus={focusTypename === row.typename}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
