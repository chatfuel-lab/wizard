import { describe, expect, it } from 'vitest';
import { BookingStatus } from '~api/generated/bookings/graphql';
import {
  STATUSES,
  STATUS_META,
  TARGET_STATUSES,
  isTargetStatus,
  parseStatusList,
  primaryActions,
  statusForKey,
  statusMeta,
} from './status';

describe('status meta', () => {
  it('covers every enum member exactly once', () => {
    const enumValues = Object.values(BookingStatus).sort();
    expect([...STATUSES].sort()).toEqual(enumValues);
    expect(new Set(STATUSES).size).toBe(STATUSES.length);
  });

  it('never offers Pending as a target', () => {
    expect(TARGET_STATUSES).not.toContain(BookingStatus.Pending);
    expect(TARGET_STATUSES).toHaveLength(5);
    expect(isTargetStatus(BookingStatus.Pending)).toBe(false);
    expect(isTargetStatus(BookingStatus.Confirmed)).toBe(true);
    for (const meta of STATUS_META) expect(meta.key === null).toBe(meta.status === BookingStatus.Pending);
  });

  it('digit keys are unique and map back', () => {
    const keys = STATUS_META.map((m) => m.key).filter((k): k is string => k !== null);
    expect(new Set(keys).size).toBe(keys.length);
    expect(statusForKey('1')).toBe(BookingStatus.Confirmed);
    expect(statusForKey('5')).toBe(BookingStatus.Canceled);
    expect(statusForKey('9')).toBeNull();
  });

  it('primary actions never include Pending or the current status', () => {
    for (const status of STATUSES) {
      for (const past of [true, false]) {
        const actions = primaryActions(status, past);
        expect(actions).not.toContain(BookingStatus.Pending);
        expect(actions).not.toContain(status);
        expect(actions.length).toBeGreaterThan(0);
      }
    }
    expect(primaryActions(BookingStatus.Confirmed, true)).toEqual([BookingStatus.Attended, BookingStatus.NoShow]);
    expect(primaryActions(BookingStatus.Pending, false)[0]).toBe(BookingStatus.Confirmed);
  });

  it('parses status lists in canonical order and drops junk', () => {
    expect(parseStatusList('Canceled,Nope,Confirmed')).toEqual([BookingStatus.Confirmed, BookingStatus.Canceled]);
    expect(parseStatusList('')).toEqual([]);
    expect(parseStatusList(null)).toEqual([]);
  });

  it('meta falls back for an unknown value without throwing', () => {
    expect(statusMeta('Weird' as BookingStatus).status).toBe(BookingStatus.Pending);
    expect(statusMeta(BookingStatus.Canceled).occupies).toBe(false);
  });
});
