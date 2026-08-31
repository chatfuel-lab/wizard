import { describe, expect, it } from 'vitest';
import {
  CHATS_PER_PAGE,
  MAX_CONTACTS,
  MAX_CONVERSATIONS,
  MAX_PAGES,
  MESSAGES_PER_CONVERSATION,
  SCAN_CONCURRENCY,
  SCAN_THROTTLE,
} from './gapScanPolicy';

describe('gap scan policy', () => {
  it('every cap is a positive integer', () => {
    for (const cap of [
      CHATS_PER_PAGE,
      MAX_PAGES,
      MAX_CONTACTS,
      MAX_CONVERSATIONS,
      MESSAGES_PER_CONVERSATION,
      SCAN_CONCURRENCY,
    ]) {
      expect(Number.isInteger(cap)).toBe(true);
      expect(cap).toBeGreaterThan(0);
    }
  });

  it('the contact cap is exactly the pages the sweep is allowed to read', () => {
    expect(MAX_CONTACTS).toBe(CHATS_PER_PAGE * MAX_PAGES);
  });

  it('opens no more conversations than contacts it swept', () => {
    expect(MAX_CONVERSATIONS).toBeLessThanOrEqual(MAX_CONTACTS);
  });

  it('the throttle carries the shared concurrency and a positive rate', () => {
    expect(SCAN_THROTTLE.concurrency).toBe(SCAN_CONCURRENCY);
    expect(SCAN_THROTTLE.rps).toBeGreaterThan(0);
  });
});
