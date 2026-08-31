import { describe, expect, it } from 'vitest';
import { Platform } from '~api/generated/livechat/graphql';
import type { MessageNode } from '../types';
import type { MessageEntry } from './threadStore';
import { lastInboundTime, sendWindow, WHATSAPP_WINDOW_MS } from './sendWindow';

const NOW = Date.UTC(2026, 7, 13, 12, 0);
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const entry = (clientId: string, msAgo: number, from: 'contact' | 'operator'): MessageEntry => ({
  clientId,
  sentTime: iso(msAgo),
  node: {
    __typename: 'WhatsAppInTextMessage',
    id: `m-${clientId}`,
    clientId,
    sentTime: iso(msAgo),
    updatedAt: iso(msAgo),
    sender: {
      __typename: from === 'contact' ? 'ContactMessageSender' : 'AdminMessageSender',
      id: 's1',
      name: 'Maria',
      profilePicture: null,
    },
    errors: null,
    text: clientId,
  } as unknown as MessageNode,
});

/** An optimistic send: outbound by construction and holding no node at all. */
const pending = (clientId: string, msAgo: number): MessageEntry => ({
  clientId,
  sentTime: iso(msAgo),
  node: null,
  localText: 'hello',
  failed: false,
});

describe('lastInboundTime', () => {
  it('finds the newest message the contact wrote', () => {
    const entries = [
      entry('a', 5 * WHATSAPP_WINDOW_MS, 'contact'),
      entry('b', 3 * WHATSAPP_WINDOW_MS, 'contact'),
      entry('c', 1000, 'operator'),
    ];
    expect(lastInboundTime(entries)).toBe(iso(3 * WHATSAPP_WINDOW_MS));
  });

  it('walks past optimistic sends rather than treating them as unknown', () => {
    expect(lastInboundTime([entry('a', 1000, 'contact'), pending('b', 0)])).toBe(iso(1000));
  });

  it('answers nothing when the contact has said nothing on this page', () => {
    expect(lastInboundTime([entry('a', 1000, 'operator')])).toBeNull();
    expect(lastInboundTime([])).toBeNull();
  });
});

describe('sendWindow', () => {
  it('is open inside 24 hours of the contact writing', () => {
    expect(sendWindow(Platform.Whatsapp, iso(WHATSAPP_WINDOW_MS - 1000), NOW)).toEqual({
      open: true,
    });
  });

  it('closes at exactly 24 hours, with a reason short enough to be a placeholder', () => {
    const closed = sendWindow(Platform.Whatsapp, iso(WHATSAPP_WINDOW_MS), NOW);
    expect(closed.open).toBe(false);
    expect(closed.reason).toContain('24-hour');
    expect(closed.reason!.length).toBeLessThan(40);
  });

  /* TikTok's limit is a COUNT over 48 hours and Instagram's window depends on
     history that may not be loaded. A gate that is right most of the time is
     worse than none: the times it is wrong it forbids a legal message. */
  it('says nothing about the four channels whose limits it cannot compute', () => {
    for (const platform of [Platform.Widget, Platform.Instagram, Platform.Facebook, Platform.Tiktok]) {
      expect(sendWindow(platform, iso(10 * WHATSAPP_WINDOW_MS), NOW)).toEqual({ open: true });
    }
  });

  /* A false block strands the operator with no way to argue. A false allow
     costs one message, and messageErrors.ts explains that one on the bubble. */
  it('never blocks on ignorance', () => {
    expect(sendWindow(Platform.Whatsapp, null, NOW)).toEqual({ open: true });
    expect(sendWindow(Platform.Whatsapp, 'not a timestamp', NOW)).toEqual({ open: true });
  });
});
