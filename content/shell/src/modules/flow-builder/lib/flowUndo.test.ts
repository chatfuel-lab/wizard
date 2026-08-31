import { describe, expect, it } from 'vitest';
import {
  captureConnect,
  captureDeleteBlock,
  captureDeleteElement,
  captureDisconnect,
  captureEntryPoint,
  captureMove,
  captureStartingPoint,
  EMPTY_HISTORY,
  HISTORY_DEPTH,
  remember,
  takeRedo,
  takeUndo,
  type FlowUndoEntry,
} from './flowUndo';
import type { ConnectionT } from '../types';

const blocks = [
  { id: 'a', positionX: 100, positionY: 100 },
  { id: 'b', positionX: 400, positionY: 100 },
];

const b2b = (source: string, target: string): ConnectionT => ({
  __typename: 'BlockToBlockConnection',
  id: `synth-${source}-${target}`,
  sourceBlockID: source,
  targetBlockID: target,
});

const c2b = (source: string, element: string, handle: string, target: string): ConnectionT => ({
  __typename: 'ComponentToBlockConnection',
  id: `synth-${element}-${handle}`,
  sourceBlockID: source,
  sourceBlockElementID: element,
  sourceHandleID: handle,
  targetBlockID: target,
});

const move = (id: string): FlowUndoEntry => ({
  kind: 'move',
  undo: { op: 'move', updates: [{ blockID: id, positionX: 0, positionY: 0 }] },
  redo: { op: 'move', updates: [{ blockID: id, positionX: 1, positionY: 1 }] },
});

describe('captureMove', () => {
  it('remembers where the blocks were, and where they were asked to go', () => {
    const entry = captureMove(blocks, [
      { blockID: 'a', positionX: 160, positionY: 40 },
      { blockID: 'b', positionX: 460, positionY: 40 },
    ]);
    expect(entry?.undo).toEqual({
      op: 'move',
      updates: [
        { blockID: 'a', positionX: 100, positionY: 100 },
        { blockID: 'b', positionX: 400, positionY: 100 },
      ],
    });
    expect(entry?.redo).toEqual({
      op: 'move',
      updates: [
        { blockID: 'a', positionX: 160, positionY: 40 },
        { blockID: 'b', positionX: 460, positionY: 40 },
      ],
    });
  });

  it('records nothing for a drag that ended where it started', () => {
    expect(captureMove(blocks, [{ blockID: 'a', positionX: 100, positionY: 100 }])).toBeNull();
  });

  it('drops a block the flow does not have rather than inventing a position', () => {
    const entry = captureMove(blocks, [
      { blockID: 'ghost', positionX: 10, positionY: 10 },
      { blockID: 'a', positionX: 10, positionY: 10 },
    ]);
    expect(entry?.undo).toEqual({
      op: 'move',
      updates: [{ blockID: 'a', positionX: 100, positionY: 100 }],
    });
  });

  it('records nothing when no id in the batch is in the flow', () => {
    expect(captureMove(blocks, [{ blockID: 'ghost', positionX: 10, positionY: 10 }])).toBeNull();
  });
});

describe('captureConnect', () => {
  const plan = { kind: 'block', request: { sourceBlockID: 'a', targetBlockID: 'b' } } as const;

  it('undoes a first connection by removing it', () => {
    expect(captureConnect([], plan)?.undo).toEqual({
      op: 'disconnect',
      plan: { kind: 'block', sourceBlockID: 'a' },
      sourceBlockID: 'a',
    });
  });

  it('restores the connection the upsert displaced, not "no connection"', () => {
    expect(captureConnect([b2b('a', 'c')], plan)?.undo).toEqual({
      op: 'connect',
      plan: { kind: 'block', request: { sourceBlockID: 'a', targetBlockID: 'c' } },
    });
  });

  it('ignores a connection from another block', () => {
    expect(captureConnect([b2b('z', 'c')], plan)?.undo).toEqual({
      op: 'disconnect',
      plan: { kind: 'block', sourceBlockID: 'a' },
      sourceBlockID: 'a',
    });
  });

  it('records nothing for re-connecting what is already connected', () => {
    expect(captureConnect([b2b('a', 'b')], plan)).toBeNull();
  });

  it('keys a component connection on its element and handle', () => {
    const component = {
      kind: 'component',
      request: {
        sourceBlockID: 'a',
        sourceBlockElementID: 'el-1',
        sourceHandleID: 'btn-1',
        targetBlockID: 'b',
      },
    } as const;

    /* Same element, different handle: a different outlet entirely, so this
       connection displaces nothing. */
    expect(captureConnect([c2b('a', 'el-1', 'btn-2', 'c')], component)?.undo).toEqual({
      op: 'disconnect',
      plan: { kind: 'component', sourceBlockElementID: 'el-1', sourceHandleID: 'btn-1' },
      sourceBlockID: 'a',
    });

    expect(captureConnect([c2b('a', 'el-1', 'btn-1', 'c')], component)?.undo).toEqual({
      op: 'connect',
      plan: {
        kind: 'component',
        request: {
          sourceBlockID: 'a',
          sourceBlockElementID: 'el-1',
          sourceHandleID: 'btn-1',
          targetBlockID: 'c',
        },
      },
    });
  });
});

describe('captureDisconnect', () => {
  it('reconnects from the parts of the edge it removed', () => {
    const entry = captureDisconnect([b2b('a', 'b')], { kind: 'block', sourceBlockID: 'a' });
    expect(entry?.undo).toEqual({
      op: 'connect',
      plan: { kind: 'block', request: { sourceBlockID: 'a', targetBlockID: 'b' } },
    });
    expect(entry?.redo).toEqual({
      op: 'disconnect',
      plan: { kind: 'block', sourceBlockID: 'a' },
      sourceBlockID: 'a',
    });
  });

  it('carries all four parts of a component edge back', () => {
    const entry = captureDisconnect([c2b('a', 'el-1', 'btn-1', 'b')], {
      kind: 'component',
      sourceBlockElementID: 'el-1',
      sourceHandleID: 'btn-1',
    });
    expect(entry?.undo).toEqual({
      op: 'connect',
      plan: {
        kind: 'component',
        request: {
          sourceBlockID: 'a',
          sourceBlockElementID: 'el-1',
          sourceHandleID: 'btn-1',
          targetBlockID: 'b',
        },
      },
    });
  });

  it('records nothing when there was no such edge', () => {
    expect(captureDisconnect([b2b('z', 'b')], { kind: 'block', sourceBlockID: 'a' })).toBeNull();
  });
});

describe('captureStartingPoint', () => {
  it('puts the starting point back on the block that held it', () => {
    const entry = captureStartingPoint({ startingPointBlock: { id: 'a' } }, 'b');
    expect(entry?.undo).toEqual({ op: 'startingPoint', blockID: 'a' });
    expect(entry?.redo).toEqual({ op: 'startingPoint', blockID: 'b' });
  });

  it('refuses when the flow had no starting point, because none can be removed', () => {
    const entry = captureStartingPoint({ startingPointBlock: null }, 'b');
    expect(entry?.undo).toBeNull();
    expect(entry?.refusal?.title).toBe('The starting point cannot be cleared');
  });

  it('records nothing for setting the block that already holds it', () => {
    expect(captureStartingPoint({ startingPointBlock: { id: 'a' } }, 'a')).toBeNull();
  });

  it('records nothing at all with no flow, which is not the same as having none set', () => {
    expect(captureStartingPoint(null, 'b')).toBeNull();
  });
});

describe('captureEntryPoint', () => {
  const entryPoints = [{ id: 'a', isEntryPointEnabled: false }, { id: 'b' }];

  it('undoes an enable by disabling', () => {
    const entry = captureEntryPoint(entryPoints, 'a', true);
    expect(entry?.undo).toEqual({ op: 'entryPoint', blockID: 'a', enabled: false });
    expect(entry?.redo).toEqual({ op: 'entryPoint', blockID: 'a', enabled: true });
  });

  it('still records a disable, though re-enabling is the server’s to refuse', () => {
    const entry = captureEntryPoint([{ id: 'a', isEntryPointEnabled: true }], 'a', false);
    expect(entry?.undo).toEqual({ op: 'entryPoint', blockID: 'a', enabled: true });
  });

  it('records nothing for a toggle to the state it is already in', () => {
    expect(captureEntryPoint(entryPoints, 'a', false)).toBeNull();
  });

  it('records nothing for a block that has no entry point', () => {
    expect(captureEntryPoint(entryPoints, 'b', true)).toBeNull();
    expect(captureEntryPoint(entryPoints, 'ghost', true)).toBeNull();
  });
});

describe('deletion', () => {
  it('records a block delete as refused, with the reason', () => {
    const entry = captureDeleteBlock();
    expect(entry.undo).toBeNull();
    expect(entry.redo).toBeNull();
    expect(entry.refusal?.description).toContain('new id');
  });

  it('records an element delete as refused', () => {
    expect(captureDeleteElement().undo).toBeNull();
  });
});

describe('remember', () => {
  it('stacks entries and throws the redo branch away', () => {
    const history = { undo: [move('a')], redo: [move('b')] };
    const next = remember(history, move('c'));
    expect(next.undo).toHaveLength(2);
    expect(next.redo).toEqual([]);
  });

  it('keeps the newest HISTORY_DEPTH entries', () => {
    let history = EMPTY_HISTORY;
    for (let index = 0; index < HISTORY_DEPTH + 5; index += 1) {
      history = remember(history, move(`block-${index}`));
    }
    expect(history.undo).toHaveLength(HISTORY_DEPTH);
    expect(history.undo[0].undo).toEqual({
      op: 'move',
      updates: [{ blockID: 'block-5', positionX: 0, positionY: 0 }],
    });
  });

  it('collapses a run of identical refusals, so a bulk delete costs one press', () => {
    let history = EMPTY_HISTORY;
    for (let index = 0; index < 20; index += 1) history = remember(history, captureDeleteBlock());
    expect(history.undo).toHaveLength(1);
  });

  it('keeps refusals of different kinds apart', () => {
    let history = remember(EMPTY_HISTORY, captureDeleteBlock());
    history = remember(history, captureDeleteElement());
    expect(history.undo).toHaveLength(2);
  });

  it('keeps two deletes apart when something undoable happened between them', () => {
    let history = remember(EMPTY_HISTORY, captureDeleteBlock());
    history = remember(history, move('a'));
    history = remember(history, captureDeleteBlock());
    expect(history.undo).toHaveLength(3);
  });

  it('returns the same history when a collapse changes nothing', () => {
    const history = remember(EMPTY_HISTORY, captureDeleteBlock());
    expect(remember(history, captureDeleteBlock())).toBe(history);
  });
});

describe('takeUndo and takeRedo', () => {
  it('has nothing to offer on an empty history', () => {
    expect(takeUndo(EMPTY_HISTORY)).toBeNull();
    expect(takeRedo(EMPTY_HISTORY)).toBeNull();
  });

  it('moves an undone entry onto the redo stack', () => {
    const taken = takeUndo({ undo: [move('a')], redo: [] });
    expect(taken?.history.undo).toEqual([]);
    expect(taken?.history.redo).toHaveLength(1);
  });

  it('hands a refusal back to be explained, but never to be redone', () => {
    const taken = takeUndo({ undo: [captureDeleteBlock()], redo: [] });
    expect(taken?.entry.refusal).toBeDefined();
    expect(taken?.history.redo).toEqual([]);
  });

  it('reaches the operation before a refusal on the second press', () => {
    const first = takeUndo({ undo: [move('a'), captureDeleteBlock()], redo: [] });
    const second = takeUndo(first!.history);
    expect(second?.entry.kind).toBe('move');
  });

  it('puts a redone entry back where undo can reach it again', () => {
    const undone = takeUndo({ undo: [move('a')], redo: [] });
    const redone = takeRedo(undone!.history);
    expect(redone?.entry.redo).toEqual({
      op: 'move',
      updates: [{ blockID: 'a', positionX: 1, positionY: 1 }],
    });
    expect(redone?.history.undo).toHaveLength(1);
    expect(redone?.history.redo).toEqual([]);
  });
});
