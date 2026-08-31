import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';
import type { ConnectPlan, DisconnectPlan } from './graph';
import type { ConnectionT } from '../types';

/**
 * Undo for the flow canvas, as pure functions.
 *
 * **What undo is here, exactly.** There is no server-side revert and no
 * revision field — guide.md says it in one line: no subscriptions, no version,
 * last write wins. So an undo entry is never a snapshot of a past state that
 * something could be rolled back to. It is a list of *compensating forward
 * requests*: the same mutations the editor already makes, aimed backwards.
 *
 * That distinction decides everything below. An operation is undoable exactly
 * when a forward mutation exists that puts the flow back, and three of them are
 * more interesting than they look:
 *
 * - **Connecting is an upsert.** `blockToBlockConnectionCreateOrUpdate` allows
 *   at most one edge per source block, and the component form is keyed by
 *   `(sourceBlockElementID, sourceHandleID)`. So the inverse of "connect A→B"
 *   depends on what was there first: if A pointed at C, the inverse is
 *   "connect A→C", and only if A pointed at nothing is it a disconnect. An undo
 *   that always disconnected would quietly destroy an edge the user never
 *   touched — which is the failure this file exists to not have.
 * - **Re-enabling an entry point may legitimately be refused.** The server
 *   rejects it with `ComponentHasValidationErrors` while the block's elements
 *   are invalid, and disabling one is often what a user did in order to fix it.
 *   The request is still the right request; it is allowed to fail, and the
 *   failure has to be reported rather than swallowed.
 * - **Deleting has no inverse at all.** There is no undelete. Re-creating
 *   yields a new id and an empty copy — every setter's contents are gone. The
 *   entry is recorded anyway, carrying the reason, because a ⌘Z that does
 *   nothing and says nothing is the thing being fixed.
 *
 * A lib rather than a hook because vitest here is node-only, and because the
 * capture is where the mistakes are: reading the pre-state a moment too late,
 * inverting an upsert as a delete, recording a move that did not move.
 */

/** Every kind of operation the history knows about. */
export type FlowUndoKind =
  'move' | 'connect' | 'disconnect' | 'startingPoint' | 'entryPoint' | 'deleteBlock' | 'deleteElement';

/**
 * A request the editor can already make.
 *
 * Undo issues nothing new: every one of these maps onto a `useFlowStore`
 * action that exists, which is what keeps this file free of transport and keeps
 * the optimistic apply, the rollback and the per-block error reporting working
 * the same way for an undo as for the gesture it reverses.
 */
export type FlowRequest =
  | { op: 'move'; updates: BlockPositionBulkUpdate[] }
  | { op: 'connect'; plan: ConnectPlan }
  | { op: 'disconnect'; plan: DisconnectPlan; sourceBlockID: string }
  | { op: 'startingPoint'; blockID: string }
  | { op: 'entryPoint'; blockID: string; enabled: boolean };

/** Why an entry has no inverse, in the two parts a toast is made of. */
export interface UndoRefusal {
  title: string;
  description: string;
}

export interface FlowUndoEntry {
  kind: FlowUndoKind;
  /** The compensating request, or null when the operation has no inverse. */
  undo: FlowRequest | null;
  /** The original operation again. Null exactly when `undo` is. */
  redo: FlowRequest | null;
  /** Present exactly when `undo` is null. */
  refusal?: UndoRefusal;
}

export interface FlowHistory {
  undo: readonly FlowUndoEntry[];
  redo: readonly FlowUndoEntry[];
}

export const EMPTY_HISTORY: FlowHistory = { undo: [], redo: [] };

/** Deep enough to cover a working session, shallow enough to stay a list. */
export const HISTORY_DEPTH = 50;

/** The three fields a captured move reads. */
export interface PositionedBlock {
  id: string;
  positionX: number;
  positionY: number;
}

const refused = (kind: FlowUndoKind, refusal: UndoRefusal): FlowUndoEntry => ({
  kind,
  undo: null,
  redo: null,
  refusal,
});

/**
 * Where a source already points, or null if nowhere.
 *
 * The lookup is by PARTS and never by `Connection.id`: ConnectionID is
 * synthesized per request server-side, so an id captured before a mutation
 * matches nothing in the flow that comes back.
 */
function currentTarget(connections: readonly ConnectionT[], plan: ConnectPlan): string | null {
  for (const connection of connections) {
    if (plan.kind === 'block') {
      if (
        connection.__typename === 'BlockToBlockConnection' &&
        connection.sourceBlockID === plan.request.sourceBlockID
      ) {
        return connection.targetBlockID;
      }
      continue;
    }
    if (
      connection.__typename === 'ComponentToBlockConnection' &&
      connection.sourceBlockElementID === plan.request.sourceBlockElementID &&
      connection.sourceHandleID === plan.request.sourceHandleID
    ) {
      return connection.targetBlockID;
    }
  }
  return null;
}

/** The same outlet, expressed as a disconnect. */
function disconnectFor(plan: ConnectPlan): DisconnectPlan {
  return plan.kind === 'block'
    ? { kind: 'block', sourceBlockID: plan.request.sourceBlockID }
    : {
        kind: 'component',
        sourceBlockElementID: plan.request.sourceBlockElementID,
        sourceHandleID: plan.request.sourceHandleID,
      };
}

/** The same outlet, aimed at a different block. */
function connectTo(plan: ConnectPlan, targetBlockID: string): ConnectPlan {
  return plan.kind === 'block'
    ? { kind: 'block', request: { ...plan.request, targetBlockID } }
    : { kind: 'component', request: { ...plan.request, targetBlockID } };
}

/**
 * A move, captured from where the blocks were BEFORE it.
 *
 * Returns null when nothing actually moved — a drag that ended on its own
 * origin, or a batch whose ids are not in this flow. An entry for that is worse
 * than no entry: ⌘Z would fire a round trip, change nothing, and consume the
 * press that was meant for the move before it.
 */
export function captureMove(
  blocks: readonly PositionedBlock[],
  updates: readonly BlockPositionBulkUpdate[],
): FlowUndoEntry | null {
  const before: BlockPositionBulkUpdate[] = [];
  const after: BlockPositionBulkUpdate[] = [];

  for (const update of updates) {
    const block = blocks.find((candidate) => candidate.id === update.blockID);
    if (!block) continue;
    if (block.positionX === update.positionX && block.positionY === update.positionY) continue;
    before.push({ blockID: block.id, positionX: block.positionX, positionY: block.positionY });
    after.push(update);
  }

  if (before.length === 0) return null;
  return { kind: 'move', undo: { op: 'move', updates: before }, redo: { op: 'move', updates: after } };
}

/**
 * A connection, captured from what the outlet pointed at before it.
 *
 * The whole of the upsert problem is these six lines. Both connect mutations
 * replace rather than add, so the inverse of connecting is reconnecting to
 * whatever was displaced, and disconnecting only when nothing was.
 */
export function captureConnect(connections: readonly ConnectionT[], plan: ConnectPlan): FlowUndoEntry | null {
  const previous = currentTarget(connections, plan);
  if (previous === plan.request.targetBlockID) return null;

  const redo: FlowRequest = { op: 'connect', plan };
  if (previous === null) {
    return {
      kind: 'connect',
      undo: {
        op: 'disconnect',
        plan: disconnectFor(plan),
        sourceBlockID: plan.request.sourceBlockID,
      },
      redo,
    };
  }
  return { kind: 'connect', undo: { op: 'connect', plan: connectTo(plan, previous) }, redo };
}

/**
 * An edge deletion, captured from the edge it is about to remove.
 *
 * The target is read out of the flow rather than taken from the caller because
 * `DisconnectPlan` is the mutation's variables and nothing else — a disconnect
 * does not name what it disconnects from, which is exactly the thing an undo
 * needs.
 */
export function captureDisconnect(connections: readonly ConnectionT[], plan: DisconnectPlan): FlowUndoEntry | null {
  const doomed = connections.find((connection) =>
    plan.kind === 'block'
      ? connection.__typename === 'BlockToBlockConnection' && connection.sourceBlockID === plan.sourceBlockID
      : connection.__typename === 'ComponentToBlockConnection' &&
        connection.sourceBlockElementID === plan.sourceBlockElementID &&
        connection.sourceHandleID === plan.sourceHandleID,
  );
  if (!doomed) return null;

  const back: ConnectPlan =
    doomed.__typename === 'BlockToBlockConnection'
      ? {
          kind: 'block',
          request: { sourceBlockID: doomed.sourceBlockID, targetBlockID: doomed.targetBlockID },
        }
      : {
          kind: 'component',
          request: {
            sourceBlockID: doomed.sourceBlockID,
            sourceBlockElementID: doomed.sourceBlockElementID,
            sourceHandleID: doomed.sourceHandleID,
            targetBlockID: doomed.targetBlockID,
          },
        };

  return {
    kind: 'disconnect',
    undo: { op: 'connect', plan: back },
    redo: { op: 'disconnect', plan, sourceBlockID: doomed.sourceBlockID },
  };
}

/**
 * Moving the starting point, captured from the block that held it.
 *
 * A flow that had no starting point at all cannot be put back: `blockSetStartingPoint`
 * only ever moves one, and there is no mutation that clears it.
 */
export function captureStartingPoint(
  flow: { startingPointBlock?: { id: string } | null } | null,
  blockID: string,
): FlowUndoEntry | null {
  /* No flow, no pre-state. "This flow had no starting point" and "there is no
     flow yet" are different sentences, and only the first is a refusal. */
  if (!flow) return null;
  const previous = flow.startingPointBlock?.id ?? null;
  if (previous === blockID) return null;
  if (previous === null) {
    return refused('startingPoint', {
      title: 'The starting point cannot be cleared',
      description:
        'This flow had none before, and the API can only move a starting point — there is no mutation that removes one.',
    });
  }
  return {
    kind: 'startingPoint',
    undo: { op: 'startingPoint', blockID: previous },
    redo: { op: 'startingPoint', blockID },
  };
}

/**
 * Toggling an entry point, captured from the block's own flag.
 *
 * The entry is built the same way in both directions, and the asymmetry is the
 * server's rather than this file's: undoing a disable asks to re-enable, and
 * that is refused while the block's elements are invalid. The request is still
 * correct — the transport reports the refusal on the block, as it does for any
 * other rejected write.
 */
export function captureEntryPoint(
  blocks: readonly { id: string; isEntryPointEnabled?: boolean }[],
  blockID: string,
  enabled: boolean,
): FlowUndoEntry | null {
  const block = blocks.find((candidate) => candidate.id === blockID);
  if (!block || block.isEntryPointEnabled === undefined) return null;
  if (block.isEntryPointEnabled === enabled) return null;
  return {
    kind: 'entryPoint',
    undo: { op: 'entryPoint', blockID, enabled: block.isEntryPointEnabled },
    redo: { op: 'entryPoint', blockID, enabled },
  };
}

export function captureDeleteBlock(): FlowUndoEntry {
  return refused('deleteBlock', {
    title: 'A deleted block cannot be brought back',
    description:
      'There is no undelete in this API. Creating the block again would give it a new id, with none of its elements and none of their settings.',
  });
}

export function captureDeleteElement(): FlowUndoEntry {
  return refused('deleteElement', {
    title: 'A deleted card cannot be brought back',
    description:
      'There is no undelete in this API. Adding the card again would give it a new id and an empty copy of what it held.',
  });
}

/**
 * Record an entry, and drop the redo branch.
 *
 * Consecutive refusals of the same kind collapse into one, and that is the
 * multi-delete: it fires `DeleteBlock` per block, so twenty blocks would
 * otherwise leave twenty identical "cannot be undone" entries between the user
 * and the move they actually wanted back.
 */
export function remember(history: FlowHistory, entry: FlowUndoEntry): FlowHistory {
  const top = history.undo[history.undo.length - 1];
  if (top && top.undo === null && entry.undo === null && top.kind === entry.kind) {
    return history.redo.length === 0 ? history : { undo: history.undo, redo: [] };
  }
  const undo = [...history.undo, entry].slice(-HISTORY_DEPTH);
  return { undo, redo: [] };
}

/**
 * The next thing ⌘Z acts on, and the history without it.
 *
 * A refused entry comes back so the caller can say why, and is DROPPED rather
 * than moved to the redo stack: nothing happened, so there is nothing to do
 * again. The press is still spent on it — pressing ⌘Z twice after a delete
 * reaches the operation before the delete, which is what every editor does.
 */
export function takeUndo(history: FlowHistory): { entry: FlowUndoEntry; history: FlowHistory } | null {
  const entry = history.undo[history.undo.length - 1];
  if (!entry) return null;
  const undo = history.undo.slice(0, -1);
  return {
    entry,
    history: entry.undo === null ? { undo, redo: history.redo } : { undo, redo: [...history.redo, entry] },
  };
}

/** The next thing ⇧⌘Z acts on. Everything here is redoable by construction. */
export function takeRedo(history: FlowHistory): { entry: FlowUndoEntry; history: FlowHistory } | null {
  const entry = history.redo[history.redo.length - 1];
  if (!entry) return null;
  return {
    entry,
    history: { undo: [...history.undo, entry], redo: history.redo.slice(0, -1) },
  };
}
