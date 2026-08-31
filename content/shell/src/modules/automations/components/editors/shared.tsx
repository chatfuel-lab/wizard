/**
 * What every editor shares — the two save models, wired once.
 *
 * - `useImmediateSave(automation)` — switches, selects, radios: one write per
 *   change through `mutations.saveSetting(...)`, which toasts a failure and
 *   offers undo on success; the section header shows the spinner
 *   (`isSaving`). Nothing to render here.
 * - `useEditorDraft(automation, setting)` — prompts and lists: a
 *   `useSettingDraft` whose `write` VALIDATES first (`validateSettingUpdate`)
 *   and then saves `quiet`, so ⌘S / Save-all and the section's own Save button
 *   both refuse the same drafts with the same sentence, inline, never a toast.
 * - `DraftFooter` — the `SectionSaveBar` for a draft.
 * - `ModeControl` — a `SegmentedControl` over an `EnumOption[]`.
 * - `useAutoFocus` — the `?setting=` deep link focuses the first control.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SegmentedControl, type SegmentOption } from '~ui';
import { useAutomationRecords } from '../../AutomationsStoreContext';
import { useAutomationMutations } from '../../hooks/useAutomationMutations';
import { useSettingDraft, type DraftApi } from '../../hooks/useSettingDraft';
import { isSaving } from '../../lib/automationsStore';
import type { EnumOption } from '../../lib/settingSummary';
import { settingUpdateInput } from '../../lib/settingValue';
import type {
  AutomationRecord,
  KnownSettingTypename,
  SettingInfo,
  SettingOf,
  SettingUpdate,
  SettingUpdateOf,
} from '../../types';
import { SectionSaveBar } from '../channels/SectionSaveBar';
import { validateSettingUpdate } from '../../lib/limits';

/** True while a write for this setting is in flight (the store's `saving` list). */
export function useSettingSaving(automationId: string, typename: string): boolean {
  const { state } = useAutomationRecords();
  return isSaving(state, automationId, typename);
}

/**
 * The immediate model. Returns `save(update)`: fire the write, swallow the
 * rejection (the hook has already toasted it), resolve either way so a
 * `Switch` can await it without surfacing a second error line.
 */
export function useImmediateSave(automation: AutomationRecord): (update: SettingUpdate) => Promise<void> {
  const mutations = useAutomationMutations();
  return useCallback(
    async (update: SettingUpdate) => {
      try {
        await mutations.saveSetting(automation, update, { what: 'edit' });
      } catch {
        /* toasted by the hook; the store rolled nothing back because setting writes are not optimistic */
      }
    },
    [mutations, automation],
  );
}

/**
 * The draft model over one setting. `serverValue` is the write shape of the
 * setting as the store holds it now; the draft reconciles live updates on
 * its own (adopt when clean, conflict when dirty).
 */
export function useEditorDraft<T extends KnownSettingTypename>(
  automation: AutomationRecord,
  setting: SettingOf<T>,
): DraftApi<SettingUpdateOf<T>> {
  const mutations = useAutomationMutations();
  const typename = (setting as SettingInfo).__typename as T;
  const serverValue = useMemo(
    () => settingUpdateInput(setting as SettingInfo)!.update as SettingUpdateOf<T>,
    [setting],
  );
  const write = useCallback(
    async (value: SettingUpdateOf<T>) => {
      const update = { type: typename, update: value } as SettingUpdate;
      const problem = validateSettingUpdate(update, automation.scope);
      if (problem) throw new Error(problem);
      await mutations.saveSetting(automation, update, { quiet: true });
    },
    [mutations, automation, typename],
  );
  return useSettingDraft<SettingUpdateOf<T>>(automation.id, typename, serverValue, write);
}

/** What the footer needs from a draft — the value type is not its business. */
export type DraftFooterApi = Pick<
  DraftApi<never>,
  'dirty' | 'saving' | 'error' | 'conflict' | 'save' | 'discard' | 'useTheirs' | 'keepMine'
>;

/** The Save / Cancel bar of a draft section, with its error and conflict banner. */
export function DraftFooter({ draft, canEdit }: { draft: DraftFooterApi; canEdit: boolean }) {
  return (
    <SectionSaveBar
      dirty={draft.dirty}
      saving={draft.saving}
      error={draft.error}
      conflict={draft.conflict}
      canEdit={canEdit}
      onSave={() =>
        void draft.save().catch(() => {
          /* shown inline by the draft */
        })
      }
      onCancel={draft.discard}
      onUseTheirs={draft.useTheirs}
      onKeepMine={draft.keepMine}
    />
  );
}

/** A `SegmentedControl` over an enum's options. Disabled options render but cannot be chosen. */
export function ModeControl<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  lockedTo,
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly EnumOption<T>[];
  disabled?: boolean;
  /** Every option but this one is disabled (a mode the scope does not allow). */
  lockedTo?: T;
  'aria-label': string;
}) {
  const segments: SegmentOption<T>[] = options.map((option) => ({
    value: option.value,
    label: option.label,
    disabled: disabled || (lockedTo !== undefined && option.value !== lockedTo),
  }));
  return (
    /* Four labelled segments overrun a 360px column; the control scrolls
       inside its own box rather than widening the page. */
    <div className="max-w-full overflow-x-auto">
      <SegmentedControl<T> value={value} onChange={onChange} options={segments} size="sm" aria-label={ariaLabel} />
    </div>
  );
}

/** What counts as "the first control" of an editor for the deep-link focus. */
const FIRST_CONTROL =
  'textarea, input:not([type="hidden"]), [role="radio"][aria-checked="true"], [role="switch"], button:not([disabled])';

/**
 * Ref for an editor's root; on mount, when the deep link asked (`autoFocus`),
 * focuses the first control inside it. A root ref rather than a control ref
 * because `~ui`'s form components own their element refs.
 */
export function useAutoFocus(autoFocus: boolean | undefined) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const id = window.requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>(FIRST_CONTROL)?.focus({ preventScroll: true }),
    );
    return () => window.cancelAnimationFrame(id);
    // Once, on mount — the deep link is consumed by the section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/** A small muted line inside an editor. */
export function Hint({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warning' }) {
  return <p className={`text-xs ${tone === 'warning' ? 'text-warning' : 'text-text-muted'}`}>{children}</p>;
}

/** The label above a control inside an editor. */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-text-muted">
      {children}
    </label>
  );
}
