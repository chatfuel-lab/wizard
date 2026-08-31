import { useMemo, useState } from 'react';
import { ConfirmDialog, MenuButton, Popover, Switch, Tag, type MenuItem } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { useAutomationMutations } from '../../hooks/useAutomationMutations';
import { useComposites } from '../../hooks/useComposites';
import { resolvedDiff, revertTarget } from '../../lib/inheritance';
import { platformOf, scopeDescription, scopeLabel } from '../../lib/scopes';
import { collapsedSummary, parentShortLabel } from '../../lib/settingRows';
import { SETTING_TITLES } from '../../lib/settingSummary';
import { isInheritable, settingOf } from '../../lib/settingValue';
import type { AutomationRecord } from '../../types';
import { CopyToDialog } from './CopyToDialog';
import { PlatformGlyph } from './PlatformGlyph';
import { ConnectionChip } from './ScopeRail';

export interface ScopeHeaderProps {
  base: AutomationRecord;
  customs: readonly AutomationRecord[];
  canEdit: boolean;
}

/**
 * The top of a scope page: glyph, label ("Default · All channels" for All),
 * the source's description, its enabled switch (on All it IS the bot's AI
 * master switch — the one place it lives), the connection chip, the
 * "n settings customized" compare popover and the overflow menu (Copy
 * settings to…, Revert every setting to Default, Turn every rule on / off).
 * The Test panel is always open beside the page, so nothing here toggles it.
 */
export function ScopeHeader({ base, customs, canEdit }: ScopeHeaderProps) {
  const { state } = useAutomationRecords();
  const catalog = useCatalog();
  const mutations = useAutomationMutations();
  const composites = useComposites();
  const [copyOpen, setCopyOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);

  const scope = base.scope;
  const isAll = scope === FuelyAutomationScope.All;
  const platform = platformOf(scope);
  const channel = platform ? catalog.channels.find((c) => c.platform === platform) : undefined;

  const diff = useMemo(() => resolvedDiff(base, state.byId), [base, state.byId]);
  const owned = diff.filter((d) => d.state === 'own');

  const revertAll = async () => {
    for (const d of owned) {
      const setting = settingOf(base.settings, d.typename);
      if (!setting || !isInheritable(setting.__typename)) continue;
      const target = revertTarget(setting, base.scope);
      if (!target) continue;
      try {
        await mutations.inheritSetting(base, setting.__typename, target.id);
      } catch {
        /* toasted by the hook; keep going — the rest can still revert */
      }
    }
  };

  const menu: MenuItem[] = [
    { id: 'copy', label: 'Copy settings to…', onSelect: () => setCopyOpen(true), disabled: !canEdit },
    ...(isAll
      ? []
      : [
          {
            id: 'revert',
            label: 'Revert every setting to Default',
            onSelect: () => setRevertOpen(true),
            disabled: !canEdit || owned.length === 0,
          },
        ]),
    ...(customs.length > 0
      ? [
          { kind: 'separator' as const, id: 'sep' },
          {
            id: 'on',
            label: 'Turn every rule on',
            onSelect: () => void composites.bulkEnabled(customs, true),
            disabled: !canEdit || customs.every((c) => c.enabled),
          },
          {
            id: 'off',
            label: 'Turn every rule off',
            onSelect: () => void composites.bulkEnabled(customs, false),
            disabled: !canEdit || customs.every((c) => !c.enabled),
          },
        ]
      : []),
  ];

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <PlatformGlyph platform={platform} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-title font-semibold text-text">
              {isAll ? 'Default · All channels' : scopeLabel(scope)}
            </h2>
            <Switch
              checked={base.enabled}
              disabled={!canEdit}
              label={isAll ? (base.enabled ? 'AI is on' : 'AI is off') : base.enabled ? 'On' : 'Off'}
              onChange={(on) => mutations.setEnabled(base, on).then(() => undefined)}
            />
          </div>
          <p className="mt-0.5 text-sm text-text-muted">{scopeDescription(scope)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <MenuButton items={menu} label="More actions" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {platform ? <ConnectionChip channel={channel} platform={platform} /> : <Tag>18 sources start from here</Tag>}
        {!isAll && owned.length > 0 ? (
          <Popover
            placement="bottom-start"
            aria-label="Customized settings"
            className="w-[28rem] max-w-[90vw]"
            trigger={(props) => (
              <button
                type="button"
                {...props}
                className="inline-flex items-center rounded-chip bg-surface-sunken px-1.5 py-0.5 text-xs font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
              >
                {owned.length === 1 ? '1 setting customized' : `${owned.length} settings customized`}
              </button>
            )}
          >
            <CompareList base={base} />
          </Popover>
        ) : null}
        {!isAll && owned.length === 0 ? <Tag>Follows Default for everything</Tag> : null}
        {customs.length > 0 ? <Tag>{customs.length === 1 ? '1 rule' : `${customs.length} rules`}</Tag> : null}
      </div>

      <CopyToDialog open={copyOpen} onClose={() => setCopyOpen(false)} source={base} />
      <ConfirmDialog
        open={revertOpen}
        onClose={() => setRevertOpen(false)}
        title="Revert every setting to Default?"
        confirmLabel="Revert all"
        tone="default"
        onConfirm={revertAll}
      >
        {owned.length === 1 ? 'The one customized setting' : `All ${owned.length} customized settings`} of{' '}
        {isAll ? 'Default' : scopeLabel(scope)} will follow Default again. Undo is one deep — only the last reverted
        setting can be undone from its toast.
      </ConfirmDialog>
    </header>
  );
}

/** The compare popover body: every owned setting, its value here beside its parent's. */
function CompareList({ base }: { base: AutomationRecord }) {
  const { state } = useAutomationRecords();
  const diff = resolvedDiff(base, state.byId).filter((d) => d.state === 'own');
  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {diff.map((d) => {
        const setting = settingOf(base.settings, d.typename);
        const parentRecord = d.parent ? state.byId[d.parent.id] : undefined;
        const parentSetting = parentRecord ? settingOf(parentRecord.settings, d.typename) : undefined;
        return (
          <li
            key={d.typename}
            className="flex flex-col gap-0.5 border-b border-border-subtle pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-xs font-medium text-text">{SETTING_TITLES[d.typename]}</span>
            <span className="text-xs text-text-muted">
              <span className="text-text-faint">Here · </span>
              {setting ? collapsedSummary(setting) : '—'}
            </span>
            <span className="text-xs text-text-muted">
              <span className="text-text-faint">{d.parent ? parentShortLabel(d.parent) : 'Parent'} · </span>
              {!parentRecord
                ? 'not loaded'
                : !parentSetting
                  ? 'no such setting there'
                  : !d.differsFromParent
                    ? 'same as Default'
                    : collapsedSummary(parentSetting)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
