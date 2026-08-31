import { describe, expect, it } from 'vitest';
import { chooseBot, needsProvision, sameBots } from './botChoice';
import type { BotRef, Membership, Role } from '../types';

const bot = (id: string, botId: string | null = `chatfuel-${id}`, name = id.toUpperCase()): BotRef => ({
  id,
  botId,
  name,
});

describe('chooseBot', () => {
  it('keeps the bot already open, whatever was remembered', () => {
    const bots = [bot('a'), bot('b')];
    expect(chooseBot({ bots, stored: 'chatfuel-a', current: 'chatfuel-b' })).toBe('chatfuel-b');
  });

  it('falls back to the remembered one, then to the first', () => {
    const bots = [bot('a'), bot('b')];
    expect(chooseBot({ bots, stored: 'chatfuel-b', current: null })).toBe('chatfuel-b');
    expect(chooseBot({ bots, stored: null, current: null })).toBe('chatfuel-a');
    // Remembered from a workspace this account no longer reaches.
    expect(chooseBot({ bots, stored: 'chatfuel-gone', current: null })).toBe('chatfuel-a');
  });

  it('leaves a bot that was deleted or revoked under the session', () => {
    const bots = [bot('b')];
    expect(chooseBot({ bots, stored: 'chatfuel-a', current: 'chatfuel-a' })).toBe('chatfuel-b');
  });

  it('never chooses one that is still being created', () => {
    expect(chooseBot({ bots: [bot('a', null)], stored: null, current: null })).toBeNull();
    expect(chooseBot({ bots: [bot('a', null), bot('b')], stored: null, current: null })).toBe('chatfuel-b');
    // …and does not keep it either, once a real one exists.
    expect(chooseBot({ bots: [bot('a', null), bot('b')], stored: null, current: 'chatfuel-a' })).toBe('chatfuel-b');
  });

  it('answers null for a workspace with no bots at all', () => {
    expect(chooseBot({ bots: [], stored: 'chatfuel-a', current: 'chatfuel-a' })).toBeNull();
  });
});

describe('needsProvision', () => {
  const membership = (role: Role, bots: BotRef[]): Membership => ({
    role,
    joinedAt: '2026-01-01T00:00:00Z',
    tenant: { id: 't', name: 'T', bots },
  });

  it('asks for a workspace when there is none', () => {
    expect(needsProvision(null)).toBe(true);
  });

  it('leaves an owner who already has a bot alone', () => {
    expect(needsProvision(membership('owner', [bot('a')]))).toBe(false);
  });

  /* The reported bug's exact shape: sign-up reserved a row, the Chatfuel half
     never landed, and the app read a workspace holding one unopenable slot as
     a finished account. */
  it('asks again when the only row is a reservation', () => {
    expect(needsProvision(membership('owner', [bot('a', null)]))).toBe(true);
  });

  it('asks again for an owner or an admin with nothing openable', () => {
    expect(needsProvision(membership('owner', []))).toBe(true);
    expect(needsProvision(membership('admin', []))).toBe(true);
  });

  /* A member sees only what they were granted, so zero is "ask an admin for
     access", never "make me a bot" — and the database would refuse them. */
  it('never asks on behalf of a member', () => {
    expect(needsProvision(membership('member', []))).toBe(false);
    expect(needsProvision(membership('member', [bot('a')]))).toBe(false);
  });
});

describe('sameBots', () => {
  it('is false when a name, an id or the length moved — a rename must reach the switcher', () => {
    expect(sameBots([bot('a')], [bot('a')])).toBe(true);
    expect(sameBots([bot('a')], [bot('a', 'chatfuel-a', 'RENAMED')])).toBe(false);
    expect(sameBots([bot('a', null)], [bot('a')])).toBe(false);
    expect(sameBots([bot('a')], [bot('a'), bot('b')])).toBe(false);
    expect(sameBots([bot('a'), bot('b')], [bot('b'), bot('a')])).toBe(false);
  });
});
