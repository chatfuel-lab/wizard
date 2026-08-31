import { describe, expect, it } from 'vitest';
import type { Severity } from './lint';
import {
  firstSteps,
  isFirstRun,
  overviewStats,
  readinessVerdict,
  severitySummary,
  type OverviewFacts,
} from './overview';

const counts = (blocker = 0, warning = 0, tip = 0): Record<Severity, number> => ({ blocker, warning, tip });

const facts = (patch: Partial<OverviewFacts> = {}): OverviewFacts => ({
  profileText: '',
  instructions: '',
  openDays: 0,
  faqs: 0,
  products: 0,
  services: 0,
  team: 0,
  catalogReady: true,
  ...patch,
});

describe('readinessVerdict', () => {
  it('lets a blocker outrank a high score', () => {
    const verdict = readinessVerdict(94, counts(1));
    expect(verdict.tone).toBe('danger');
    expect(verdict.headline).toContain('One thing');
  });

  it('counts the blockers rather than saying "some"', () => {
    expect(readinessVerdict(60, counts(3)).headline).toContain('3 things');
  });

  it('calls a low score a lot of small gaps even with no blockers', () => {
    expect(readinessVerdict(40, counts(0, 0, 60)).tone).toBe('warning');
  });

  it('is a success once only tips are left', () => {
    expect(readinessVerdict(96, counts(0, 0, 4)).tone).toBe('success');
  });

  it('has a different sentence for a clean knowledge base', () => {
    expect(readinessVerdict(100, counts()).headline).not.toBe(readinessVerdict(96, counts(0, 0, 4)).headline);
  });
});

describe('severitySummary', () => {
  it('omits the zeros', () => {
    expect(severitySummary(counts(2, 0, 3))).toBe('2 blockers · 3 tips');
  });

  it('gets the singular right', () => {
    expect(severitySummary(counts(1, 1, 1))).toBe('1 blocker · 1 warning · 1 tip');
  });

  it('says so when there is nothing', () => {
    expect(severitySummary(counts())).toBe('Nothing to fix');
  });
});

describe('isFirstRun', () => {
  it('is true only when every source is empty', () => {
    expect(isFirstRun(facts())).toBe(true);
  });

  it('is false as soon as anything has been written', () => {
    expect(isFirstRun(facts({ profileText: 'Acme' }))).toBe(false);
    expect(isFirstRun(facts({ faqs: 1 }))).toBe(false);
    expect(isFirstRun(facts({ openDays: 5 }))).toBe(false);
    expect(isFirstRun(facts({ team: 2 }))).toBe(false);
  });

  it('waits for the catalog rather than flashing "nothing here" on a cold open', () => {
    expect(isFirstRun(facts({ catalogReady: false }))).toBe(false);
  });

  it('ignores whitespace-only text', () => {
    expect(isFirstRun(facts({ instructions: '   \n ' }))).toBe(true);
  });
});

describe('firstSteps', () => {
  it('offers exactly two, profile first', () => {
    const steps = firstSteps(facts());
    expect(steps).toHaveLength(2);
    expect(steps.map((step) => step.source)).toEqual(['profile', 'faq']);
  });

  it('skips what is already done', () => {
    const steps = firstSteps(facts({ profileText: 'Acme Coffee', openDays: 6, faqs: 12 }));
    expect(steps.map((step) => step.source)).toEqual(['instructions', 'products']);
  });

  it('still asks for the profile when the hours are empty', () => {
    expect(firstSteps(facts({ profileText: 'Acme Coffee' }))[0]!.source).toBe('profile');
  });

  it('runs out of suggestions on a full knowledge base', () => {
    expect(
      firstSteps(facts({ profileText: 'Acme', openDays: 5, faqs: 9, instructions: 'Be brief.', products: 4 })),
    ).toEqual([]);
  });
});

describe('overviewStats', () => {
  it('names the four tiles in reading order', () => {
    expect(overviewStats(facts()).map((stat) => stat.id)).toEqual(['faq', 'products', 'services', 'team']);
  });

  it('counts what is on each source', () => {
    expect(overviewStats(facts({ faqs: 9, products: 5 })).map((stat) => stat.value)).toEqual(['9', '5', '0', '0']);
  });

  it('carries a label and a value and nothing else — no character cost, no caption', () => {
    for (const stat of overviewStats(facts())) {
      expect(stat.label).toBeTruthy();
      expect(stat.value).toBeTruthy();
      expect(stat).not.toHaveProperty('detail');
      expect(stat).not.toHaveProperty('coverage');
    }
  });
});
