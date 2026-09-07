import { describe, expect, it } from 'vitest';
import {
  broadcastsReducer,
  initialBroadcastsState,
  withBlock,
  type BroadcastsAction,
  type BroadcastsState,
} from './broadcastsStore';
import { sampleFlow } from './samples';

const run = (state: BroadcastsState, ...actions: BroadcastsAction[]) => actions.reduce(broadcastsReducer, state);

const answer = (...flows: ReturnType<typeof sampleFlow>[]) => ({
  groups: [{ id: 'g1', name: 'Broadcasts', flows }],
  ungrouped: [],
});

describe('loading', () => {
  it('keeps what is held on screen while a fresh read is out', () => {
    const state = run(initialBroadcastsState(), { type: 'reset' });
    expect(state.refreshing).toBe(true);
    expect(state.epoch).toBe(1);
  });

  it('holds only campaign-shaped flows, and remembers their group', () => {
    const flow = sampleFlow({ id: 'f1' });
    const chatbot = { ...sampleFlow({ id: 'f2' }), blocks: [] };
    const state = run(
      initialBroadcastsState(),
      { type: 'reset' },
      {
        type: 'listLoaded',
        epoch: 1,
        token: 1,
        at: 5,
        answer: { groups: [{ id: 'g1', name: 'Broadcasts', flows: [flow, chatbot] }], ungrouped: [] },
      },
    );
    expect(Object.keys(state.flows)).toEqual(['f1']);
    expect(state.groupOf).toEqual({ f1: 'g1' });
    expect(state.groups).toEqual([{ id: 'g1', name: 'Broadcasts' }]);
    expect(state.list).toEqual({ state: 'ready', loadedAt: 5 });
  });
});

describe('epoch', () => {
  it('drops an answer to a question that is no longer the newest', () => {
    const state = run(
      initialBroadcastsState(),
      { type: 'reset' },
      { type: 'reset' },
      {
        type: 'listLoaded',
        epoch: 1,
        token: 2,
        at: 1,
        answer: answer(sampleFlow()),
      },
    );
    expect(state.list.state).toBe('loading');
    expect(state.refreshing).toBe(true);
  });
});

describe('token', () => {
  it('lets a write that landed while a read was out win', () => {
    const before = sampleFlow({ id: 'f1', name: 'Old name' });
    const written = sampleFlow({ id: 'f1', name: 'New name' });
    const state = run(
      initialBroadcastsState(),
      { type: 'reset' },
      { type: 'flowReplaced', flow: written },
      { type: 'listLoaded', epoch: 1, token: 1, at: 1, answer: answer(before) },
    );
    expect(state.flows.f1?.name).toBe('New name');
    expect(state.refreshing).toBe(false);
  });
});

describe('a read that comes back late', () => {
  it('is dropped when a write moved the token while it was out', () => {
    const before = sampleFlow({ id: 'f1', name: 'Old name' });
    const written = sampleFlow({ id: 'f1', name: 'New name' });
    const departed = run(initialBroadcastsState(), { type: 'flowReplaced', flow: before });
    const state = run(
      departed,
      { type: 'flowReplaced', flow: written },
      { type: 'flowRead', token: departed.token, flow: before },
    );
    expect(state.flows.f1?.name).toBe('New name');
  });

  it('lands when nothing moved', () => {
    const departed = run(initialBroadcastsState(), { type: 'flowReplaced', flow: sampleFlow({ id: 'f1' }) });
    const state = run(departed, {
      type: 'flowRead',
      token: departed.token,
      flow: sampleFlow({ id: 'f1', name: 'Read' }),
    });
    expect(state.flows.f1?.name).toBe('Read');
  });
});

describe('a setter that answers a block', () => {
  it('lands in the flow the store holds now, not the one the caller saw', () => {
    const held = run(initialBroadcastsState(), {
      type: 'flowReplaced',
      flow: sampleFlow({ id: 'f1', name: 'Renamed meanwhile' }),
    });
    const block = { ...held.flows.f1!.blocks[1]!, name: 'Filled' };
    const state = run(held, { type: 'blockReplaced', flowId: 'f1', block });
    expect(state.flows.f1?.name).toBe('Renamed meanwhile');
    expect(state.flows.f1?.blocks.map((candidate) => candidate.name)).toEqual(['Scheduled message', 'Filled']);
    expect(run(held, { type: 'blockReplaced', flowId: 'gone', block })).toBe(held);
  });
});

describe('writes', () => {
  it('replace a flow wholesale', () => {
    const state = run(initialBroadcastsState(), { type: 'flowReplaced', flow: sampleFlow({ id: 'f1' }) });
    expect(state.flows.f1).toBeDefined();
    expect(state.token).toBe(1);
  });

  it('let a flow that stopped being a campaign leave', () => {
    const flow = sampleFlow({ id: 'f1' });
    const state = run(
      initialBroadcastsState(),
      { type: 'flowReplaced', flow },
      { type: 'flowReplaced', flow: { ...flow, blocks: [] } },
    );
    expect(state.flows.f1).toBeUndefined();
  });

  it('remove a flow and its group binding', () => {
    const state = run(
      initialBroadcastsState(),
      { type: 'listLoaded', epoch: 0, token: 0, at: 1, answer: answer(sampleFlow({ id: 'f1' })) },
      { type: 'flowRemoved', flowId: 'f1' },
    );
    expect(state.flows).toEqual({});
    expect(state.groupOf).toEqual({});
  });

  it('track what is in flight, once per key', () => {
    const state = run(
      initialBroadcastsState(),
      { type: 'opStarted', key: 'send:f1' },
      { type: 'opStarted', key: 'send:f1' },
    );
    expect(state.pending).toEqual(['send:f1']);
    expect(run(state, { type: 'opFinished', key: 'send:f1' }).pending).toEqual([]);
  });
});

describe('a block answered by a setter', () => {
  it('replaces its twin in the flow', () => {
    const flow = sampleFlow();
    const block = { ...flow.blocks[1]!, name: 'Renamed' };
    expect(withBlock(flow, block).blocks.map((candidate) => candidate.name)).toEqual(['Scheduled message', 'Renamed']);
  });
});
