import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  FuelyAutomationCreateDocument,
  FuelyAutomationDeleteDocument,
  FuelyAutomationSetEnabledDocument,
  FuelyAutomationSetNameDocument,
  type FuelyAutomationScope,
} from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import { useAutomationRecords } from '../AutomationsStoreContext';
import { useAutomationsUndo } from '../AutomationsUndoContext';
import { planRestore, runPlan, snapshotOf, withLockRetry, type RunnerContext } from '../lib/composites';
import { errorMessage } from '../lib/errors';
import { saveKey } from '../lib/automationsStore';
import { applySettingInherit, applySettingUpdate } from '../lib/settingDocs';
import { isInheritable, settingOf, settingUpdateInput } from '../lib/settingValue';
import { undoLabel, type UndoEntry } from '../lib/undo';
import { SETTING_LABELS } from '../lib/settingSummary';
import type { AutomationRecord, InheritableSettingTypename, KnownSettingTypename, SettingUpdate } from '../types';

export interface AutomationMutations {
  /** Optimistic on `enabled`; rolls back on failure; undoable. */
  setEnabled: (record: AutomationRecord, enabled: boolean) => Promise<boolean>;
  /** Optimistic on `name`; undoable. */
  rename: (record: AutomationRecord, name: string) => Promise<boolean>;
  /** Not optimistic; the response is adopted; the caller lands on the new rule. */
  create: (scope: FuelyAutomationScope, name: string) => Promise<AutomationRecord>;
  /** Removes the rule; undo = re-create from a snapshot (new id). */
  remove: (record: AutomationRecord) => Promise<boolean>;
  /**
   * Write one setting's value. Not optimistic (the server resolves the value:
   * duplicates dropped, blanks removed) — the section shows `saving`, adopts the
   * response, and gets an undo that writes the previous value (or re-follows the
   * previous parent) back. Rejects with a human message for inline display;
   * `quiet` skips the toast (drafts show their own inline error).
   */
  saveSetting: (
    record: AutomationRecord,
    update: SettingUpdate,
    opts?: { quiet?: boolean; what?: 'edit' | 'revert' },
  ) => Promise<AutomationRecord>;
  /** Follow a parent from `canInheritFrom`; undo = write the previous owned value back. */
  inheritSetting: (
    record: AutomationRecord,
    typename: InheritableSettingTypename,
    parentId: string,
  ) => Promise<AutomationRecord>;
  /** The raw runner context for composites (`useComposites` builds on it). */
  runner: RunnerContext;
}

/**
 * Every write the workspace makes, in one place. Optimism goes through the
 * store's `editStarted` / `editSucceeded` / `editFailed` for the two optimistic
 * fields; every response is dispatched as `live {origin: 'own'}` so an own edit
 * and a teammate's reconcile through the same path. Toasts for failures on the
 * immediate controls (never `state.error`), an undo entry for successes; drafts
 * pass `quiet` and show the error under their Save button.
 */
export function useAutomationMutations(): AutomationMutations {
  const { client, botId } = useAutomations();
  const { dispatch } = useAutomationRecords();
  const undo = useAutomationsUndo();
  const toast = useToast();

  const adopt = useCallback(
    (automation: AutomationRecord) => dispatch({ type: 'live', automation, origin: 'own' }),
    [dispatch],
  );

  const offer = useCallback(
    (entry: UndoEntry, run: () => Promise<void>, title: string, id: string) => {
      /* The runner guards itself: the toast button and ⌘Z both reach it, `done`
       * makes a second call a no-op, and it clears the offer first (deals' lesson). */
      let done = false;
      const runner = async () => {
        if (done) return;
        done = true;
        undo.clear();
        try {
          await run();
        } catch (err) {
          toast.show({ title: 'Could not undo', description: errorMessage(err), tone: 'danger' });
        }
      };
      undo.push(entry, runner);
      toast.show({
        id,
        title,
        tone: 'success',
        duration: 4000,
        action: { label: undoLabel(entry) ?? 'Undo', onClick: () => void runner() },
      });
    },
    [undo, toast],
  );

  const setEnabledRaw = useCallback(
    async (id: string, enabled: boolean): Promise<AutomationRecord> => {
      const data = await client.mutate(FuelyAutomationSetEnabledDocument, { botID: botId, automationID: id, enabled });
      return data.fuelyAutomationSetEnabled as unknown as AutomationRecord;
    },
    [client, botId],
  );

  const setEnabled = useCallback<AutomationMutations['setEnabled']>(
    async (record, enabled) => {
      if (record.enabled === enabled) return true;
      dispatch({ type: 'editStarted', id: record.id, next: { ...record, enabled } });
      try {
        const patch = await withLockRetry(() => setEnabledRaw(record.id, enabled));
        const saved = { ...record, enabled: patch.enabled, updatedAt: patch.updatedAt };
        dispatch({ type: 'editSucceeded', id: record.id, automation: saved });
        const label = record.isBase ? (record.scope === 'All' ? 'AI' : 'This source') : `“${record.name ?? 'Rule'}”`;
        offer(
          { kind: 'enabled', ids: [record.id], from: { [record.id]: record.enabled }, to: enabled, at: Date.now() },
          async () => {
            const back = await withLockRetry(() => setEnabledRaw(record.id, record.enabled));
            dispatch({
              type: 'live',
              automation: { ...saved, enabled: back.enabled, updatedAt: back.updatedAt },
              origin: 'own',
            });
          },
          `${label} is ${enabled ? 'on' : 'off'}`,
          `enabled-${record.id}`,
        );
        return true;
      } catch (err) {
        dispatch({ type: 'editFailed', id: record.id, now: Date.now() });
        toast.show({
          title: `Could not turn ${enabled ? 'on' : 'off'}`,
          description: errorMessage(err),
          tone: 'danger',
        });
        return false;
      }
    },
    [dispatch, setEnabledRaw, offer, toast],
  );

  const renameRaw = useCallback(
    async (id: string, name: string) => {
      const data = await client.mutate(FuelyAutomationSetNameDocument, { botID: botId, automationID: id, name });
      return data.fuelyAutomationSetName;
    },
    [client, botId],
  );

  const rename = useCallback<AutomationMutations['rename']>(
    async (record, name) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === record.name) return true;
      dispatch({ type: 'editStarted', id: record.id, next: { ...record, name: trimmed } });
      try {
        const patch = await withLockRetry(() => renameRaw(record.id, trimmed));
        const saved = { ...record, name: patch.name, updatedAt: patch.updatedAt };
        dispatch({ type: 'editSucceeded', id: record.id, automation: saved });
        const from = record.name ?? '';
        offer(
          { kind: 'rename', id: record.id, from, at: Date.now() },
          async () => {
            const back = await withLockRetry(() => renameRaw(record.id, from));
            dispatch({
              type: 'live',
              automation: { ...saved, name: back.name, updatedAt: back.updatedAt },
              origin: 'own',
            });
          },
          `Renamed to “${trimmed}”`,
          `rename-${record.id}`,
        );
        return true;
      } catch (err) {
        dispatch({ type: 'editFailed', id: record.id, now: Date.now() });
        toast.show({ title: 'Could not rename', description: errorMessage(err), tone: 'danger' });
        return false;
      }
    },
    [dispatch, renameRaw, offer, toast],
  );

  const createRaw = useCallback(
    async (scope: FuelyAutomationScope, name: string): Promise<AutomationRecord> => {
      const data = await client.mutate(FuelyAutomationCreateDocument, { botID: botId, scope, name });
      return data.fuelyAutomationCreate as AutomationRecord;
    },
    [client, botId],
  );

  const create = useCallback<AutomationMutations['create']>(
    async (scope, name) => {
      const created = await withLockRetry(() => createRaw(scope, name));
      adopt(created);
      return created;
    },
    [createRaw, adopt],
  );

  const removeRaw = useCallback(
    async (id: string, scope: FuelyAutomationScope) => {
      const data = await client.mutate(FuelyAutomationDeleteDocument, { botID: botId, automationID: id, scope });
      dispatch({
        type: 'scopeReplaced',
        scope,
        automations: (data.fuelyAutomationDelete.fuelyAutomations ?? []) as AutomationRecord[],
      });
    },
    [client, botId, dispatch],
  );

  const setRaw = useCallback(
    (id: string, update: SettingUpdate) => applySettingUpdate(client, botId, id, update),
    [client, botId],
  );
  const inheritRaw = useCallback(
    (id: string, typename: KnownSettingTypename, parentId: string) =>
      applySettingInherit(client, botId, id, typename as InheritableSettingTypename, parentId),
    [client, botId],
  );

  const runner = useMemo<RunnerContext>(
    () => ({
      create: async (scope, name) => {
        const created = await createRaw(scope, name);
        adopt(created);
        return created;
      },
      set: async (id, update) => {
        const saved = await setRaw(id, update);
        adopt(saved);
        return saved;
      },
      inherit: async (id, typename, parentId) => {
        const saved = await inheritRaw(id, typename, parentId);
        adopt(saved);
        return saved;
      },
      setEnabled: async (id, enabled) => {
        const patch = await setEnabledRaw(id, enabled);
        return patch;
      },
      rename: async (id, name) => {
        const patch = await renameRaw(id, name);
        return patch as unknown as AutomationRecord;
      },
      remove: removeRaw,
      messageOf: (err) => errorMessage(err),
    }),
    [createRaw, adopt, setRaw, inheritRaw, setEnabledRaw, renameRaw, removeRaw],
  );

  const remove = useCallback<AutomationMutations['remove']>(
    async (record) => {
      const snapshot = snapshotOf(record);
      try {
        await withLockRetry(() => removeRaw(record.id, record.scope));
        offer(
          { kind: 'delete', snapshots: [snapshot], at: Date.now() },
          async () => {
            const report = await runPlan(planRestore(snapshot), runner);
            if (report.aborted) throw new Error(report.message ?? 'Could not restore');
            toast.show({
              title: `Restored “${snapshot.name}” as a new rule`,
              description:
                report.failed > 0
                  ? `${report.failed} settings could not be restored — open the rule to check.`
                  : undefined,
              tone: report.failed > 0 ? 'warning' : 'success',
              duration: 5000,
            });
          },
          `Deleted “${record.name ?? 'rule'}”`,
          `delete-${record.id}`,
        );
        return true;
      } catch (err) {
        toast.show({ title: 'Could not delete', description: errorMessage(err), tone: 'danger' });
        return false;
      }
    },
    [removeRaw, offer, runner, toast],
  );

  const saveSetting = useCallback<AutomationMutations['saveSetting']>(
    async (record, update, opts) => {
      const key = saveKey(record.id, update.type);
      const before = settingOf(record.settings, update.type);
      dispatch({ type: 'saveStarted', key });
      try {
        const saved = await withLockRetry(() => setRaw(record.id, update));
        adopt(saved);
        if (before) {
          const previous =
            before.inheritsFrom && isInheritable(before.__typename)
              ? { inheritFrom: before.inheritsFrom.id }
              : (() => {
                  const prev = settingUpdateInput(before);
                  return prev ? { update: prev } : null;
                })();
          if (previous) {
            const entry: UndoEntry = {
              kind: 'setting',
              id: record.id,
              typename: update.type,
              before: previous,
              what: opts?.what ?? 'edit',
              at: Date.now(),
            };
            offer(
              entry,
              async () => {
                const back =
                  'inheritFrom' in previous
                    ? await withLockRetry(() => inheritRaw(record.id, update.type, previous.inheritFrom))
                    : await withLockRetry(() => setRaw(record.id, previous.update));
                adopt(back);
              },
              `${SETTING_LABELS[update.type]} saved`,
              `setting-${key}`,
            );
          }
        }
        return saved;
      } catch (err) {
        if (!opts?.quiet)
          toast.show({
            title: `Could not save ${SETTING_LABELS[update.type].toLowerCase()}`,
            description: errorMessage(err),
            tone: 'danger',
          });
        throw new Error(errorMessage(err), { cause: err });
      } finally {
        dispatch({ type: 'saveSettled', key });
      }
    },
    [dispatch, setRaw, adopt, offer, inheritRaw, toast],
  );

  const inheritSetting = useCallback<AutomationMutations['inheritSetting']>(
    async (record, typename, parentId) => {
      const key = saveKey(record.id, typename);
      const before = settingOf(record.settings, typename);
      dispatch({ type: 'saveStarted', key });
      try {
        const saved = await withLockRetry(() => inheritRaw(record.id, typename, parentId));
        adopt(saved);
        const prev = before ? settingUpdateInput(before) : null;
        if (prev && !before?.inheritsFrom) {
          offer(
            { kind: 'setting', id: record.id, typename, before: { update: prev }, what: 'revert', at: Date.now() },
            async () => {
              const back = await withLockRetry(() => setRaw(record.id, prev));
              adopt(back);
            },
            `${SETTING_LABELS[typename]} now follows the parent`,
            `setting-${key}`,
          );
        }
        return saved;
      } catch (err) {
        toast.show({
          title: `Could not revert ${SETTING_LABELS[typename].toLowerCase()}`,
          description: errorMessage(err),
          tone: 'danger',
        });
        throw new Error(errorMessage(err), { cause: err });
      } finally {
        dispatch({ type: 'saveSettled', key });
      }
    },
    [dispatch, inheritRaw, adopt, offer, setRaw, toast],
  );

  return useMemo(
    () => ({ setEnabled, rename, create, remove, saveSetting, inheritSetting, runner }),
    [setEnabled, rename, create, remove, saveSetting, inheritSetting, runner],
  );
}
