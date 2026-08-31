import { useState } from 'react';
import { Button, DropdownMenu, IconChevronDown, IconUndo, Tag, type MenuItem } from '~ui';
import { useAutomationMutations } from '../../hooks/useAutomationMutations';
import { inheritanceOptions, inheritanceState, revertTarget } from '../../lib/inheritance';
import { inheritanceChip, parentShortLabel } from '../../lib/settingRows';
import { isInheritable } from '../../lib/settingValue';
import type { AutomationRecord, SettingInfo } from '../../types';

/** The chip beside a setting title: "Follows Default" · "Follows <source> default" · "Customized" · nothing for fixed. */
export function InheritanceChip({ setting }: { setting: SettingInfo }) {
  const chip = inheritanceChip(setting);
  if (!chip) return null;
  return (
    <Tag tone={chip.tone}>
      <span className="max-w-52 truncate">{chip.label}</span>
    </Tag>
  );
}

export interface InheritanceActionsProps {
  automation: AutomationRecord;
  setting: SettingInfo;
  canEdit: boolean;
  /** A write is in flight for this setting — the buttons stand down. */
  busy?: boolean;
}

/**
 * Under an expanded editor: for a value owned here that could follow a parent,
 * a ghost "Revert to Default" (`inheritSetting` onto `revertTarget`, undoable
 * — the mutations hook offers the previous value back); when the setting may
 * follow more than one parent (a rule: its scope's base and Default), a small
 * "Follow ▾" menu listing them — the production "Revert to ↳ Default ▾".
 * Nothing for `fixed`.
 */
export function InheritanceActions({ automation, setting, canEdit, busy = false }: InheritanceActionsProps) {
  const mutations = useAutomationMutations();
  const [pending, setPending] = useState(false);
  if (!canEdit || !isInheritable(setting.__typename)) return null;
  const state = inheritanceState(setting);
  if (state === 'fixed') return null;
  const typename = setting.__typename;
  const target = revertTarget(setting, automation.scope);
  const options = inheritanceOptions(setting);
  const disabled = busy || pending;

  const follow = (parentId: string) => {
    setPending(true);
    mutations
      .inheritSetting(automation, typename, parentId)
      .catch(() => {
        /* toasted by the hook */
      })
      .finally(() => setPending(false));
  };

  /* The revert target has its own button; every OTHER parent goes behind
     "Follow" — one button when there is one, a menu when there are more. */
  const others = state === 'own' && target ? options.filter((ref) => ref.id !== target.id) : options;
  const menuItems: MenuItem[] = others.map((ref) => ({
    id: ref.id,
    label: `Follow ${parentShortLabel(ref)}`,
    onSelect: () => follow(ref.id),
  }));

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {state === 'own' && target ? (
        <Button size="xs" variant="ghost" disabled={disabled} onClick={() => follow(target.id)}>
          <IconUndo /> Revert to {parentShortLabel(target)}
        </Button>
      ) : null}
      {others.length === 1 ? (
        <Button size="xs" variant="ghost" disabled={disabled} onClick={() => follow(others[0]!.id)}>
          Follow {parentShortLabel(others[0]!)}
        </Button>
      ) : others.length > 1 ? (
        <DropdownMenu
          items={menuItems}
          aria-label="Follow another parent"
          trigger={(props) => (
            <Button {...props} size="xs" variant="ghost" disabled={disabled}>
              Follow <IconChevronDown />
            </Button>
          )}
        />
      ) : null}
    </div>
  );
}
