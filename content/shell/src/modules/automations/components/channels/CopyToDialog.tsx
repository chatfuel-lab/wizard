import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Dialog } from '~ui';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { useComposites } from '../../hooks/useComposites';
import { selectBase } from '../../lib/automationsStore';
import { copyableSettings } from '../../lib/composites';
import { SCOPE_GROUPS, scopeLabel, scopeShortLabel } from '../../lib/scopes';
import { collapsedSummary } from '../../lib/settingRows';
import { SETTING_TITLES } from '../../lib/settingSummary';
import { settingOf } from '../../lib/settingValue';
import type { AutomationRecord, SettingTypename } from '../../types';
import { PlatformGlyph } from './PlatformGlyph';
import { ConnectionChip } from './ScopeRail';

export interface CopyToDialogProps {
  open: boolean;
  onClose: () => void;
  /** The automation whose settings are copied — a base here. */
  source: AutomationRecord;
}

/**
 * "Copy settings to…": pick which of the source's inheritable settings
 * (`copyableSettings`) and which target sources (the other bases, Default
 * first, then grouped by platform with the connection shown), then run
 * `useComposites().copyTo` — one progress toast, a report at the end. It is
 * NOT undoable (the targets become owners of the copied values and their
 * previous values are gone), so it says so and asks first.
 */
export function CopyToDialog({ open, onClose, source }: CopyToDialogProps) {
  const { state } = useAutomationRecords();
  const catalog = useCatalog();
  const composites = useComposites();
  const [busy, setBusy] = useState(false);

  const typenames = useMemo(() => copyableSettings(source), [source]);
  const [picked, setPicked] = useState<Set<SettingTypename>>(() => new Set(typenames));
  const [targets, setTargets] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!open) return;
    setPicked(new Set(typenames));
    setTargets(new Set());
    // Reset every time the dialog opens; `typenames` follows `source`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allBase = source.scope === FuelyAutomationScope.All ? null : selectBase(state, FuelyAutomationScope.All);
  const groups = SCOPE_GROUPS.map((group) => ({
    platform: group.platform,
    channel: catalog.channels.find((c) => c.platform === group.platform),
    bases: group.scopes
      .filter((s) => s !== source.scope)
      .map((s) => selectBase(state, s))
      .filter((b): b is AutomationRecord => b !== null),
  }));
  const candidates = [...(allBase ? [allBase] : []), ...groups.flatMap((g) => g.bases)];
  const chosen = candidates.filter((b) => targets.has(b.id));

  const toggleSetting = (t: SettingTypename, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(t);
      else next.delete(t);
      return next;
    });
  const toggleTarget = (id: string, on: boolean) =>
    setTargets((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleGroup = (ids: string[], on: boolean) =>
    setTargets((prev) => {
      const next = new Set(prev);
      for (const id of ids)
        if (on) next.add(id);
        else next.delete(id);
      return next;
    });

  const run = async () => {
    setBusy(true);
    try {
      await composites.copyTo(source, chosen, [...picked]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const sourceLabel = source.scope === FuelyAutomationScope.All ? 'Default' : scopeLabel(source.scope);

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={`Copy settings from ${sourceLabel}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void run()} loading={busy} disabled={busy || picked.size === 0 || chosen.length === 0}>
            Copy to {chosen.length === 1 ? 'one source' : `${chosen.length} sources`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title="This cannot be undone">
          The chosen settings become owned values on every selected source — what they had before is replaced, and any
          source that followed Default for them stops following.
        </Alert>

        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Which settings</h4>
          <ul className="flex flex-col gap-1.5">
            {typenames.map((t) => {
              const setting = settingOf(source.settings, t);
              return (
                <li key={t}>
                  <Checkbox
                    checked={picked.has(t)}
                    onChange={(on) => toggleSetting(t, on)}
                    disabled={busy}
                    label={
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm text-text">{SETTING_TITLES[t]}</span>
                        {setting ? (
                          <span className="truncate text-micro text-text-muted">{collapsedSummary(setting)}</span>
                        ) : null}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">To which sources</h4>
          {allBase ? (
            <div className="flex items-center gap-2 rounded-control border border-border px-2 py-1.5">
              <Checkbox
                checked={targets.has(allBase.id)}
                onChange={(on) => toggleTarget(allBase.id, on)}
                disabled={busy}
                label={<span className="text-sm text-text">Default · All channels</span>}
              />
              <span className="ml-auto text-micro text-text-faint">every source that follows Default changes too</span>
            </div>
          ) : null}
          {groups.map((group) => {
            const ids = group.bases.map((b) => b.id);
            const on = ids.filter((id) => targets.has(id)).length;
            if (ids.length === 0) return null;
            return (
              <div key={group.platform} className="rounded-control border border-border">
                <div className="flex items-center gap-2 border-b border-border-subtle px-2 py-1.5">
                  <Checkbox
                    checked={on === 0 ? false : on === ids.length ? true : 'indeterminate'}
                    onChange={(next) => toggleGroup(ids, next)}
                    disabled={busy}
                    aria-label={`Every ${group.platform} source`}
                  />
                  <PlatformGlyph platform={group.platform} size="sm" />
                  <span className="text-sm font-medium text-text">{group.platform}</span>
                  <span className="ml-auto">
                    <ConnectionChip channel={group.channel} platform={group.platform} />
                  </span>
                </div>
                <ul className="flex flex-col gap-1 px-2 py-1.5">
                  {group.bases.map((base) => (
                    <li key={base.id}>
                      <Checkbox
                        checked={targets.has(base.id)}
                        onChange={(next) => toggleTarget(base.id, next)}
                        disabled={busy}
                        label={<span className="text-sm text-text">{scopeShortLabel(base.scope)}</span>}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      </div>
    </Dialog>
  );
}
