import { describe, expect, it } from 'vitest';
import {
  canAdvance,
  canGoTo,
  importReducer,
  initialImportState,
  nextStep,
  prevStep,
  stepComplete,
  stepStatuses,
  type ImportAction,
  type ImportState,
} from './importStore';

const CSV = 'question,answer\nDo you ship?,Yes\nRefunds?,30 days\n';
const PROSE = '## Do you ship?\nYes, everywhere.\n\n## Refunds?\nWithin 30 days.\n';

const run = (state: ImportState, ...actions: ImportAction[]): ImportState => actions.reduce(importReducer, state);

const withText = (text = CSV, existing: readonly string[] = []) =>
  run(initialImportState('faq', existing), { type: 'text', text, kind: 'paste', label: 'Pasted text' });

describe('taking text', () => {
  it('parses, guesses the mapping, builds the plan and lands on the parse step', () => {
    const state = withText();
    expect(state.step).toBe('parse');
    expect(state.parse?.format).toBe('table');
    expect(state.mapping).toEqual({ question: 0, answer: 1 });
    expect(state.rows).toHaveLength(2);
    expect(state.source).toEqual({ kind: 'paste', label: 'Pasted text' });
  });

  it('reads prose as question and answer pairs', () => {
    const state = withText(PROSE);
    expect(state.parse?.format).toBe('qa');
    expect(state.rows[0]!.values).toEqual({ question: 'Do you ship?', answer: 'Yes, everywhere.' });
  });

  it('refuses empty text with a message instead of an empty plan', () => {
    const state = withText('   ');
    expect(state.step).toBe('source');
    expect(state.error).not.toBe(null);
  });
});

describe('re-parsing', () => {
  it('changing the format re-guesses everything', () => {
    const state = run(withText(), { type: 'format', format: 'qa' });
    expect(state.parse?.format).toBe('qa');
    expect(state.mapping).toEqual({ question: 0, answer: 1 });
  });

  it('changing the header answer re-labels the columns and re-guesses the mapping', () => {
    const state = run(withText(), { type: 'header', headerUsed: false });
    expect(state.parse?.headerUsed).toBe(false);
    expect(state.parse?.columns).toEqual(['Column 1', 'Column 2']);
    expect(state.rows).toHaveLength(3); // the header row is data now
  });

  it('changing the delimiter re-parses from the original text', () => {
    const state = run(withText('q;a\nDo you ship?;Yes\n'), { type: 'delimiter', delimiter: ';' });
    expect(state.parse?.delimiter).toBe(';');
    expect(state.rows[0]!.values.question).toBe('Do you ship?');
  });

  it('leaves a delimiter change alone when the text is prose', () => {
    const state = withText(PROSE);
    expect(run(state, { type: 'delimiter', delimiter: ';' })).toBe(state);
  });
});

describe('mapping', () => {
  it('rebuilds every row when a column moves', () => {
    const state = run(withText(), { type: 'map', field: 'question', index: 1 });
    expect(state.mapping).toEqual({ question: 1 });
    expect(state.rows[0]!.values).toEqual({ question: 'Yes', answer: '' });
    expect(state.rows[0]!.problems).toEqual(['Answer is empty.']);
  });

  it('blocks the review step until the required fields are mapped', () => {
    const state = run(withText(), { type: 'map', field: 'answer', index: null });
    expect(stepComplete(state, 'map')).toBe(false);
    expect(canGoTo(state, 'review')).toBe(false);
  });
});

describe('duplicates against a store that moved', () => {
  it('re-dedupes when the knowledge base reloads under the wizard', () => {
    const state = run(withText(), { type: 'existing', existing: ['Do you ship?'] });
    expect(state.rows[0]!.duplicate).toEqual({ kind: 'existing' });
    expect(state.rows[0]!.skip).toBe(true);
  });
});

describe('steps', () => {
  it('walks forward only over completed steps', () => {
    const empty = initialImportState('faq');
    expect(canGoTo(empty, 'parse')).toBe(false);
    expect(canAdvance(empty)).toBe(false);

    const ready = withText();
    expect(canGoTo(ready, 'review')).toBe(true);
    expect(canAdvance(ready)).toBe(true);
  });

  it('will not advance while something is in flight', () => {
    expect(canAdvance(run(withText(), { type: 'busy', busy: true }))).toBe(false);
  });

  it('will not advance from review with every row skipped', () => {
    const state = run(withText(), { type: 'goto', step: 'review' }, { type: 'skipAll', skip: true });
    expect(stepComplete(state, 'review')).toBe(false);
    expect(canAdvance(state)).toBe(false);
  });

  it('marks a step walked past but not finished as an error', () => {
    const state = run(withText(), { type: 'map', field: 'answer', index: null }, { type: 'goto', step: 'map' });
    /* `goto` refused to move because `map` is not complete, so the wizard is
       still on the map step — which is exactly where the person has to be. */
    expect(state.step).toBe('map');
    expect(stepStatuses(state).map).toBe('current');
    expect(stepStatuses(state).source).toBe('complete');
    expect(stepStatuses(state).review).toBe('upcoming');
  });

  it('locks the wizard on the receipt once the import has run', () => {
    const done = run(withText(), {
      type: 'report',
      report: { target: 'faq', planned: 2, created: 2, failed: [], stoppedAtLimit: false },
    });
    expect(done.step).toBe('apply');
    expect(canGoTo(done, 'source')).toBe(false);
    expect(canGoTo(done, 'apply')).toBe(true);
    expect(canAdvance(done)).toBe(false);
  });

  it('steps in both directions without falling off either end', () => {
    expect(nextStep('source')).toBe('parse');
    expect(nextStep('apply')).toBe('apply');
    expect(prevStep('source')).toBe('source');
    expect(prevStep('review')).toBe('map');
  });

  it('starts over on reset', () => {
    const state = run(withText(), { type: 'reset', target: 'products', existing: ['Sofa'] });
    expect(state).toEqual(initialImportState('products', ['Sofa']));
  });
});
