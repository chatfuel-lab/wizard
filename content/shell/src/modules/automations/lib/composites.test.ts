import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope, FuelySettingKeywordsReactTo } from '~api/generated/automations/graphql';
import { ChatfuelGraphQLError } from '~api';
import { AUTOMATIONS } from './samples';
import {
  copyableSettings,
  planBulkEnabled,
  planCopyTo,
  planDuplicate,
  planFromTemplate,
  planRestore,
  reportPhrase,
  runPlan,
  snapshotOf,
  withLockRetry,
  type RunnerContext,
  type Step,
} from './composites';
import type { AutomationRecord } from '../types';

const rec = (id: string) => structuredClone(AUTOMATIONS.get(id)) as unknown as AutomationRecord;
const lock = () =>
  new ChatfuelGraphQLError([
    { message: 'x', extensions: { errors: [{ message: 'e', extensions: { code: 'FuelyAutomationBeingEdited' } }] } },
  ]);

describe('planners', () => {
  it('duplicate = create + every setting (owned as set, inherited as inherit)', () => {
    const plan = planDuplicate(rec('rule-spring-posts'), 'Copy');
    expect(plan.steps[0]).toEqual({ kind: 'create', scope: 'InstagramPostComments', name: 'Copy' });
    const kinds = plan.steps.slice(1).map((s) => s.kind);
    expect(kinds).toContain('set');
    expect(kinds).toContain('inherit');
    expect(plan.steps.slice(1).every((s) => (s as { id: string }).id === '$new')).toBe(true);
    // 12 settings on this scope, all carried
    expect(plan.steps.length).toBe(1 + rec('rule-spring-posts').settings.length);
  });
  it('copyTo skips filters, the source itself, and settings a target lacks', () => {
    const src = rec('auto-InstagramPostComments-base');
    const targets = [rec('auto-WhatsAppDirectMessages-base'), src];
    const plan = planCopyTo(src, targets, [
      'FuelySettingPublicReply',
      'FuelySettingIncomingMessages',
      'FuelySettingKeywords',
    ]);
    // WhatsApp DM base has no PublicReply → only IncomingMessages copied, once
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      kind: 'set',
      id: 'auto-WhatsAppDirectMessages-base',
      update: { type: 'FuelySettingIncomingMessages' },
    });
    expect(copyableSettings(src)).not.toContain('FuelySettingKeywords');
  });
  it('bulk enabled skips records already there', () => {
    const a = rec('rule-spring-posts');
    const b = rec('rule-tiktok-viral');
    expect(planBulkEnabled([a, b], true).steps).toEqual([{ kind: 'enabled', id: b.id, enabled: true }]);
  });
  it('snapshot → restore re-creates owned + inherited + enabled', () => {
    const snap = snapshotOf(rec('rule-spring-posts'));
    expect(snap.owned.length).toBeGreaterThan(0);
    expect(snap.inherited.length).toBeGreaterThan(0);
    const plan = planRestore(snap);
    expect(plan.steps[0]!.kind).toBe('create');
    expect(plan.steps.at(-1)).toEqual({ kind: 'enabled', id: '$new', enabled: true });
    const tpl = planFromTemplate({
      name: 'T',
      scope: FuelyAutomationScope.InstagramStoryReplies,
      settings: [
        { type: 'FuelySettingKeywords', update: { reactTo: FuelySettingKeywordsReactTo.AnyComment, keywords: [] } },
      ],
    });
    expect(tpl.steps).toHaveLength(2);
  });
});

describe('runner', () => {
  const ctx = (overrides: Partial<RunnerContext> = {}): RunnerContext & { log: string[] } => {
    const log: string[] = [];
    const rule = rec('rule-spring-posts');
    return {
      log,
      create: async (_s, name) => {
        log.push(`create:${name}`);
        return { ...rule, id: 'new-1', name };
      },
      set: async (id, update) => {
        log.push(`set:${id}:${update.type}`);
        return { ...rule, id };
      },
      inherit: async (id, typename) => {
        log.push(`inherit:${id}:${typename}`);
        return { ...rule, id };
      },
      setEnabled: async (id, enabled) => {
        log.push(`enabled:${id}:${enabled}`);
        return { ...rule, id, enabled };
      },
      rename: async (id, name) => {
        log.push(`rename:${id}:${name}`);
        return { ...rule, id, name };
      },
      remove: async (id) => {
        log.push(`delete:${id}`);
      },
      messageOf: (err) => (err instanceof Error ? err.message : String(err)),
      wait: async () => undefined,
      ...overrides,
    };
  };

  it('threads $new, runs strictly in order, reports done/failed', async () => {
    const c = ctx();
    const report = await runPlan(planDuplicate(rec('rule-spring-posts'), 'Copy'), c);
    expect(report.createdId).toBe('new-1');
    expect(c.log[0]).toBe('create:Copy');
    expect(c.log.slice(1).every((l) => l.includes(':new-1:'))).toBe(true);
    expect(report.failed).toBe(0);
    expect(reportPhrase(report)).toMatch(/done\.$/);
  });
  it('a failed create aborts; a failed set continues', async () => {
    const c1 = ctx({
      create: async () => {
        throw new Error('nope');
      },
    });
    const r1 = await runPlan(planDuplicate(rec('rule-spring-posts'), 'Copy'), c1);
    expect(r1.aborted).toBe(true);
    expect(r1.results).toHaveLength(1);
    expect(reportPhrase(r1)).toMatch(/could not create/);
    let n = 0;
    const c2 = ctx({
      set: async (id) => {
        n += 1;
        if (n === 2) throw new Error('bad');
        return { ...rec('rule-spring-posts'), id };
      },
    });
    const r2 = await runPlan(planDuplicate(rec('rule-spring-posts'), 'Copy'), c2);
    expect(r2.aborted).toBe(false);
    expect(r2.failed).toBe(1);
    expect(r2.message).toBe('bad');
    expect(reportPhrase(r2)).toMatch(/1 failed/);
  });
  it('retries the edit lock with backoff, then gives up', async () => {
    let calls = 0;
    const waits: number[] = [];
    const ok = await withLockRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw lock();
        return 'ok';
      },
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(ok).toBe('ok');
    expect(waits).toEqual([500, 1000]);
    calls = 0;
    await expect(
      withLockRetry(
        async () => {
          calls += 1;
          throw lock();
        },
        async () => undefined,
      ),
    ).rejects.toBeInstanceOf(ChatfuelGraphQLError);
    expect(calls).toBe(6);
    await expect(
      withLockRetry(
        async () => {
          throw new Error('other');
        },
        async () => undefined,
      ),
    ).rejects.toThrow('other');
  });
  it('a step with an unknown id when no create ran fails that step only', async () => {
    const c = ctx({
      set: async (id) => {
        if (id === '$new') throw new Error('no id');
        return rec('rule-spring-posts');
      },
    });
    const steps: Step[] = [
      {
        kind: 'set',
        id: '$new',
        update: {
          type: 'FuelySettingKeywords',
          update: { reactTo: FuelySettingKeywordsReactTo.AnyComment, keywords: [] },
        },
      },
    ];
    const r = await runPlan({ label: 'x', steps }, c);
    expect(r.failed).toBe(1);
    expect(r.aborted).toBe(false);
  });
});
