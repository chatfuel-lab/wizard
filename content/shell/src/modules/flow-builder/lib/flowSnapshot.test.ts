import { afterEach, describe, expect, it } from 'vitest';
import { clearDeviceCaches } from '../../shellApi';
import {
  MAX_SNAPSHOT_CHARS,
  SNAPSHOT_PREFIX,
  SNAPSHOT_VERSION,
  evictSnapshots,
  parseSnapshot,
  readSnapshot,
  serializeSnapshot,
  shapeFingerprint,
  snapshotKey,
  writeSnapshot,
  type FlowSnapshot,
  type StorageLike,
} from './flowSnapshot';
import type { FlowT } from '../types';
/* Imported for its side effect: the descriptor module is where this module
   registers the sweep the shell calls, and a registration nobody reaches is the
   defect this pins. */
import '../index';

const flow = (id = 'flow-1', blocks = 1): FlowT =>
  ({
    __typename: 'Flow',
    id,
    name: `Flow ${id}`,
    platform: 'whatsapp',
    blocks: Array.from({ length: blocks }, (_, index) => ({
      __typename: 'RegularContentBlock',
      id: `b${index}`,
      name: `Block ${index}`,
      positionX: index * 300,
      positionY: 0,
      platform: 'whatsapp',
      isStartingPoint: index === 0,
      blockElements: [{ __typename: 'WhatsAppTextBlockElement', id: `e${index}`, text: [] }],
    })),
    connections: [{ __typename: 'BlockToBlockConnection', id: 'synth', sourceBlockID: 'b0', targetBlockID: 'b1' }],
  }) as unknown as FlowT;

const snapshot = (overrides: Partial<FlowSnapshot> = {}): FlowSnapshot => ({
  flow: flow(),
  inboundLinks: [],
  savedAt: 1_700_000_000_000,
  ...overrides,
});

const scope = { botId: 'bot-1', flowId: 'flow-1', shape: 'abcd1234' };

/** A `Storage` with an opinion about quota. */
function fakeStorage(quota = Number.POSITIVE_INFINITY): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      const others = [...map.entries()].filter(([k]) => k !== key);
      const used = others.reduce((sum, [, v]) => sum + v.length, 0);
      if (used + value.length > quota) throw new Error('QuotaExceededError');
      map.set(key, value);
    },
    removeItem: (key) => void map.delete(key),
  };
}

describe('snapshotKey', () => {
  it('carries the prefix, the envelope version, the query fingerprint, the bot and the flow', () => {
    const key = snapshotKey(scope);
    expect(key.startsWith(SNAPSHOT_PREFIX)).toBe(true);
    expect(key).toContain(`v${SNAPSHOT_VERSION}.`);
    expect(key).toContain('.abcd1234.');
    expect(key.endsWith('.bot-1.flow-1')).toBe(true);
  });

  it('is different for a different bot, flow or shape', () => {
    const base = snapshotKey(scope);
    expect(snapshotKey({ ...scope, botId: 'bot-2' })).not.toBe(base);
    expect(snapshotKey({ ...scope, flowId: 'flow-2' })).not.toBe(base);
    expect(snapshotKey({ ...scope, shape: 'ffffffff' })).not.toBe(base);
  });
});

describe('shapeFingerprint', () => {
  it('is deterministic, short, and moves when the text does', () => {
    const a = shapeFingerprint('query FlowStructure { bot { flow { id } } }');
    expect(a).toBe(shapeFingerprint('query FlowStructure { bot { flow { id } } }'));
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    // The kind of change this exists to notice: one field added to a fragment.
    expect(shapeFingerprint('query FlowStructure { bot { flow { id name } } }')).not.toBe(a);
  });
});

describe('serializeSnapshot / parseSnapshot', () => {
  it('round-trips a snapshot', () => {
    const before = snapshot({ inboundLinks: [{ id: 'other', name: 'Other flow' }] as never });
    const text = serializeSnapshot(before);
    expect(text).not.toBeNull();
    const after = parseSnapshot(text);
    expect(after).toEqual(before);
  });

  it('refuses a snapshot over the cap and writes nothing for it', () => {
    // ~215 characters a block; six thousand of them is well over the cap.
    const big = snapshot({ flow: flow('big', 6000) });
    expect(serializeSnapshot(big)).toBeNull();
    // The cap is a parameter so the test does not need a real megabyte.
    expect(serializeSnapshot(snapshot(), 10)).toBeNull();
    expect(serializeSnapshot(snapshot(), MAX_SNAPSHOT_CHARS)).not.toBeNull();
    const storage = fakeStorage();
    expect(writeSnapshot(storage, scope, big)).toBe(false);
    expect(storage.length).toBe(0);
  });

  it('is null for a different envelope version', () => {
    const text = serializeSnapshot(snapshot());
    const older = JSON.stringify({ ...JSON.parse(text ?? ''), v: SNAPSHOT_VERSION - 1 });
    const newer = JSON.stringify({ ...JSON.parse(text ?? ''), v: SNAPSHOT_VERSION + 1 });
    expect(parseSnapshot(older)).toBeNull();
    expect(parseSnapshot(newer)).toBeNull();
  });

  it('is null for corrupt, empty or foreign input, and never throws', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot(undefined)).toBeNull();
    expect(parseSnapshot('')).toBeNull();
    expect(parseSnapshot('{not json')).toBeNull();
    expect(parseSnapshot('"a string"')).toBeNull();
    expect(parseSnapshot('42')).toBeNull();
    expect(parseSnapshot(JSON.stringify({ v: SNAPSHOT_VERSION }))).toBeNull();
    expect(parseSnapshot(JSON.stringify({ v: SNAPSHOT_VERSION, flow: 'nope' }))).toBeNull();
    expect(parseSnapshot('x'.repeat(MAX_SNAPSHOT_CHARS + 1))).toBeNull();
  });

  it('is null when the flow is missing what the first render indexes into', () => {
    const wrap = (flowValue: unknown) =>
      JSON.stringify({ v: SNAPSHOT_VERSION, savedAt: 1, flow: flowValue, inboundLinks: [] });
    const good = flow() as unknown as Record<string, unknown>;
    expect(parseSnapshot(wrap(good))).not.toBeNull();
    expect(parseSnapshot(wrap({ ...good, blocks: undefined }))).toBeNull();
    expect(parseSnapshot(wrap({ ...good, connections: 'x' }))).toBeNull();
    expect(parseSnapshot(wrap({ ...good, blocks: [{ id: 'b', name: 'B' }] }))).toBeNull(); // no blockElements
    expect(
      parseSnapshot(wrap({ ...good, blocks: [{ ...(good.blocks as object[])[0], blockElements: [null] }] })),
    ).toBeNull();
    expect(parseSnapshot(wrap({ ...good, connections: [{ __typename: 'BlockToBlockConnection' }] }))).toBeNull();
  });

  it('repairs what it can: a missing savedAt is 0, a non-list inboundLinks is empty', () => {
    const text = JSON.stringify({ v: SNAPSHOT_VERSION, flow: flow(), inboundLinks: 'nope' });
    expect(parseSnapshot(text)).toEqual({ flow: flow(), inboundLinks: [], savedAt: 0 });
  });
});

describe('readSnapshot / writeSnapshot', () => {
  it('reads back what was written under the same scope, and nothing under another', () => {
    const storage = fakeStorage();
    expect(writeSnapshot(storage, scope, snapshot())).toBe(true);
    expect(readSnapshot(storage, scope)).toEqual(snapshot());
    expect(readSnapshot(storage, { ...scope, shape: 'ffffffff' })).toBeNull();
    expect(readSnapshot(storage, { ...scope, flowId: 'flow-2' })).toBeNull();
  });

  it('reads no storage as no snapshot and writes nowhere', () => {
    expect(readSnapshot(null, scope)).toBeNull();
    expect(writeSnapshot(null, scope, snapshot())).toBe(false);
  });

  it('a storage that throws on read is no snapshot, not a crash', () => {
    const broken: StorageLike = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(readSnapshot(broken, scope)).toBeNull();
  });

  it('makes room once when the origin is full — other snapshots go, foreign keys stay', () => {
    const one = serializeSnapshot(snapshot()) ?? '';
    const storage = fakeStorage(one.length * 2 + 100);
    storage.setItem('host.theme', 'dark');
    expect(writeSnapshot(storage, { ...scope, flowId: 'flow-a' }, snapshot({ flow: flow('flow-a') }))).toBe(true);
    expect(writeSnapshot(storage, { ...scope, flowId: 'flow-b' }, snapshot({ flow: flow('flow-b') }))).toBe(true);
    // The third does not fit beside the other two; they are evicted for it.
    expect(writeSnapshot(storage, { ...scope, flowId: 'flow-c' }, snapshot({ flow: flow('flow-c') }))).toBe(true);
    expect(readSnapshot(storage, { ...scope, flowId: 'flow-c' })?.flow.id).toBe('flow-c');
    expect(readSnapshot(storage, { ...scope, flowId: 'flow-a' })).toBeNull();
    expect(readSnapshot(storage, { ...scope, flowId: 'flow-b' })).toBeNull();
    expect(storage.getItem('host.theme')).toBe('dark');
  });

  it('gives up quietly when even an empty cache cannot hold the flow', () => {
    const storage = fakeStorage(10);
    expect(writeSnapshot(storage, scope, snapshot())).toBe(false);
    expect(storage.length).toBe(0);
  });
});

describe('evictSnapshots', () => {
  it('removes every key under the prefix except the one to keep, and counts them', () => {
    const storage = fakeStorage();
    storage.setItem(`${SNAPSHOT_PREFIX}v0.old.bot.flow`, '{}');
    storage.setItem(snapshotKey(scope), '{}');
    storage.setItem(snapshotKey({ ...scope, flowId: 'flow-2' }), '{}');
    storage.setItem('host.theme', 'dark');
    expect(evictSnapshots(storage, snapshotKey(scope))).toBe(2);
    expect([...storage.map.keys()].sort()).toEqual([snapshotKey(scope), 'host.theme'].sort());
  });
});

describe('the sweep the shell calls', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  afterEach(() => {
    if (real) Object.defineProperty(globalThis, 'localStorage', real);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('drops every snapshot when the session behind them ends', () => {
    /* Sign-out and a bot switch both end the session a snapshot belongs to, and
       a snapshot is a whole flow. Before this, both left it on the device for
       whoever opened the app next. */
    const storage = fakeStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    storage.setItem(snapshotKey(scope), '{}');
    storage.setItem(snapshotKey({ ...scope, flowId: 'flow-2' }), '{}');
    storage.setItem('host.theme', 'dark');

    clearDeviceCaches();

    expect([...storage.map.keys()]).toEqual(['host.theme']);
  });
});
