import { describe, expect, it } from 'vitest';
import { bulkAnnouncement, bulkPercent, bulkSummary, bulkTone, type BulkRunState } from './bulkRun';

const run = (patch: Partial<BulkRunState> = {}): BulkRunState => ({
  done: 0,
  total: 100,
  failed: 0,
  status: 'running',
  ...patch,
});

describe('bulkPercent', () => {
  it('rounds to a whole percent', () => {
    expect(bulkPercent(1, 3)).toBe(33);
    expect(bulkPercent(2, 3)).toBe(67);
  });

  it('never renders NaN when the selection was empty', () => {
    expect(bulkPercent(0, 0)).toBe(0);
    expect(bulkPercent(5, 0)).toBe(0);
    expect(bulkPercent(5, -1)).toBe(0);
  });

  it('survives a non-finite count', () => {
    expect(bulkPercent(Number.NaN, 10)).toBe(0);
    expect(bulkPercent(1, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('clamps an overshoot instead of printing 120%', () => {
    expect(bulkPercent(12, 10)).toBe(100);
  });
});

describe('bulkSummary', () => {
  it('counts while running', () => {
    expect(bulkSummary(run({ done: 18, total: 44 }))).toBe('18 of 44');
  });

  it('says nothing about failures until there is one', () => {
    expect(bulkSummary(run({ done: 18, total: 44, failed: 0 }))).not.toContain('failed');
    expect(bulkSummary(run({ done: 18, total: 44, failed: 2 }))).toBe('18 of 44 · 2 failed');
  });

  it('says where it stopped', () => {
    expect(bulkSummary(run({ done: 18, total: 44, status: 'stopped' }))).toBe('Stopped at 18 of 44');
    expect(bulkSummary(run({ done: 18, total: 44, failed: 3, status: 'stopped' }))).toBe(
      'Stopped at 18 of 44 · 3 failed',
    );
  });

  it('never claims a clean finish when items failed', () => {
    expect(bulkSummary(run({ done: 44, total: 44, failed: 11, status: 'done' }))).toBe('Finished 44 of 44 · 11 failed');
    expect(bulkSummary(run({ done: 44, total: 44, status: 'done' }))).toBe('Finished · 44 updated');
  });

  it('has something honest to say about an empty selection', () => {
    expect(bulkSummary(run({ total: 0 }))).toBe('Nothing to do.');
    expect(bulkSummary(run({ total: 0, status: 'done' }))).toBe('Nothing to do.');
  });

  it('does not count past the total when a live update shrank it', () => {
    expect(bulkSummary(run({ done: 50, total: 44 }))).toBe('44 of 44');
  });
});

describe('bulkTone', () => {
  it('is quiet while a clean run is going', () => {
    expect(bulkTone(run({ done: 10 }))).toBe('accent');
  });

  it('warns rather than alarms while failures come in', () => {
    expect(bulkTone(run({ done: 10, failed: 1 }))).toBe('warning');
    expect(bulkTone(run({ done: 10, failed: 9 }))).toBe('warning');
  });

  it('is success only for a finished run with nothing failed', () => {
    expect(bulkTone(run({ done: 44, total: 44, status: 'done' }))).toBe('success');
    expect(bulkTone(run({ done: 44, total: 44, failed: 1, status: 'done' }))).toBe('warning');
  });

  it('goes danger when an ended run failed half or more of what it tried', () => {
    expect(bulkTone(run({ done: 10, failed: 5, status: 'done' }))).toBe('danger');
    expect(bulkTone(run({ done: 10, failed: 6, status: 'stopped' }))).toBe('danger');
  });

  it('never calls a stopped run a success', () => {
    expect(bulkTone(run({ done: 18, total: 44, status: 'stopped' }))).toBe('accent');
  });
});

describe('bulkAnnouncement', () => {
  it('speaks at the start, on the heartbeat and at the end', () => {
    expect(bulkAnnouncement(run({ done: 0, total: 100 }), 'Adding tag')).toBe('Adding tag. 0 of 100');
    expect(bulkAnnouncement(run({ done: 25, total: 100 }), 'Adding tag')).toBe('Adding tag. 25 of 100');
    expect(bulkAnnouncement(run({ done: 100, total: 100 }), 'Adding tag')).toBe('Adding tag. 100 of 100');
  });

  it('stays silent in between, so a screen reader is not reading numbers for a minute', () => {
    expect(bulkAnnouncement(run({ done: 26, total: 100 }), 'Adding tag')).toBeNull();
    expect(bulkAnnouncement(run({ done: 99, total: 100 }), 'Adding tag')).toBeNull();
  });

  it('always speaks once the run has ended', () => {
    expect(bulkAnnouncement(run({ done: 37, total: 100, status: 'stopped' }), 'Adding tag')).toBe(
      'Adding tag. Stopped at 37 of 100',
    );
  });

  it('says nothing at all about an empty run', () => {
    expect(bulkAnnouncement(run({ total: 0 }), 'Adding tag')).toBeNull();
  });

  it('takes a custom heartbeat', () => {
    expect(bulkAnnouncement(run({ done: 10, total: 100 }), 'Adding tag', 10)).not.toBeNull();
    expect(bulkAnnouncement(run({ done: 10, total: 100 }), 'Adding tag', 25)).toBeNull();
  });
});
