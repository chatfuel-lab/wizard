import { describe, expect, it } from 'vitest';
import { dragAnnouncement, moveResultPhrase, nameList } from './announce';

describe('nameList', () => {
  it('reads naturally at one, two and three names', () => {
    expect(nameList(['Maria'])).toBe('Maria');
    expect(nameList(['Maria', 'Jonas'])).toBe('Maria and Jonas');
    expect(nameList(['Maria', 'Jonas', 'Aylin'])).toBe('Maria, Jonas and Aylin');
  });

  it('truncates past three rather than reading a list of twenty', () => {
    expect(nameList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more');
  });

  it('substitutes a placeholder for a blank name instead of a gap', () => {
    expect(nameList([''])).toBe('Unnamed');
    expect(nameList(['   ', 'Jonas'])).toBe('Unnamed and Jonas');
  });

  it('is empty for an empty list', () => {
    expect(nameList([])).toBe('');
  });
});

describe('dragAnnouncement', () => {
  it('names a single card and counts several', () => {
    expect(dragAnnouncement({ phase: 'start', names: ['Maria'], stageLabel: null })).toContain('Picked up Maria');
    expect(dragAnnouncement({ phase: 'start', names: ['Maria', 'Jonas'], stageLabel: null })).toContain(
      'Picked up 2 deals',
    );
  });

  it('says when there is no column under the pointer', () => {
    expect(dragAnnouncement({ phase: 'over', names: ['Maria'], stageLabel: null })).toBe('Not over a column.');
    expect(dragAnnouncement({ phase: 'over', names: ['Maria'], stageLabel: 'Won' })).toBe('Over Won.');
  });

  it('reports a drop outside any column as a return, not a move', () => {
    expect(dragAnnouncement({ phase: 'drop', names: ['Maria'], stageLabel: null })).toBe('Returned Maria.');
  });

  it('says nothing when there is nothing being dragged', () => {
    expect(dragAnnouncement({ phase: 'start', names: [], stageLabel: 'Won' })).toBe('');
  });
});

describe('moveResultPhrase', () => {
  it('is silent for an empty batch — a same-column drop must not say "0 deals moved"', () => {
    expect(moveResultPhrase([], [], 'Won')).toBe('');
  });

  it('names one success and counts several', () => {
    expect(moveResultPhrase(['Maria'], [], 'Won')).toBe('Maria moved to Won.');
    expect(moveResultPhrase(['Maria', 'Jonas'], [], 'Won')).toBe('2 deals moved to Won.');
  });

  it('says a total failure stayed put', () => {
    expect(moveResultPhrase([], ['Lena'], 'Won')).toBe('Lena could not be moved and stayed put.');
    expect(moveResultPhrase([], ['Lena', 'Ada'], 'Won')).toBe('2 deals could not be moved and stayed put.');
  });

  it('gives both halves for a partial failure, and names the ones that came back', () => {
    expect(moveResultPhrase(['Maria', 'Jonas'], ['Lena'], 'Won')).toBe('2 of 3 moved to Won; Lena returned.');
  });
});
