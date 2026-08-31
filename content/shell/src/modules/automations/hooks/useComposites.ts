import { useCallback, useMemo, useRef } from 'react';
import { useToast } from '~ui';
import { useAutomationsUndo } from '../AutomationsUndoContext';
import {
  planBulkEnabled,
  planCopyTo,
  planDuplicate,
  planFromTemplate,
  reportPhrase,
  runPlan,
  type Plan,
  type PlanReport,
  type RuleTemplateInput,
} from '../lib/composites';
import { undoLabel, type UndoEntry } from '../lib/undo';
import type { AutomationRecord, SettingTypename } from '../types';
import { useAutomationMutations } from './useAutomationMutations';

export interface Composites {
  /** Runs any plan with a progress toast; returns the report. */
  run: (plan: Plan, opts?: { undo?: UndoEntry | null; undoRun?: () => Promise<void> }) => Promise<PlanReport>;
  duplicate: (source: AutomationRecord, name: string) => Promise<PlanReport>;
  /** Not undoable — the caller asks first. */
  copyTo: (
    source: AutomationRecord,
    targets: readonly AutomationRecord[],
    typenames: readonly SettingTypename[],
  ) => Promise<PlanReport>;
  bulkEnabled: (records: readonly AutomationRecord[], enabled: boolean) => Promise<PlanReport>;
  fromTemplate: (input: RuleTemplateInput) => Promise<PlanReport>;
  /** A plan is running. */
  busy: () => boolean;
}

/**
 * The composites (see `lib/composites.ts`) with the workspace's toasts and undo
 * around them: one progress toast per plan (`id: 'composite'`, replaced in place
 * — never N toasts per step), the report toast at the end, an undo entry where
 * a compensating plan exists (bulk enable → the inverse; duplicate / template →
 * delete the new rule).
 */
export function useComposites(): Composites {
  const mutations = useAutomationMutations();
  const undo = useAutomationsUndo();
  const toast = useToast();
  const running = useRef(false);

  const run = useCallback<Composites['run']>(
    async (plan, opts) => {
      running.current = true;
      const total = plan.steps.length;
      if (total > 1)
        toast.show({
          id: 'composite',
          title: `${plan.label}…`,
          description: `0 of ${total}`,
          tone: 'info',
          duration: 60_000,
        });
      try {
        const report = await runPlan(plan, {
          ...mutations.runner,
          onProgress: (done, all, label) => {
            if (all > 1)
              toast.show({
                id: 'composite',
                title: `${label}…`,
                description: `${done} of ${all}`,
                tone: 'info',
                duration: 60_000,
              });
          },
        });
        const entry = report.failed === 0 || report.done > 0 ? (opts?.undo ?? null) : null;
        let ran = false;
        const runner = async () => {
          if (ran || !opts?.undoRun) return;
          ran = true;
          undo.clear();
          try {
            await opts.undoRun();
          } catch (err) {
            toast.show({
              title: 'Could not undo',
              description: err instanceof Error ? err.message : String(err),
              tone: 'danger',
            });
          }
        };
        if (entry) undo.push(entry, runner);
        toast.show({
          id: 'composite',
          title: reportPhrase(report),
          description: report.message ?? undefined,
          tone:
            report.aborted || (report.failed > 0 && report.done === 0)
              ? 'danger'
              : report.failed > 0
                ? 'warning'
                : 'success',
          duration: report.failed > 0 ? undefined : 4000,
          action: entry ? { label: undoLabel(entry) ?? 'Undo', onClick: () => void runner() } : undefined,
        });
        return report;
      } finally {
        running.current = false;
      }
    },
    [mutations.runner, toast, undo],
  );

  const duplicate = useCallback<Composites['duplicate']>(
    async (source, name) => {
      const plan = planDuplicate(source, name);
      // The undo of a duplicate is deleting what it created — decided after the run.
      const report = await run(plan, {
        undo: null,
      });
      const createdId = report.createdId;
      if (createdId) {
        const id = createdId;
        const scope = source.scope;
        let ran = false;
        const runner = async () => {
          if (ran) return;
          ran = true;
          undo.clear();
          await mutations.runner.remove(id, scope);
        };
        const entry: UndoEntry = { kind: 'create', ids: [id], what: 'duplicate', at: Date.now() };
        undo.push(entry, runner);
        toast.show({
          id: 'composite',
          title: reportPhrase(report),
          tone: report.failed > 0 ? 'warning' : 'success',
          duration: report.failed > 0 ? undefined : 4000,
          description:
            report.failed > 0 ? `${report.failed} settings could not be copied — open the rule to check.` : undefined,
          action: { label: undoLabel(entry) ?? 'Undo', onClick: () => void runner() },
        });
      }
      return report;
    },
    [run, undo, mutations.runner, toast],
  );

  const copyTo = useCallback<Composites['copyTo']>(
    (source, targets, typenames) => run(planCopyTo(source, targets, typenames)),
    [run],
  );

  const bulkEnabled = useCallback<Composites['bulkEnabled']>(
    (records, enabled) => {
      const pending = records.filter((r) => r.enabled !== enabled);
      const from: Record<string, boolean> = {};
      for (const r of pending) from[r.id] = r.enabled;
      return run(planBulkEnabled(records, enabled), {
        undo: pending.length
          ? { kind: 'enabled', ids: pending.map((r) => r.id), from, to: enabled, at: Date.now() }
          : null,
        undoRun: async () => {
          await runPlan(
            planBulkEnabled(
              pending.map((r) => ({ ...r, enabled })),
              !enabled,
            ),
            mutations.runner,
          );
        },
      });
    },
    [run, mutations.runner],
  );

  const fromTemplate = useCallback<Composites['fromTemplate']>(
    async (input) => {
      const report = await run(planFromTemplate(input));
      if (report.createdId) {
        const id = report.createdId;
        let ran = false;
        const runner = async () => {
          if (ran) return;
          ran = true;
          undo.clear();
          await mutations.runner.remove(id, input.scope);
        };
        undo.push({ kind: 'create', ids: [id], what: 'template', at: Date.now() }, runner);
      }
      return report;
    },
    [run, undo, mutations.runner],
  );

  return useMemo(
    () => ({ run, duplicate, copyTo, bulkEnabled, fromTemplate, busy: () => running.current }),
    [run, duplicate, copyTo, bulkEnabled, fromTemplate],
  );
}
