/**
 * Composites — the operations the API does not have, built from the ones it
 * has: duplicate a rule, copy settings to other sources, turn every rule of a
 * source on or off, restore a deleted rule (undo), create from a template.
 *
 * Shape: a PLANNER is pure and returns a `Plan` (steps); the RUNNER executes
 * the steps STRICTLY SEQUENTIALLY (the API holds a per-bot edit lock —
 * `FuelyAutomationBeingEdited`; three parallel writes lost one live) with a
 * short backoff on the lock, dispatches every response through the store's
 * `live {origin:'own'}` path, and reports what was and was not done. A
 * failed `create` aborts the plan; a failed setting step is recorded and the
 * plan continues (a duplicate with 7 of 9 settings is still a rule you can
 * open and fix). `$new` in a step means "the id the create step returned".
 */
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { AutomationRecord, KnownSettingTypename, SettingInfo, SettingTypename, SettingUpdate } from '../types';
import { isEditLock } from './errors';
import { INHERITABLE, isFilterSetting, isInheritable, settingUpdateInput } from './settingValue';
import type { AutomationSnapshot } from './undo';

export type StepId = string | '$new';

export type Step =
  | { kind: 'create'; scope: FuelyAutomationScope; name: string }
  | { kind: 'set'; id: StepId; update: SettingUpdate }
  | { kind: 'inherit'; id: StepId; typename: KnownSettingTypename; parentId: string }
  | { kind: 'enabled'; id: StepId; enabled: boolean }
  | { kind: 'rename'; id: StepId; name: string }
  | { kind: 'delete'; id: string; scope: FuelyAutomationScope };

export interface Plan {
  /** "Duplicate «Spring posts»", "Turn 4 rules off" — the progress toast title. */
  label: string;
  steps: Step[];
}

export interface StepResult {
  step: Step;
  ok: boolean;
  /** The automation the API returned (every step but delete returns one). */
  automation?: AutomationRecord;
  error?: string;
}

export interface PlanReport {
  label: string;
  results: StepResult[];
  done: number;
  failed: number;
  /** The id `$new` resolved to, if the plan created one. */
  createdId: string | null;
  /** Aborted at a create failure. */
  aborted: boolean;
  /** The first error, for the toast. */
  message: string | null;
}

// ---------------------------------------------------------------------------
// Planners (pure)
// ---------------------------------------------------------------------------

/** The settings a rule can carry over: filters as owned values, the rest as owned or inherited. */
function settingSteps(id: StepId, settings: readonly SettingInfo[], only?: ReadonlySet<SettingTypename>): Step[] {
  const steps: Step[] = [];
  for (const setting of settings) {
    if (only && !only.has(setting.__typename)) continue;
    if (setting.inheritsFrom && isInheritable(setting.__typename)) {
      steps.push({ kind: 'inherit', id, typename: setting.__typename, parentId: setting.inheritsFrom.id });
      continue;
    }
    const update = settingUpdateInput(setting);
    if (update) steps.push({ kind: 'set', id, update });
  }
  return steps;
}

/** A copy of `source` in its own scope, under `name`, disabled until the person turns it on. */
export function planDuplicate(source: AutomationRecord, name: string): Plan {
  return {
    label: `Duplicate “${source.name ?? 'rule'}”`,
    steps: [{ kind: 'create', scope: source.scope, name }, ...settingSteps('$new', source.settings)],
  };
}

/**
 * Copy the chosen settings of `source` onto `targets` — as owned values, so the
 * targets stop following their parents for those settings. Filters are never
 * copied (a trigger belongs to its rule); a setting a target does not carry
 * (a scope without comments has no PublicReply) is skipped.
 */
export function planCopyTo(
  source: AutomationRecord,
  targets: readonly AutomationRecord[],
  typenames: readonly SettingTypename[],
): Plan {
  const wanted = new Set(typenames.filter((t) => !isFilterSetting(t)));
  const steps: Step[] = [];
  for (const target of targets) {
    if (target.id === source.id) continue;
    const carries = new Set(target.settings.map((s) => s.__typename));
    for (const setting of source.settings) {
      if (!wanted.has(setting.__typename) || !carries.has(setting.__typename)) continue;
      const update = settingUpdateInput(setting);
      if (update) steps.push({ kind: 'set', id: target.id, update });
    }
  }
  return { label: `Copy settings to ${targets.length === 1 ? 'one source' : `${targets.length} sources`}`, steps };
}

export function planBulkEnabled(records: readonly AutomationRecord[], enabled: boolean): Plan {
  const pending = records.filter((r) => r.enabled !== enabled);
  /* A base IS a source; a custom automation is a rule. A mixed selection says
     "automations". */
  const bases = pending.filter((r) => r.isBase).length;
  const noun = bases === pending.length ? 'source' : bases === 0 ? 'rule' : 'automation';
  const what = pending.length === 1 ? `one ${noun}` : `${pending.length} ${noun}s`;
  return {
    label: `Turn ${what} ${enabled ? 'on' : 'off'}`,
    steps: pending.map((r) => ({ kind: 'enabled', id: r.id, enabled })),
  };
}

/** What a delete must remember to be undone. */
export function snapshotOf(record: AutomationRecord): AutomationSnapshot {
  const owned: SettingUpdate[] = [];
  const inherited: AutomationSnapshot['inherited'] = [];
  for (const setting of record.settings) {
    if (setting.inheritsFrom && isInheritable(setting.__typename)) {
      inherited.push({ typename: setting.__typename, parentId: setting.inheritsFrom.id });
      continue;
    }
    const update = settingUpdateInput(setting);
    if (update) owned.push(update);
  }
  return {
    id: record.id,
    scope: record.scope,
    name: record.name ?? 'Restored rule',
    enabled: record.enabled,
    owned,
    inherited,
  };
}

/** Re-create a deleted rule from its snapshot — a new id; the caller says so. */
export function planRestore(snapshot: AutomationSnapshot): Plan {
  const steps: Step[] = [{ kind: 'create', scope: snapshot.scope, name: snapshot.name }];
  for (const update of snapshot.owned) steps.push({ kind: 'set', id: '$new', update });
  for (const inh of snapshot.inherited)
    steps.push({ kind: 'inherit', id: '$new', typename: inh.typename, parentId: inh.parentId });
  if (snapshot.enabled) steps.push({ kind: 'enabled', id: '$new', enabled: true });
  return { label: `Restore “${snapshot.name}”`, steps };
}

/** A starter: name + the settings it pre-fills (write shape) — see `lib/templates.ts`. */
export interface RuleTemplateInput {
  name: string;
  scope: FuelyAutomationScope;
  settings: SettingUpdate[];
}

export function planFromTemplate(input: RuleTemplateInput): Plan {
  return {
    label: `Create “${input.name}”`,
    steps: [
      { kind: 'create', scope: input.scope, name: input.name },
      ...input.settings.map((update): Step => ({ kind: 'set', id: '$new', update })),
    ],
  };
}

/** Which of an automation's settings a "copy to" dialog offers: the inheritable ones it owns or follows. */
export function copyableSettings(record: AutomationRecord): SettingTypename[] {
  return record.settings.map((s) => s.__typename).filter((t) => INHERITABLE.has(t));
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunnerContext {
  create: (scope: FuelyAutomationScope, name: string) => Promise<AutomationRecord>;
  set: (id: string, update: SettingUpdate) => Promise<AutomationRecord>;
  inherit: (id: string, typename: KnownSettingTypename, parentId: string) => Promise<AutomationRecord>;
  setEnabled: (id: string, enabled: boolean) => Promise<AutomationRecord>;
  rename: (id: string, name: string) => Promise<AutomationRecord>;
  remove: (id: string, scope: FuelyAutomationScope) => Promise<void>;
  /** Called after every step; the hook toasts progress. */
  onProgress?: (done: number, total: number, label: string) => void;
  /** Turn an error into a sentence. */
  messageOf: (err: unknown) => string;
  /** Injected for tests; defaults to setTimeout. */
  wait?: (ms: number) => Promise<void>;
}

/** Backoff on the edit lock: 500 · 2ⁿ ms, five attempts. Anything else throws through. */
export const LOCK_BACKOFF_MS = [500, 1000, 2000, 4000, 8000] as const;

export async function withLockRetry<T>(
  run: () => Promise<T>,
  wait: (ms: number) => Promise<void> = defaultWait,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (err) {
      if (!isEditLock(err) || attempt >= LOCK_BACKOFF_MS.length) throw err;
      await wait(LOCK_BACKOFF_MS[attempt]!);
      attempt += 1;
    }
  }
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runPlan(plan: Plan, ctx: RunnerContext): Promise<PlanReport> {
  const results: StepResult[] = [];
  let createdId: string | null = null;
  let aborted = false;
  let message: string | null = null;
  const wait = ctx.wait ?? defaultWait;
  const resolveId = (id: StepId): string => (id === '$new' ? (createdId ?? '$new') : id);

  for (const step of plan.steps) {
    if (aborted) break;
    try {
      const automation = await withLockRetry(async () => {
        switch (step.kind) {
          case 'create': {
            const created = await ctx.create(step.scope, step.name);
            createdId = created.id;
            return created;
          }
          case 'set':
            return ctx.set(resolveId(step.id), step.update);
          case 'inherit':
            return ctx.inherit(resolveId(step.id), step.typename, step.parentId);
          case 'enabled':
            return ctx.setEnabled(resolveId(step.id), step.enabled);
          case 'rename':
            return ctx.rename(resolveId(step.id), step.name);
          case 'delete':
            await ctx.remove(step.id, step.scope);
            return undefined;
        }
      }, wait);
      results.push({ step, ok: true, automation });
    } catch (err) {
      const text = ctx.messageOf(err);
      message ??= text;
      results.push({ step, ok: false, error: text });
      if (step.kind === 'create') aborted = true;
    }
    ctx.onProgress?.(results.length, plan.steps.length, plan.label);
  }
  const done = results.filter((r) => r.ok).length;
  return { label: plan.label, results, done, failed: results.length - done, createdId, aborted, message };
}

/** The sentence a report toast shows. */
export function reportPhrase(report: PlanReport): string {
  if (report.aborted) return `${report.label} — could not create the rule.`;
  if (report.failed === 0) return `${report.label} — done.`;
  return `${report.label} — ${report.done} of ${report.done + report.failed} steps done, ${report.failed} failed.`;
}
