import { describe, expect, it } from 'vitest';
import { flowReducer, initialFlowState, pruneSelection, type FlowState } from './flowStore';
import type { BlockT, FlowT } from '../types';

const block = (id: string, x = 0, y = 0, elementIds: string[] = [], name = `Block ${id}`): BlockT =>
  ({
    __typename: 'RegularContentBlock',
    id,
    name,
    positionX: x,
    positionY: y,
    platform: 'widget',
    isStartingPoint: false,
    blockElements: elementIds.map((elementId) => ({
      __typename: 'WhatsAppTextBlockElement',
      id: elementId,
    })),
  }) as unknown as BlockT;

const flowOf = (blocks: BlockT[]): FlowT =>
  ({ id: 'flow-1', name: 'Flow', platform: 'widget', blocks, connections: [] }) as unknown as FlowT;

/** A state that has already loaded, at epoch 1. */
function loaded(blocks: BlockT[], selection: FlowState['selection'] = null): FlowState {
  const reloaded = flowReducer(initialFlowState(selection), { type: 'reload' });
  return flowReducer(reloaded, {
    type: 'loaded',
    epoch: reloaded.epoch,
    flow: flowOf(blocks),
    inboundLinks: [],
  });
}

const positionOf = (state: FlowState, id: string) => {
  const found = state.flow?.blocks.find((candidate) => candidate.id === id);
  return found ? { x: found.positionX, y: found.positionY } : null;
};
const nameOf = (state: FlowState, id: string) => state.flow?.blocks.find((candidate) => candidate.id === id)?.name;

describe('flowStore — a failed move rolls back one block, not the flow', () => {
  it('leaves a rename that landed mid-flight alone', () => {
    let state = loaded([block('a', 10, 10), block('b', 200, 0)]);

    state = flowReducer(state, {
      type: 'moveStarted',
      blockId: 'a',
      positionX: 500,
      positionY: 500,
    });
    expect(positionOf(state, 'a')).toEqual({ x: 500, y: 500 });

    // A rename answers while the move is still in flight.
    state = flowReducer(state, {
      type: 'blockApplied',
      epoch: state.epoch,
      block: block('b', 200, 0, [], 'Renamed by the user'),
    });

    state = flowReducer(state, {
      type: 'moveFailed',
      epoch: state.epoch,
      blockId: 'a',
      message: 'nope',
    });

    /* The whole point. The old hook restored a snapshot of the entire flow and
       took the rename down with the move. */
    expect(positionOf(state, 'a')).toEqual({ x: 10, y: 10 });
    expect(nameOf(state, 'b')).toBe('Renamed by the user');
    expect(state.actionError).toBe('nope');
    expect(state.pending).toEqual({});
  });

  it('rolls two failed drags of the same block back to where the FIRST one started', () => {
    let state = loaded([block('a', 10, 10)]);
    for (const at of [100, 200]) {
      state = flowReducer(state, {
        type: 'moveStarted',
        blockId: 'a',
        positionX: at,
        positionY: at,
      });
    }
    state = flowReducer(state, { type: 'moveFailed', epoch: state.epoch, blockId: 'a', message: 'no' });
    expect(positionOf(state, 'a')).toEqual({ x: 10, y: 10 });
  });

  it('rolls back only the blocks a failed bulk move touched', () => {
    let state = loaded([block('a', 0, 0), block('b', 10, 10), block('c', 20, 20)]);
    state = flowReducer(state, {
      type: 'bulkMoveStarted',
      updates: [
        { blockID: 'a', positionX: 900, positionY: 900 },
        { blockID: 'b', positionX: 800, positionY: 800 },
      ],
    });
    state = flowReducer(state, {
      type: 'bulkMoveFailed',
      epoch: state.epoch,
      blockIds: ['a', 'b'],
      message: 'refused',
    });
    expect(positionOf(state, 'a')).toEqual({ x: 0, y: 0 });
    expect(positionOf(state, 'b')).toEqual({ x: 10, y: 10 });
    expect(positionOf(state, 'c')).toEqual({ x: 20, y: 20 });
  });
});

describe('flowStore — a flow landing mid-move does not snap the block back', () => {
  it('re-applies the optimistic position over a response that predates it', () => {
    let state = loaded([block('a', 10, 10)]);
    state = flowReducer(state, {
      type: 'moveStarted',
      blockId: 'a',
      positionX: 500,
      positionY: 500,
    });
    // Some other mutation answers, carrying the server's older position for 'a'.
    state = flowReducer(state, {
      type: 'flowApplied',
      epoch: state.epoch,
      flow: flowOf([block('a', 10, 10), block('z', 900, 900)]),
    });
    expect(positionOf(state, 'a')).toEqual({ x: 500, y: 500 });
    expect(positionOf(state, 'z')).toEqual({ x: 900, y: 900 });
  });

  it('lets the settled position win once the move answers', () => {
    let state = loaded([block('a', 10, 10)]);
    state = flowReducer(state, {
      type: 'moveStarted',
      blockId: 'a',
      positionX: 500.7,
      positionY: 500.2,
    });
    // Positions are server-stored Int!s — the answer is rounded.
    state = flowReducer(state, {
      type: 'moveSettled',
      epoch: state.epoch,
      blockId: 'a',
      positionX: 501,
      positionY: 500,
    });
    expect(positionOf(state, 'a')).toEqual({ x: 501, y: 500 });
    expect(state.pending).toEqual({});
  });
});

describe('flowStore — the stale-response guard', () => {
  it('drops a mutation response issued before a reload', () => {
    let state = loaded([block('a', 0, 0)]);
    const stale = state.epoch;
    state = flowReducer(state, { type: 'reload' });
    state = flowReducer(state, {
      type: 'loaded',
      epoch: state.epoch,
      flow: flowOf([block('a', 77, 77)]),
      inboundLinks: [],
    });

    /* The move was issued first and answers second. The old hook applied it,
       so dragging a block and pressing Refresh could put the canvas back to
       the state the drag saw. */
    state = flowReducer(state, {
      type: 'flowApplied',
      epoch: stale,
      flow: flowOf([block('a', 0, 0)]),
    });
    expect(positionOf(state, 'a')).toEqual({ x: 77, y: 77 });
  });

  it('drops every stale RESPONSE', () => {
    const state = loaded([block('a', 0, 0)]);
    const stale = state.epoch - 1;
    for (const action of [
      { type: 'loaded' as const, epoch: stale, flow: flowOf([]), inboundLinks: [] },
      { type: 'loadFailed' as const, epoch: stale, message: 'boom' },
      { type: 'moveSettled' as const, epoch: stale, blockId: 'a', positionX: 9, positionY: 9 },
      { type: 'moveFailed' as const, epoch: stale, blockId: 'a', message: 'boom' },
      { type: 'actionFailed' as const, epoch: stale, message: 'boom' },
      { type: 'flowApplied' as const, epoch: stale, flow: flowOf([]) },
    ]) {
      expect(flowReducer(state, action)).toBe(state);
    }
  });

  /**
   * And drops NO gesture. The epoch exists to ignore what the server said about
   * a flow that has since been reloaded; a drag the user just finished cannot be
   * stale, because it happened on the flow currently on the screen.
   *
   * Guarding it was the bug: the drop was swallowed, the block sprang back to
   * where it started, and only a refetch revealed that the server had had the
   * right position the whole time. Picture and data disagreeing, from a guard
   * that protected nothing.
   */
  it('applies a gesture whatever the epoch has been doing', () => {
    let state = loaded([block('a', 0, 0)]);
    for (let round = 0; round < 3; round += 1) state = flowReducer(state, { type: 'reload' });

    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 250, positionY: 333 });
    expect(positionOf(state, 'a')).toEqual({ x: 250, y: 333 });

    state = flowReducer(state, {
      type: 'bulkMoveStarted',
      updates: [{ blockID: 'a', positionX: 400, positionY: 400 }],
    });
    expect(positionOf(state, 'a')).toEqual({ x: 400, y: 400 });
  });

  it('drops pending moves on a reload, because their answers will be dropped too', () => {
    let state = loaded([block('a', 0, 0)]);
    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 250, positionY: 333 });
    expect(Object.keys(state.pending)).toEqual(['a']);

    state = flowReducer(state, { type: 'reload' });
    /* Without this the entry is immortal: the settle and the failure both carry
       the old epoch and are ignored, so nothing ever clears it, and
       `reapplyPending` goes on forcing that position over every flow the server
       sends for the rest of the session. */
    expect(state.pending).toEqual({});
  });

  it('keeps the flow on screen across a reload', () => {
    let state = loaded([block('a', 0, 0)]);
    state = flowReducer(state, { type: 'reload' });
    /* A refetch is a freshness check, not a reason to blank the canvas
       somebody is looking at. `loading` is for the first load only. */
    expect(state.flow).not.toBeNull();
    expect(state.loading).toBe(false);
  });
});

describe('flowStore — selection lives with the thing it points at', () => {
  it('drops a selection whose block was deleted', () => {
    let state = loaded([block('a', 0, 0), block('b', 0, 0)], { blockId: 'b', elementId: null });
    state = flowReducer(state, { type: 'flowApplied', epoch: state.epoch, flow: flowOf([block('a')]) });
    expect(state.selection).toBeNull();
  });

  it('falls back to the block when only the element was deleted', () => {
    let state = loaded([block('a', 0, 0, ['el-1'])], { blockId: 'a', elementId: 'el-1' });
    state = flowReducer(state, {
      type: 'flowApplied',
      epoch: state.epoch,
      flow: flowOf([block('a', 0, 0, [])]),
    });
    expect(state.selection).toEqual({ blockId: 'a', elementId: null });
  });

  it('returns the SAME state when nothing was dropped', () => {
    const state = loaded([block('a', 0, 0, ['el-1'])], { blockId: 'a', elementId: 'el-1' });
    const again = flowReducer(state, {
      type: 'selected',
      selection: { blockId: 'a', elementId: 'el-1' },
    });
    /* Identity, not equality. A fresh object here makes any effect keyed on the
       selection fire forever — which is exactly the loop the old editor's
       cleanup effect was one line away from. */
    expect(again).toBe(state);
  });

  it('refuses a selection that points at nothing', () => {
    const state = loaded([block('a')]);
    expect(flowReducer(state, { type: 'selected', selection: { blockId: 'ghost', elementId: null } })).toBe(state);
  });

  it('prunes on its own, for a caller with no flow yet', () => {
    expect(pruneSelection({ blockId: 'a', elementId: null }, null)).toEqual({
      blockId: 'a',
      elementId: null,
    });
    expect(pruneSelection(null, flowOf([block('a')]))).toBeNull();
  });
});

describe('flowStore — the small guarantees', () => {
  it('ignores a block response for a block that is not here', () => {
    const state = loaded([block('a')]);
    expect(flowReducer(state, { type: 'blockApplied', epoch: state.epoch, block: block('ghost') })).toBe(state);
  });

  it('patches scalar fields without touching anything else', () => {
    let state = loaded([block('a', 0, 0, ['el-1'])]);
    state = flowReducer(state, {
      type: 'blockPatched',
      epoch: state.epoch,
      blockId: 'a',
      patch: { name: 'Renamed' },
    });
    expect(nameOf(state, 'a')).toBe('Renamed');
    expect(state.flow?.blocks[0].blockElements).toHaveLength(1);
  });

  it('clears an action error only when there is one', () => {
    const state = loaded([block('a')]);
    expect(flowReducer(state, { type: 'actionErrorCleared' })).toBe(state);
    const failed = flowReducer(state, { type: 'actionFailed', epoch: state.epoch, message: 'x' });
    expect(flowReducer(failed, { type: 'actionErrorCleared' }).actionError).toBeNull();
  });
});

describe('flowStore — a refusal is remembered against the block it happened to', () => {
  it('blames the block that failed to move, and only that one', () => {
    let state = loaded([block('a', 10, 10), block('b', 200, 0)]);
    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 99, positionY: 99 });
    state = flowReducer(state, {
      type: 'moveFailed',
      epoch: state.epoch,
      blockId: 'a',
      message: 'Position rejected',
    });

    expect(state.blockErrors).toEqual({ a: 'Position rejected' });
  });

  it('outlives the banner, because the move is still not saved', () => {
    let state = loaded([block('a')]);
    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 5, positionY: 5 });
    state = flowReducer(state, {
      type: 'moveFailed',
      epoch: state.epoch,
      blockId: 'a',
      message: 'Nope',
    });

    /* The banner is on a four-second timer. If that timer took the card's
       message with it, the whole point of having one would be gone. */
    state = flowReducer(state, { type: 'actionErrorCleared' });
    expect(state.actionError).toBeNull();
    expect(state.blockErrors.a).toBe('Nope');
  });

  it('forgets it when the same block is written to successfully', () => {
    let state = loaded([block('a')]);
    state = flowReducer(state, {
      type: 'moveFailed',
      epoch: state.epoch,
      blockId: 'a',
      message: 'Nope',
    });

    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 7, positionY: 7 });
    expect(state.blockErrors.a).toBeUndefined();

    state = flowReducer(state, {
      type: 'moveSettled',
      epoch: state.epoch,
      blockId: 'a',
      positionX: 7,
      positionY: 7,
    });
    expect(state.blockErrors).toEqual({});
  });

  it('blames every block in a failed batch, and absolves them all when one lands', () => {
    let state = loaded([block('a'), block('b'), block('c')]);
    const updates = [
      { blockID: 'a', positionX: 1, positionY: 1 },
      { blockID: 'b', positionX: 2, positionY: 2 },
    ];

    state = flowReducer(state, { type: 'bulkMoveStarted', updates });
    state = flowReducer(state, {
      type: 'bulkMoveFailed',
      epoch: state.epoch,
      blockIds: ['a', 'b'],
      message: 'Layout rejected',
    });
    expect(state.blockErrors).toEqual({ a: 'Layout rejected', b: 'Layout rejected' });

    state = flowReducer(state, { type: 'bulkMoveStarted', updates });
    expect(state.blockErrors).toEqual({});
  });

  it('names the block a structural op was about, on both outcomes', () => {
    let state = loaded([block('a'), block('b')]);
    state = flowReducer(state, {
      type: 'actionFailed',
      epoch: state.epoch,
      message: 'That would make a cycle',
      blockId: 'a',
    });
    expect(state.blockErrors.a).toBe('That would make a cycle');

    /* The op that can blame a block has to be able to absolve it: the second
       attempt succeeded, and the card must stop saying the first one failed. */
    state = flowReducer(state, {
      type: 'flowApplied',
      epoch: state.epoch,
      flow: flowOf([block('a'), block('b')]),
      blockId: 'a',
    });
    expect(state.blockErrors).toEqual({});
  });

  it('leaves a blameless failure to the banner alone', () => {
    let state = loaded([block('a')]);
    state = flowReducer(state, { type: 'actionFailed', epoch: state.epoch, message: 'Whatever' });
    expect(state.actionError).toBe('Whatever');
    expect(state.blockErrors).toEqual({});
  });

  it('drops the blame when the block itself is gone', () => {
    let state = loaded([block('a'), block('b')]);
    state = flowReducer(state, {
      type: 'actionFailed',
      epoch: state.epoch,
      message: 'Delete refused',
      blockId: 'a',
    });

    state = flowReducer(state, {
      type: 'flowApplied',
      epoch: state.epoch,
      flow: flowOf([block('b')]),
    });
    expect(state.blockErrors).toEqual({});
  });

  it('a reload settles every open argument, because the server is re-read', () => {
    let state = loaded([block('a')]);
    state = flowReducer(state, {
      type: 'moveFailed',
      epoch: state.epoch,
      blockId: 'a',
      message: 'Nope',
    });

    state = flowReducer(state, { type: 'reload' });
    expect(state.blockErrors).toEqual({});
  });

  it('keeps the same object when there is nothing to forget', () => {
    /* This runs on every settled move. A fresh object each time would re-render
       every card on the canvas to report no news. */
    let state = loaded([block('a'), block('b')]);
    const before = state.blockErrors;
    state = flowReducer(state, { type: 'moveStarted', blockId: 'a', positionX: 3, positionY: 3 });
    state = flowReducer(state, {
      type: 'moveSettled',
      epoch: state.epoch,
      blockId: 'a',
      positionX: 3,
      positionY: 3,
    });
    expect(state.blockErrors).toBe(before);
  });
});

describe('flowStore — a snapshot is a first paint, never a source of truth', () => {
  const restored = { flow: flowOf([block('a', 1, 1), block('b', 2, 2)]), inboundLinks: [] };

  it('starts shown, marked stale, and not loading', () => {
    const state = initialFlowState(null, restored);
    expect(state.flow).toBe(restored.flow);
    expect(state.stale).toBe(true);
    expect(state.loading).toBe(false);
    // The no-snapshot start is exactly what it always was.
    const bare = initialFlowState();
    expect(bare.flow).toBeNull();
    expect(bare.stale).toBe(false);
    expect(bare.loading).toBe(true);
  });

  it('is replaced by the first load, which clears the mark, and never brings the spinner back', () => {
    let state = initialFlowState(null, restored);
    state = flowReducer(state, { type: 'reload' });
    expect(state.loading).toBe(false); // the snapshot stays on screen through the fetch
    expect(state.flow).toBe(restored.flow);
    const fresh = flowOf([block('a', 100, 100)]);
    state = flowReducer(state, { type: 'loaded', epoch: state.epoch, flow: fresh, inboundLinks: [] });
    expect(state.flow).toBe(fresh);
    expect(state.stale).toBe(false);
  });

  it('cannot fight the real load: the snapshot is at epoch 0 and the load is not', () => {
    /* There is no action that installs a snapshot, so there is nothing that
       could arrive late and overwrite a fresher flow. This pins that the
       initial state is BELOW the first reload's epoch. */
    const state = flowReducer(initialFlowState(null, restored), { type: 'reload' });
    expect(state.epoch).toBeGreaterThan(initialFlowState(null, restored).epoch);
  });

  it('keeps the mark through a failed load, with the snapshot still on screen', () => {
    let state = flowReducer(initialFlowState(null, restored), { type: 'reload' });
    state = flowReducer(state, { type: 'loadFailed', epoch: state.epoch, message: 'offline' });
    expect(state.flow).toBe(restored.flow);
    expect(state.stale).toBe(true);
    expect(state.error).toBe('offline');
    expect(state.loading).toBe(false);
  });

  it('is not made current by a mutation reconcile — only a load says the flow is fresh', () => {
    let state = flowReducer(initialFlowState(null, restored), { type: 'reload' });
    state = flowReducer(state, { type: 'blockApplied', epoch: state.epoch, block: block('a', 5, 5) });
    expect(state.stale).toBe(true);
    state = flowReducer(state, { type: 'flowApplied', epoch: state.epoch, flow: flowOf([block('a')]) });
    expect(state.stale).toBe(true);
  });

  it('prunes a deep-link selection against the snapshot, as it would against a loaded flow', () => {
    expect(initialFlowState({ blockId: 'ghost', elementId: null }, restored).selection).toBeNull();
    expect(initialFlowState({ blockId: 'a', elementId: null }, restored).selection).toEqual({
      blockId: 'a',
      elementId: null,
    });
    // With nothing to prune against, the selection is kept for the flow to arrive.
    expect(initialFlowState({ blockId: 'ghost', elementId: null }).selection).toEqual({
      blockId: 'ghost',
      elementId: null,
    });
  });
});
