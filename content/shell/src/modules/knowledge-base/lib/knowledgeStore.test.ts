import { describe, expect, it } from 'vitest';
import {
  faqCount,
  faqsDiffer,
  initialKnowledgeState,
  isInitialLoad,
  isUnavailable,
  knowledgeReducer,
  reconcileFaqKeys,
  toFaqInput,
  type KnowledgeState,
} from './knowledgeStore';
import type { FaqEntry, KnowledgeBaseInfo, UsageInfo } from '../types';

const kb = (faqs: FaqEntry[] = [], over: Partial<KnowledgeBaseInfo> = {}): KnowledgeBaseInfo =>
  ({
    companyName: 'Acme',
    email: '',
    phone: '',
    address: '',
    website: '',
    howToPay: '',
    additionalInstructions: '',
    businessHoursSchedule: { workingHours: [] },
    faqs,
    ...over,
  }) as KnowledgeBaseInfo;

const usage = (total = 100, catalog = 10): UsageInfo => ({ total, catalog }) as UsageInfo;

const loaded = (faqs: FaqEntry[] = []): KnowledgeState =>
  knowledgeReducer({ ...initialKnowledgeState }, { type: 'loaded', epoch: 0, kb: kb(faqs), usage: usage() });

describe('load lifecycle', () => {
  it('starts as an initial load', () => {
    expect(isInitialLoad(initialKnowledgeState)).toBe(true);
  });

  it('applies a response issued under the current epoch', () => {
    const state = loaded([{ question: 'q', answer: 'a' }]);
    expect(state.loading).toBe(false);
    expect(faqCount(state)).toBe(1);
    expect(state.usage?.total).toBe(100);
  });

  it('drops a response from a stale epoch', () => {
    const reset = knowledgeReducer(loaded(), { type: 'reset' });
    const stale = knowledgeReducer(reset, {
      type: 'loaded',
      epoch: 0,
      kb: kb([{ question: 'late', answer: 'x' }]),
      usage: usage(1),
    });
    expect(stale).toBe(reset);
    expect(stale.loading).toBe(true);
  });

  it('drops a stale failure the same way', () => {
    const reset = knowledgeReducer(loaded(), { type: 'reset' });
    expect(knowledgeReducer(reset, { type: 'failed', epoch: 0, error: 'old' })).toBe(reset);
  });

  it('keeps the last good data visible while reloading', () => {
    const reset = knowledgeReducer(loaded([{ question: 'q', answer: 'a' }]), { type: 'reset' });
    expect(reset.kb).not.toBeNull();
    expect(isInitialLoad(reset)).toBe(false);
  });

  it('separates a load error from a bot with no Fuely config', () => {
    const failed = knowledgeReducer({ ...initialKnowledgeState }, { type: 'failed', epoch: 0, error: 'network' });
    expect(failed.error).toBe('network');
    expect(isUnavailable(failed)).toBe(false);

    const missing = knowledgeReducer({ ...initialKnowledgeState }, { type: 'unavailable', epoch: 0 });
    expect(isUnavailable(missing)).toBe(true);
  });
});

describe('FAQ keys', () => {
  it('mints a key per entry', () => {
    const rows = reconcileFaqKeys(
      [],
      [
        { question: 'a', answer: '1' },
        { question: 'b', answer: '2' },
      ],
    );
    expect(new Set(rows.map((row) => row.key)).size).toBe(2);
  });

  it('keeps the keys of untouched entries when one is edited', () => {
    const before = reconcileFaqKeys(
      [],
      [
        { question: 'a', answer: '1' },
        { question: 'b', answer: '2' },
        { question: 'c', answer: '3' },
      ],
    );
    const after = reconcileFaqKeys(before, [
      { question: 'a', answer: '1' },
      { question: 'b', answer: 'CHANGED' },
      { question: 'c', answer: '3' },
    ]);
    expect(after[0]!.key).toBe(before[0]!.key);
    expect(after[2]!.key).toBe(before[2]!.key);
    expect(after[1]!.key).not.toBe(before[1]!.key);
  });

  it('keeps keys through a reorder, so a drag does not lose the selection', () => {
    const before = reconcileFaqKeys(
      [],
      [
        { question: 'a', answer: '1' },
        { question: 'b', answer: '2' },
      ],
    );
    const after = reconcileFaqKeys(before, [
      { question: 'b', answer: '2' },
      { question: 'a', answer: '1' },
    ]);
    expect(after[0]!.key).toBe(before[1]!.key);
    expect(after[1]!.key).toBe(before[0]!.key);
  });

  it('gives duplicates distinct keys', () => {
    const rows = reconcileFaqKeys(
      [],
      [
        { question: 'same', answer: 'same' },
        { question: 'same', answer: 'same' },
      ],
    );
    expect(rows[0]!.key).not.toBe(rows[1]!.key);
  });

  it('re-keys through the reducer when the server list is replaced', () => {
    const state = loaded([{ question: 'a', answer: '1' }]);
    const next = knowledgeReducer(state, {
      type: 'faqsReplaced',
      faqs: [
        { question: 'a', answer: '1' },
        { question: 'b', answer: '2' },
      ],
      usage: usage(120),
    });
    expect(next.faqs[0]!.key).toBe(state.faqs[0]!.key);
    expect(next.faqs).toHaveLength(2);
    expect(next.usage?.total).toBe(120);
    expect(next.kb?.faqs).toHaveLength(2);
  });

  it('strips the keys on the way to the wire', () => {
    const state = loaded([{ question: 'a', answer: '1' }]);
    expect(toFaqInput(state.faqs)).toEqual([{ question: 'a', answer: '1' }]);
  });
});

describe('patches', () => {
  it('merges one field and the usage that came back with it', () => {
    const state = loaded();
    const next = knowledgeReducer(state, { type: 'kbPatched', kb: { companyName: 'New' }, usage: usage(222) });
    expect(next.kb?.companyName).toBe('New');
    expect(next.usage?.total).toBe(222);
    expect(next.tick).toBe(state.tick + 1);
  });

  it('ignores a patch before anything loaded', () => {
    expect(knowledgeReducer(initialKnowledgeState, { type: 'kbPatched', kb: { phone: '1' } })).toBe(
      initialKnowledgeState,
    );
  });

  it('keeps the previous usage when a setter did not return one', () => {
    const next = knowledgeReducer(loaded(), { type: 'kbPatched', kb: { phone: '1' } });
    expect(next.usage?.total).toBe(100);
  });
});

describe('the full flag', () => {
  it('is set by a limit error and is idempotent', () => {
    const hit = knowledgeReducer(loaded(), { type: 'limitHit' });
    expect(hit.full).toBe(true);
    expect(knowledgeReducer(hit, { type: 'limitHit' })).toBe(hit);
  });

  it('is taken back by a clean reload', () => {
    const hit = knowledgeReducer(loaded(), { type: 'limitHit' });
    const reset = knowledgeReducer(hit, { type: 'reset' });
    const reloaded = knowledgeReducer(reset, { type: 'loaded', epoch: reset.epoch, kb: kb(), usage: usage(10) });
    expect(reloaded.full).toBe(false);
  });
});

describe('faqsDiffer', () => {
  const list: FaqEntry[] = [
    { question: 'a', answer: '1' },
    { question: 'b', answer: '2' },
  ];

  it('is false for the same content in the same order', () => {
    expect(faqsDiffer(list, [...list])).toBe(false);
  });

  it('is true on a different length, a changed entry or a reorder', () => {
    expect(faqsDiffer(list, list.slice(0, 1))).toBe(true);
    expect(faqsDiffer(list, [{ question: 'a', answer: 'X' }, list[1]!])).toBe(true);
    expect(faqsDiffer(list, [list[1]!, list[0]!])).toBe(true);
  });
});
