import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';
import type { BlockT, FlowT, InboundLink, Selection } from '../types';

/**
 * One flow as a pure reducer.
 *
 * Three defects in the hook this replaces, each of which needs a different part
 * of this file, and none of which any gate could see:
 *
 * **A failed move used to roll the WHOLE FLOW back.** `moveBlock` captured the
 * entire previous flow inside its updater and restored all of it if the
 * mutation failed. A rename that landed between the drag starting and the move
 * failing was silently undone with it — the user's own edit, reverted, with no
 * error naming it. `pending` holds a PER-BLOCK patch instead: a failed move
 * restores exactly the block that moved.
 *
 * **Mutations had no stale-response guard at all.** The generation ref guarded
 * refetch and nothing else, so any `applyFlow` from a mutation blindly replaced
 * state. Drag a block, press Refresh, and the move's response — issued first,
 * arriving second — overwrote the newer flow. `epoch` lives in state and every
 * request-shaped action carries the epoch it was issued under, which also makes
 * the rule a thing a test can assert rather than a thing a ref does invisibly.
 *
 * **Selection had nowhere to live.** `FlowEditor` cleaned up dead selections in
 * an effect that ran after every render, comparing against the flow it had just
 * rendered. Selection belongs where the thing it points at is replaced, and
 * that is here — which is also the only way multi-select, undo and a
 * paste can agree about what is selected.
 *
 * **A failure had nowhere to be seen except the page header.** Every rejection
 * became one truncated line at the top of the editor, hundreds of pixels from
 * the block it was about, and four seconds later it was gone. `blockErrors`
 * records the failure against the block it happened to, so the canvas can say
 * it where it happened. The banner stays for the case the block is off-screen:
 * the banner is the shout, this is the record, and they have different
 * lifetimes on purpose — the shout is cleared by a timer, the record by a
 * successful write about that block or by a reload.
 *
 * The reducer never reads the clock and never reads the network. Everything
 * that varies arrives in the action.
 */

/** Everything needed to put one block back, and to keep it where the user put it. */
export interface PendingMove {
  /** Where it was before the drag — the rollback target. */
  from: { positionX: number; positionY: number };
  /**
   * Where the user dropped it. Re-applied over any flow that lands while the
   * move is still in flight, so a concurrent mutation's response does not snap
   * the block back to the position the server still believes in.
   */
  to: { positionX: number; positionY: number };
}

export interface FlowState {
  flow: FlowT | null;
  inboundLinks: InboundLink[];
  loading: boolean;
  error: string | null;
  /** Transient action failures — the shell clears them on a timer. */
  actionError: string | null;
  /**
   * The same failures, kept against the block they happened to, and NOT on a
   * timer: an action that did not land is a thing about that block until
   * something makes it untrue. A successful write about the block clears it, so
   * does a reload, and so does the block ceasing to exist.
   */
  blockErrors: Record<string, string>;
  /** Optimistic moves in flight, by block id. */
  pending: Record<string, PendingMove>;
  /** Bumped by every reload. A response from an older epoch is dropped. */
  epoch: number;
  selection: Selection | null;
  /**
   * The flow on screen came from the device's snapshot and no server response
   * has landed yet. The canvas marks it; the first `loaded` clears it. It stays
   * up through a failed load, because a failed load is exactly when "this may
   * be out of date" is the most useful thing on the page.
   */
  stale: boolean;
}

/** What the device had from last time — see `lib/flowSnapshot`. */
export interface RestoredFlow {
  flow: FlowT;
  inboundLinks: readonly InboundLink[];
}

/**
 * A restored snapshot is the INITIAL state, not an action, and that is the
 * whole safety argument. An action carrying yesterday's flow would be one more
 * response racing the real one, and every guard in this file exists because
 * responses race. The initial state cannot race anything: it is there before
 * the first `reload` bumps the epoch, and the response to that reload replaces
 * it through the same `loaded` path as any other — which is also what makes
 * `stale` unable to stick.
 */
export function initialFlowState(selection: Selection | null = null, restored: RestoredFlow | null = null): FlowState {
  return {
    flow: restored?.flow ?? null,
    inboundLinks: restored ? [...restored.inboundLinks] : [],
    /* Not loading when there is something to show. `reload` will not set it
       back either — it only ever loads when the flow is null — so a snapshot
       is a first paint, and the spinner never follows it. */
    loading: restored === null,
    error: null,
    actionError: null,
    blockErrors: {},
    pending: {},
    epoch: 0,
    selection: pruneSelection(selection, restored?.flow ?? null),
    stale: restored !== null,
  };
}

export type FlowAction =
  /** A full load is starting. Bumps the epoch, which invalidates everything in flight. */
  | { type: 'reload' }
  | { type: 'loaded'; epoch: number; flow: FlowT; inboundLinks: readonly InboundLink[] }
  | { type: 'loadFailed'; epoch: number; message: string }
  /**
   * Drag end. Applied immediately — the canvas drops its own displacement in
   * the same tick, so anything that delays this leaves the block standing at
   * its old coordinates.
   *
   * **No epoch, deliberately, and this is a rule and not an omission.** The
   * epoch exists to drop a STALE RESPONSE: something the server said about a
   * flow that has since been reloaded. A gesture the user just made cannot be
   * stale — it happened now, on the flow that is on the screen. Guarding it
   * bought nothing and risked everything: an epoch that was off by one for any
   * reason silently swallowed the drop, the block sprang back to where it
   * started, and only a refetch revealed that the server had the right position
   * all along. Every user-initiated action in this union is epoch-free for the
   * same reason.
   */
  | { type: 'moveStarted'; blockId: string; positionX: number; positionY: number }
  | { type: 'moveSettled'; epoch: number; blockId: string; positionX: number; positionY: number }
  | { type: 'moveFailed'; epoch: number; blockId: string; message: string }
  /** Auto-layout's optimistic apply. Epoch-free for the same reason as `moveStarted`. */
  | { type: 'bulkMoveStarted'; updates: readonly BlockPositionBulkUpdate[] }
  | {
      type: 'bulkMoveSettled';
      epoch: number;
      blocks: readonly { id: string; positionX: number; positionY: number }[];
    }
  | { type: 'bulkMoveFailed'; epoch: number; blockIds: readonly string[]; message: string }
  /** An element setter answered with its enclosing block (BlockParts). */
  | { type: 'blockApplied'; epoch: number; block: BlockT }
  /**
   * A structural op answered with the whole flow (FlowParts). Lists are REPLACED.
   * `blockId` is the same "who was this about" as on `actionFailed`, and it is
   * here for the symmetry: the op that can blame a block is the op that has to
   * be able to absolve it.
   */
  | { type: 'flowApplied'; epoch: number; flow: FlowT; blockId?: string }
  /** Scalar fields from a thin mutation return — a rename, a settled position. */
  | {
      type: 'blockPatched';
      epoch: number;
      blockId: string;
      patch: Partial<Pick<BlockT, 'name' | 'positionX' | 'positionY'>>;
    }
  /**
   * A structural op was refused. `blockId` names who to say it to — the block
   * being deleted, the source block of a connection — and is absent only when
   * nothing on the canvas owns the failure.
   */
  | { type: 'actionFailed'; epoch: number; message: string; blockId?: string }
  /** The banner's timer. Deliberately leaves `blockErrors` alone. */
  | { type: 'actionErrorCleared' }
  | { type: 'selected'; selection: Selection | null };

/** Replace one block by id. Returns the SAME flow when the id is not there. */
function withBlock(flow: FlowT, block: BlockT): FlowT {
  let found = false;
  const blocks = flow.blocks.map((current) => {
    if (current.id !== block.id) return current;
    found = true;
    return block;
  });
  return found ? { ...flow, blocks } : flow;
}

function patchBlocks(flow: FlowT, positions: ReadonlyMap<string, { positionX: number; positionY: number }>): FlowT {
  if (positions.size === 0) return flow;
  let changed = false;
  const blocks = flow.blocks.map((block) => {
    const at = positions.get(block.id);
    if (!at || (block.positionX === at.positionX && block.positionY === at.positionY)) return block;
    changed = true;
    return { ...block, positionX: at.positionX, positionY: at.positionY } as BlockT;
  });
  return changed ? { ...flow, blocks } : flow;
}

/**
 * Put the optimistic positions back on top of a flow that just arrived.
 *
 * Any response — a rename, a connect, a delete elsewhere — carries the server's
 * idea of every block's position, which for a block still being moved is the
 * OLD one. Without this the block snaps back the moment anything else on the
 * canvas answers, and then jumps forward again when the move settles.
 */
function reapplyPending(flow: FlowT, pending: Record<string, PendingMove>): FlowT {
  const entries = Object.entries(pending);
  if (entries.length === 0) return flow;
  return patchBlocks(flow, new Map(entries.map(([id, move]) => [id, move.to])));
}

/** Blame these blocks for this message. Always a new object — a failure is news. */
function withBlockErrors(
  errors: Record<string, string>,
  ids: Iterable<string>,
  message: string,
): Record<string, string> {
  const next = { ...errors };
  for (const id of ids) next[id] = message;
  return next;
}

/**
 * Forget what these blocks were blamed for.
 *
 * Returns the SAME object when there was nothing to forget, which is the common
 * case: this runs on every settled move and every applied block, and a fresh
 * object each time would re-render every card on the canvas for no news.
 */
function withoutBlockErrors(errors: Record<string, string>, ids: Iterable<string>): Record<string, string> {
  let next: Record<string, string> | null = null;
  for (const id of ids) {
    if ((next ?? errors)[id] === undefined) continue;
    next ??= { ...errors };
    delete next[id];
  }
  return next ?? errors;
}

/** A block that no longer exists cannot be blamed for anything. */
function pruneBlockErrors(errors: Record<string, string>, flow: FlowT): Record<string, string> {
  const blamed = Object.keys(errors);
  if (blamed.length === 0) return errors;
  const alive = new Set(flow.blocks.map((block) => block.id));
  return withoutBlockErrors(
    errors,
    blamed.filter((id) => !alive.has(id)),
  );
}

/**
 * Drop a selection whose target is gone.
 *
 * Returns the SAME selection object when nothing was dropped. That is not a
 * micro-optimisation: this runs on every flow replacement, and a fresh object
 * each time would make any effect keyed on the selection fire forever.
 */
export function pruneSelection(selection: Selection | null, flow: FlowT | null): Selection | null {
  if (!selection || !flow) return selection;
  const block = flow.blocks.find((candidate) => candidate.id === selection.blockId);
  if (!block) return null;
  if (!selection.elementId) return selection;
  const alive = block.blockElements.some((element) => element.id === selection.elementId);
  return alive ? selection : { blockId: selection.blockId, elementId: null };
}

/** A flow landed. One place, so pruning and pending re-application cannot be forgotten. */
function settle(state: FlowState, flow: FlowT): FlowState {
  const next = reapplyPending(flow, state.pending);
  return {
    ...state,
    flow: next,
    selection: pruneSelection(state.selection, next),
    blockErrors: pruneBlockErrors(state.blockErrors, next),
  };
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'reload':
      /* The flow stays on screen. A refetch is a freshness check, not a reason
         to blank the canvas the user is looking at — `loading` is only true
         before the first one has ever landed.

         `pending` is dropped, and it has to be. Bumping the epoch means every
         settle and every failure still in flight will be ignored when it
         arrives, so their entries here would never be cleared by anything —
         and `reapplyPending` would go on forcing those optimistic positions
         over every flow the server sends, for the rest of the session. */
      return {
        ...state,
        epoch: state.epoch + 1,
        pending: {},
        error: null,
        /* A reload re-reads the truth from the server, which is the one thing
           that settles every argument a failed action left open. */
        blockErrors: {},
        loading: state.flow === null,
      };

    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      return {
        ...settle(state, action.flow),
        inboundLinks: [...action.inboundLinks],
        loading: false,
        error: null,
        /* The server has spoken about this flow in this session. Only here:
           a mutation's reconcile is not a load, and a block the server just
           returned inside an otherwise-snapshotted flow does not make the
           rest of the flow current. */
        stale: false,
      };
    }

    case 'loadFailed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };

    case 'moveStarted': {
      if (!state.flow) return state;
      const block = state.flow.blocks.find((candidate) => candidate.id === action.blockId);
      if (!block) return state;
      const to = { positionX: action.positionX, positionY: action.positionY };
      /* The rollback target is where the block was BEFORE this move, and for a
         block already mid-flight that is the first move's `from`, not the
         position it is currently showing. Two drags in a row that both fail
         must land back where the first one started. */
      const held = state.pending[action.blockId];
      return {
        ...state,
        flow: patchBlocks(state.flow, new Map([[action.blockId, to]])),
        /* The retry is in flight. Still showing the last refusal would be
           reporting on a request that has been superseded. */
        blockErrors: withoutBlockErrors(state.blockErrors, [action.blockId]),
        pending: {
          ...state.pending,
          [action.blockId]: {
            from: held?.from ?? { positionX: block.positionX, positionY: block.positionY },
            to,
          },
        },
      };
    }

    case 'moveSettled': {
      if (action.epoch !== state.epoch) return state;
      const pending = { ...state.pending };
      delete pending[action.blockId];
      const blockErrors = withoutBlockErrors(state.blockErrors, [action.blockId]);
      if (!state.flow) return { ...state, pending, blockErrors };
      const at = { positionX: action.positionX, positionY: action.positionY };
      return {
        ...state,
        pending,
        blockErrors,
        flow: patchBlocks(state.flow, new Map([[action.blockId, at]])),
      };
    }

    case 'moveFailed': {
      if (action.epoch !== state.epoch) return state;
      const held = state.pending[action.blockId];
      const pending = { ...state.pending };
      delete pending[action.blockId];
      const flow = state.flow && held ? patchBlocks(state.flow, new Map([[action.blockId, held.from]])) : state.flow;
      /* Only this block moves back. Everything else that landed while the move
         was in flight — a rename, another block's successful move, a new
         connection — is left exactly where it is. */
      return {
        ...state,
        pending,
        flow,
        actionError: action.message,
        blockErrors: withBlockErrors(state.blockErrors, [action.blockId], action.message),
      };
    }

    case 'bulkMoveStarted': {
      if (!state.flow) return state;
      const positions = new Map<string, { positionX: number; positionY: number }>();
      const pending = { ...state.pending };
      for (const update of action.updates) {
        const block = state.flow.blocks.find((candidate) => candidate.id === update.blockID);
        if (!block) continue;
        const to = { positionX: update.positionX, positionY: update.positionY };
        positions.set(update.blockID, to);
        pending[update.blockID] = {
          from: pending[update.blockID]?.from ?? { positionX: block.positionX, positionY: block.positionY },
          to,
        };
      }
      return {
        ...state,
        flow: patchBlocks(state.flow, positions),
        pending,
        blockErrors: withoutBlockErrors(state.blockErrors, positions.keys()),
      };
    }

    case 'bulkMoveSettled': {
      if (action.epoch !== state.epoch) return state;
      const pending = { ...state.pending };
      const positions = new Map<string, { positionX: number; positionY: number }>();
      for (const block of action.blocks) {
        delete pending[block.id];
        positions.set(block.id, { positionX: block.positionX, positionY: block.positionY });
      }
      return {
        ...state,
        pending,
        blockErrors: withoutBlockErrors(state.blockErrors, positions.keys()),
        flow: state.flow ? patchBlocks(state.flow, positions) : state.flow,
      };
    }

    case 'bulkMoveFailed': {
      if (action.epoch !== state.epoch) return state;
      const pending = { ...state.pending };
      const positions = new Map<string, { positionX: number; positionY: number }>();
      for (const id of action.blockIds) {
        const held = pending[id];
        if (held) positions.set(id, held.from);
        delete pending[id];
      }
      return {
        ...state,
        pending,
        flow: state.flow ? patchBlocks(state.flow, positions) : state.flow,
        actionError: action.message,
        /* Every block in the batch, not just the ones that had a position to
           roll back: the request was one request, and it failed for all of
           them. Auto-layout that half-lands is exactly the case where "which
           ones?" is the only question worth answering. */
        blockErrors: withBlockErrors(state.blockErrors, action.blockIds, action.message),
      };
    }

    case 'blockApplied': {
      if (action.epoch !== state.epoch || !state.flow) return state;
      const replaced = withBlock(state.flow, action.block);
      if (replaced === state.flow) return state;
      /* The server just answered about this block, so whatever it last refused
         about it is settled. Cleared BEFORE `settle`, which only prunes blocks
         that are gone. */
      const cleared = { ...state, blockErrors: withoutBlockErrors(state.blockErrors, [action.block.id]) };
      return settle(cleared, replaced);
    }

    case 'flowApplied': {
      if (action.epoch !== state.epoch) return state;
      const cleared = action.blockId
        ? { ...state, blockErrors: withoutBlockErrors(state.blockErrors, [action.blockId]) }
        : state;
      return settle(cleared, action.flow);
    }

    case 'blockPatched': {
      if (action.epoch !== state.epoch || !state.flow) return state;
      let found = false;
      const blocks = state.flow.blocks.map((block) => {
        if (block.id !== action.blockId) return block;
        found = true;
        return { ...block, ...action.patch } as BlockT;
      });
      return found
        ? {
            ...state,
            flow: { ...state.flow, blocks },
            blockErrors: withoutBlockErrors(state.blockErrors, [action.blockId]),
          }
        : state;
    }

    case 'actionFailed': {
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        actionError: action.message,
        blockErrors: action.blockId
          ? withBlockErrors(state.blockErrors, [action.blockId], action.message)
          : state.blockErrors,
      };
    }

    case 'actionErrorCleared':
      return state.actionError === null ? state : { ...state, actionError: null };

    case 'selected': {
      const next = pruneSelection(action.selection, state.flow);
      const same =
        next === state.selection ||
        (next?.blockId === state.selection?.blockId && next?.elementId === state.selection?.elementId);
      return same ? state : { ...state, selection: next };
    }
  }
}
