import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { errorMessageFor } from '~api';
import {
  ConnectBlocksDocument,
  ConnectComponentDocument,
  DeleteBlockDocument,
  DeleteElementDocument,
  DisableEntryPointDocument,
  DisconnectBlocksDocument,
  DisconnectComponentDocument,
  EnableEntryPointDocument,
  FlowStructureDocument,
  MoveBlockDocument,
  MoveBlocksBulkDocument,
  SetStartingPointDocument,
  type BlockPositionBulkUpdate,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { browserStorage, readSnapshot, snapshotKey, writeSnapshot } from '../lib/flowSnapshot';
import { flowReducer, initialFlowState } from '../lib/flowStore';
import {
  captureConnect,
  captureDeleteBlock,
  captureDeleteElement,
  captureDisconnect,
  captureEntryPoint,
  captureMove,
  captureStartingPoint,
  EMPTY_HISTORY,
  remember,
  takeRedo,
  takeUndo,
  type FlowHistory,
  type FlowRequest,
  type FlowUndoEntry,
} from '../lib/flowUndo';
import type { ConnectPlan, DisconnectPlan } from '../lib/graph';
import { flowScope } from '../lib/flowPrefetch';
import type { BlockT, FlowT, InboundLink, Selection } from '../types';
import { ERROR_FLASH_MS } from './useErrorFlash';

export interface FlowStructureState {
  flow: FlowT | null;
  inboundLinks: InboundLink[];
  loading: boolean;
  error: string | null;
  /** Transient action failures (e.g. a rejected block move) — auto-clears. */
  actionError: string | null;
  /**
   * The same failures by block id, for saying it where it happened. Outlives
   * the banner: cleared by a successful write about that block, or by a reload.
   */
  blockErrors: Record<string, string>;
  /**
   * The flow on screen is the device's copy from last time and the server has
   * not answered yet. Painted first so the canvas is there before the network
   * is; marked so nobody mistakes it for current.
   */
  stale: boolean;
  /** The canvas selection: a block, optionally narrowed to one element card. */
  selection: Selection | null;
  /** Never sets a selection that points at nothing, and prunes itself. */
  select: (selection: Selection | null) => void;
  /**
   * Awaitable full reload: resolves after the fresh flow is applied (or the
   * error recorded) — never rejects. The create recipe (useCreateBlock) awaits
   * it because the slim Create*Block responses carry no elements/connections.
   */
  refetch: () => Promise<void>;
  /**
   * Reconcile from an element-setter response: setters return the enclosing
   * block (BlockParts) with recomputed errors — replace it wholesale.
   */
  applyBlock: (block: BlockT) => void;
  /** Reconcile from a structural-op response: whole-flow replace (FlowParts). */
  applyFlow: (flow: FlowT) => void;
  /** Optimistic drag-end move; per-block rollback on mutation failure. */
  moveBlock: (blockId: string, x: number, y: number) => Promise<void>;
  /**
   * Drag-to-connect drop: ConnectBlocks (block-level "next", an upsert — at
   * most one per source block) or ConnectComponent (element handle). Both
   * return the whole Flow → applyFlow; failures flash actionError.
   */
  connectEdge: (plan: ConnectPlan) => Promise<void>;
  /**
   * Edge deletion: DisconnectBlocks / DisconnectComponent → applyFlow.
   *
   * `sourceBlockID` is who to report a refusal to. It is a second argument
   * rather than a field on the plan because the plan is the mutation's
   * variables and nothing else — a component disconnect sends an element id and
   * a handle id, and the block those belong to is not part of the request.
   */
  disconnectEdge: (plan: DisconnectPlan, sourceBlockID?: string) => Promise<void>;
  /** Patch scalar block fields from thin mutation returns (rename, move). */
  patchBlock: (blockId: string, patch: Partial<Pick<BlockT, 'name' | 'positionX' | 'positionY'>>) => void;
  /** Delete a block (elements + its connections go with it) → applyFlow. */
  deleteBlock: (blockId: string) => Promise<void>;
  /** Delete an element card. blockElementDelete is botID-scoped → applyFlow. */
  deleteElement: (elementId: string) => Promise<void>;
  /** Move the flow's starting point to this block → applyFlow. */
  setStartingPoint: (blockId: string) => Promise<void>;
  /**
   * Toggle an entry point. The server is the authority — enabling fails with
   * ComponentHasValidationErrors / TriggerIsInInvalidState while the block's
   * elements are invalid. THROWS on failure (unlike the other actions) so the
   * ~ui Switch can render the server's message inline under the toggle.
   */
  setEntryPoint: (blockId: string, enabled: boolean) => Promise<void>;
  /** Bulk reposition (auto-layout): optimistic apply, per-block rollback. */
  moveBlocksBulk: (updates: BlockPositionBulkUpdate[]) => Promise<void>;
  /**
   * ⌘Z. Returns the entry it acted on so the caller can say why nothing
   * happened — an entry carrying a `refusal` is one that has no inverse, and a
   * ⌘Z that is silent about that is the failure being fixed. Null means the
   * history is empty, which needs no explanation.
   */
  undo: () => FlowUndoEntry | null;
  /** ⇧⌘Z. Everything on the redo stack is redoable, so this never refuses. */
  redo: () => FlowUndoEntry | null;
}

/**
 * How long a flow has to hold still before it is written to the device. A
 * snapshot is a cache of what was last on screen; a write per keystroke would
 * be a megabyte of JSON per keystroke, and the trailing one is the one that
 * matters. Half a second is long enough to coalesce a burst of reconciles and
 * short enough that a flow switched away from a moment later still made it.
 */
const SNAPSHOT_WRITE_DELAY_MS = 500;

/**
 * One flow, loaded entirely by FlowStructure — the transport shell around
 * `lib/flowStore`.
 *
 * Everything that could be wrong lives in the reducer, because vitest here is
 * node-only with no jsdom and a hook is not something a test can reach. What is
 * left here is the part that genuinely cannot be pure: issuing requests,
 * awaiting them, and a timer.
 *
 * There are NO flow-builder subscriptions (guide.md "Editing") — state
 * reconciles from mutation returns, refetches on transport reconnect, and the
 * editor offers a manual refresh for cross-client freshness.
 *
 * ## The epoch is captured at ISSUE time, not read at arrival time
 *
 * Every action reads `epochRef.current` synchronously, before its `await`, and
 * hands that number to the action it dispatches afterwards. A ref read after
 * the await would give the epoch as it is NOW, which is precisely the value
 * that cannot tell a stale response from a fresh one. Capturing it up front is
 * also what lets these callbacks stay stable across reloads.
 *
 * The one gap, stated rather than hidden: `applyBlock`, `applyFlow` and
 * `patchBlock` are called by the inspector with responses to mutations the
 * inspector issued, and it does not say which epoch those were issued
 * under. They are stamped on arrival, which is exactly the behaviour that
 * existed before this file had epochs at all. Closing it means threading an
 * epoch out through twenty-one editors, and that belongs with the work that
 * touches them.
 *
 * ## The undo history is captured here because the pre-state is only here
 *
 * Every entry is built from the flow as it stands one line before the mutation
 * goes out — which connection an outlet displaced, where a block was before the
 * drag. A moment later that is gone, and no caller has it: the canvas knows
 * where it dropped a block, not where it picked it up. `lib/flowUndo` decides
 * what the inverse of each operation is; this file decides when to ask, and
 * then issues the answer through the very same actions, so a reversal gets the
 * same optimistic apply, rollback and per-block error reporting as the gesture
 * it reverses.
 *
 * ## The device's copy is the initial state, and only ever that
 *
 * The last flow this device saw is read from `localStorage` in the reducer's
 * initialiser — synchronously, before the first render — so the canvas paints
 * from it before the request has been issued. It is never dispatched: an
 * action carrying yesterday's flow would be one more response for the epoch to
 * arbitrate, and the initial state is by construction the one thing that comes
 * before every epoch. `lib/flowSnapshot` decides what is safe to read back; the
 * key carries a fingerprint of the printed `FlowStructure` document, so a
 * fragment that grows a field the card reads gets a fresh key without anyone
 * remembering to bump one. There are no subscriptions in this module, which is
 * exactly what makes a stale first paint safe: nothing else will ever have
 * written to the flow behind this tab's back that a reload would not show.
 *
 * ## The first request may already be in flight
 *
 * The picker starts a `FlowStructure` on hover (`useFlowPrefetch`), and the
 * mount here TAKES that request out of the shared cache instead of issuing a
 * second one. Only the mount: a Refresh, and the reconnect refetch, mean "ask
 * the server now", and a hover from half a minute ago is not that. The taken
 * request runs through the same `loaded`/`loadFailed` path under the same
 * epoch, so nothing downstream can tell the difference.
 */
export function useFlowStore(flowId: string): FlowStructureState {
  const { client, botId, flowCache } = useFlowBuilder();

  const scope = useMemo(() => flowScope(botId, flowId), [botId, flowId]);
  const [state, dispatch] = useReducer(flowReducer, scope, (initial) =>
    initialFlowState(null, readSnapshot(browserStorage(), initial)),
  );

  /* Written back after the flow holds still, and never while it is still the
     device's own copy — a snapshot re-saved from a snapshot would refresh its
     timestamp and say nothing new. `state.flow` here includes optimistic
     positions, which is fine: a move that fails rolls back and is rewritten. */
  const { flow: shownFlow, inboundLinks: shownLinks, stale } = state;
  useEffect(() => {
    if (stale || !shownFlow) return undefined;
    const timer = setTimeout(() => {
      writeSnapshot(browserStorage(), scope, {
        flow: shownFlow,
        inboundLinks: shownLinks,
        savedAt: Date.now(),
      });
    }, SNAPSHOT_WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shownFlow, shownLinks, stale, scope]);

  const epochRef = useRef(state.epoch);
  epochRef.current = state.epoch;

  /* The flow as it is RIGHT NOW, for the undo capture. Every entry is built
     from the state before its own mutation, and reading that from `state.flow`
     directly would put it in each callback's dependency list — which would
     rebuild all of them on every keystroke in the inspector. The same trick
     `epochRef` already plays, for the same reason. */
  const flowRef = useRef(state.flow);
  flowRef.current = state.flow;

  /* A ref and not state, because nothing renders from it. Undo is reached by a
     keystroke and answers by issuing a mutation; there is no button whose
     enabled-ness depends on the stack depth. As state it would re-render the
     editor — canvas included — on every operation, to show the same picture. */
  const historyRef = useRef<FlowHistory>(EMPTY_HISTORY);

  /**
   * True while an undo or a redo is issuing its request.
   *
   * Undo does not have its own transport: it calls the same actions the canvas
   * calls, which is what keeps the optimistic apply, the per-block rollback and
   * the error reporting identical for a reversal and for the gesture it
   * reverses. The cost is that those actions would record the reversal as a new
   * operation, and ⌘Z would then bounce between two positions forever. The flag
   * is read synchronously, before any await, on the same tick it is set.
   */
  const replaying = useRef(false);

  const record = useCallback((entry: FlowUndoEntry | null) => {
    if (!entry || replaying.current) return;
    historyRef.current = remember(historyRef.current, entry);
  }, []);

  /* Cleared on a timer rather than by the reducer, because "four seconds from
     now" is not something a pure function can know. The reducer owns whether
     there IS an error; this owns how long it is shown — the cleanup cancels
     the countdown on unmount and re-running the effect restarts it when a
     second failure replaces the first. Not `useErrorFlash`: the error lives in
     the reducer here, so only the shared duration is borrowed. */
  useEffect(() => {
    if (!state.actionError) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'actionErrorCleared' }), ERROR_FLASH_MS);
    return () => clearTimeout(timer);
  }, [state.actionError]);

  const load = useCallback(
    (source: 'network' | 'prefetched') => {
      dispatch({ type: 'reload' });
      /* One past the current value: `reload` increments, and this runs before
         React has re-rendered with the result. */
      const epoch = epochRef.current + 1;
      epochRef.current = epoch;
      const request =
        (source === 'prefetched' ? flowCache.take(snapshotKey(scope)) : null) ??
        client.query(FlowStructureDocument, { botID: botId, flowID: flowId });
      return request
        .then((data) => {
          const { inboundLinks, ...flow } = data.bot.flow;
          dispatch({ type: 'loaded', epoch, flow, inboundLinks });
        })
        .catch((err) => {
          dispatch({
            type: 'loadFailed',
            epoch,
            message: errorMessageFor(err, {}),
          });
        });
    },
    [client, botId, flowId, flowCache, scope],
  );

  /* Refresh and reconnect both mean the server, now. */
  const refetch = useCallback(() => load('network'), [load]);

  useEffect(() => {
    void load('prefetched');
    return client.onReconnect(() => void load('network'));
  }, [client, load]);

  const message = (err: unknown) => errorMessageFor(err, {});

  const applyBlock = useCallback((block: BlockT) => {
    dispatch({ type: 'blockApplied', epoch: epochRef.current, block });
  }, []);

  const applyFlow = useCallback((flow: FlowT) => {
    dispatch({ type: 'flowApplied', epoch: epochRef.current, flow });
  }, []);

  const patchBlock = useCallback(
    (blockId: string, patch: Partial<Pick<BlockT, 'name' | 'positionX' | 'positionY'>>) => {
      dispatch({ type: 'blockPatched', epoch: epochRef.current, blockId, patch });
    },
    [],
  );

  const select = useCallback((selection: Selection | null) => {
    dispatch({ type: 'selected', selection });
  }, []);

  const moveBlock = useCallback(
    async (blockId: string, x: number, y: number) => {
      // Positions are server-stored Int!s — round before sending.
      const positionX = Math.round(x);
      const positionY = Math.round(y);
      const epoch = epochRef.current;
      /* Before the dispatch, which is what makes it the position the block was
         at rather than the one it is going to. */
      record(captureMove(flowRef.current?.blocks ?? [], [{ blockID: blockId, positionX, positionY }]));
      /* No epoch: this is the user's own gesture, not a response, and an
         optimistic apply that can be dropped is an optimistic apply that
         sometimes is not one. */
      dispatch({ type: 'moveStarted', blockId, positionX, positionY });
      try {
        const data = await client.mutate(MoveBlockDocument, {
          flowID: flowId,
          blockID: blockId,
          x: positionX,
          y: positionY,
        });
        const moved = data.updateBlockPosition;
        dispatch({
          type: 'moveSettled',
          epoch,
          blockId,
          positionX: moved?.positionX ?? positionX,
          positionY: moved?.positionY ?? positionY,
        });
      } catch (err) {
        dispatch({ type: 'moveFailed', epoch, blockId, message: message(err) });
      }
    },
    [client, flowId, record],
  );

  const moveBlocksBulk = useCallback(
    async (updates: BlockPositionBulkUpdate[]) => {
      if (updates.length === 0) return;
      const epoch = epochRef.current;
      record(captureMove(flowRef.current?.blocks ?? [], updates));
      dispatch({ type: 'bulkMoveStarted', updates });
      try {
        const data = await client.mutate(MoveBlocksBulkDocument, { flowID: flowId, update: updates });
        const moved = data.updateBlockPositionBulk;
        dispatch({
          type: 'bulkMoveSettled',
          epoch,
          blocks:
            moved?.blocks ??
            updates.map((update) => ({
              id: update.blockID,
              positionX: update.positionX,
              positionY: update.positionY,
            })),
        });
      } catch (err) {
        dispatch({
          type: 'bulkMoveFailed',
          epoch,
          blockIds: updates.map((update) => update.blockID),
          message: message(err),
        });
      }
    },
    [client, flowId, record],
  );

  /**
   * Every structural op has the same shape: run it, apply the flow, or flash.
   *
   * `blockId` is which block the op was about, and it rides on both outcomes:
   * a refusal is reported on that block's card, and a success clears whatever
   * was reported there before.
   */
  const structural = useCallback(async (run: () => Promise<FlowT | null | undefined>, blockId?: string) => {
    const epoch = epochRef.current;
    try {
      const flow = await run();
      if (flow) dispatch({ type: 'flowApplied', epoch, flow, blockId });
    } catch (err) {
      // e.g. the server refusing a cycle, or a delete of the starting-point
      // block — its message, verbatim.
      dispatch({ type: 'actionFailed', epoch, message: message(err), blockId });
    }
  }, []);

  const connectEdge = useCallback(
    (plan: ConnectPlan) => {
      /* Read out of the flow BEFORE the upsert lands: both connect mutations
         replace whatever the outlet pointed at, and that target is the only
         thing an undo has to go on. */
      record(captureConnect(flowRef.current?.connections ?? [], plan));
      return structural(async () => {
        if (plan.kind === 'block') {
          const data = await client.mutate(ConnectBlocksDocument, {
            flowID: flowId,
            request: plan.request,
          });
          return data.blockToBlockConnectionCreateOrUpdate;
        }
        const data = await client.mutate(ConnectComponentDocument, {
          flowID: flowId,
          request: plan.request,
        });
        return data.componentToBlockConnectionCreateOrUpdate;
        /* The source block, on both plan kinds: the edge is a thing that leaves
           it, so a refused connection is news about the block the user dragged
           from — not about the one they dropped on. */
      }, plan.request.sourceBlockID);
    },
    [client, flowId, record, structural],
  );

  const disconnectEdge = useCallback(
    (plan: DisconnectPlan, sourceBlockID?: string) => {
      /* The plan is the mutation's variables, and a disconnect does not name
         what it disconnects FROM — so the edge has to be found in the flow
         while it is still there. */
      record(captureDisconnect(flowRef.current?.connections ?? [], plan));
      return structural(
        async () => {
          if (plan.kind === 'block') {
            const data = await client.mutate(DisconnectBlocksDocument, {
              flowID: flowId,
              sourceBlockID: plan.sourceBlockID,
            });
            return data.blockToBlockConnectionDelete;
          }
          const data = await client.mutate(DisconnectComponentDocument, {
            flowID: flowId,
            sourceBlockElementID: plan.sourceBlockElementID,
            sourceHandleID: plan.sourceHandleID,
          });
          return data.componentToBlockConnectionDelete;
        },
        sourceBlockID ?? (plan.kind === 'block' ? plan.sourceBlockID : undefined),
      );
    },
    [client, flowId, record, structural],
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      /* Recorded although it can never be undone. An entry that says why is the
         whole point: a ⌘Z that does nothing and explains nothing is
         indistinguishable from an undo that is broken. */
      record(captureDeleteBlock());
      return structural(async () => {
        const data = await client.mutate(DeleteBlockDocument, { flowID: flowId, blockID: blockId });
        return data.deleteBlock;
      }, blockId);
    },
    [client, flowId, record, structural],
  );

  const deleteElement = useCallback(
    (elementId: string) => {
      record(captureDeleteElement());
      return structural(async () => {
        // The one botID-scoped mutation in the set (not flowID).
        const data = await client.mutate(DeleteElementDocument, { botID: botId, elementID: elementId });
        return data.blockElementDelete;
      });
    },
    [client, botId, record, structural],
  );

  const setStartingPoint = useCallback(
    (blockId: string) => {
      record(captureStartingPoint(flowRef.current, blockId));
      return structural(async () => {
        const data = await client.mutate(SetStartingPointDocument, {
          flowID: flowId,
          blockID: blockId,
        });
        return data.blockSetStartingPoint;
      }, blockId);
    },
    [client, flowId, record, structural],
  );

  const setEntryPoint = useCallback(
    async (blockId: string, enabled: boolean) => {
      // No catch on purpose: the Switch renders the rejection inline.
      const epoch = epochRef.current;
      record(captureEntryPoint(flowRef.current?.blocks ?? [], blockId, enabled));
      if (enabled) {
        const data = await client.mutate(EnableEntryPointDocument, { flowID: flowId, blockID: blockId });
        if (data.blockEnableEntryPoint) {
          dispatch({ type: 'flowApplied', epoch, flow: data.blockEnableEntryPoint });
        }
        return;
      }
      const data = await client.mutate(DisableEntryPointDocument, { flowID: flowId, blockID: blockId });
      if (data.blockDisableEntryPoint) {
        dispatch({ type: 'flowApplied', epoch, flow: data.blockDisableEntryPoint });
      }
    },
    [client, flowId, record],
  );

  /**
   * Issue one compensating request, as the action it already is.
   *
   * `setEntryPoint` is the one that needs a catch here. It throws by design so
   * the inspector's Switch can render the server's refusal under the toggle,
   * and re-enabling an entry point is exactly the reversal the server is
   * entitled to refuse — there is no Switch listening on this path, so the
   * rejection is routed onto the block's own card instead.
   */
  const issue = useCallback(
    (request: FlowRequest) => {
      switch (request.op) {
        case 'move':
          return moveBlocksBulk(request.updates);
        case 'connect':
          return connectEdge(request.plan);
        case 'disconnect':
          return disconnectEdge(request.plan, request.sourceBlockID);
        case 'startingPoint':
          return setStartingPoint(request.blockID);
        case 'entryPoint': {
          const epoch = epochRef.current;
          return setEntryPoint(request.blockID, request.enabled).catch((err) => {
            dispatch({
              type: 'actionFailed',
              epoch,
              message: message(err),
              blockId: request.blockID,
            });
          });
        }
      }
    },
    [connectEdge, disconnectEdge, moveBlocksBulk, setEntryPoint, setStartingPoint],
  );

  /* `replaying` is set and cleared around the ISSUE, not around the await: the
     recording every action does happens synchronously before its first await,
     so this covers it, and holding the flag across the round trip would also
     swallow anything the user did while it was in flight. */
  const replay = useCallback(
    (request: FlowRequest) => {
      replaying.current = true;
      try {
        void issue(request);
      } finally {
        replaying.current = false;
      }
    },
    [issue],
  );

  const undo = useCallback(() => {
    const taken = takeUndo(historyRef.current);
    if (!taken) return null;
    historyRef.current = taken.history;
    if (taken.entry.undo) replay(taken.entry.undo);
    return taken.entry;
  }, [replay]);

  const redo = useCallback(() => {
    const taken = takeRedo(historyRef.current);
    if (!taken?.entry.redo) return null;
    historyRef.current = taken.history;
    replay(taken.entry.redo);
    return taken.entry;
  }, [replay]);

  return useMemo(
    () => ({
      flow: state.flow,
      inboundLinks: state.inboundLinks,
      loading: state.loading,
      error: state.error,
      actionError: state.actionError,
      blockErrors: state.blockErrors,
      stale: state.stale,
      selection: state.selection,
      select,
      refetch,
      applyBlock,
      applyFlow,
      patchBlock,
      moveBlock,
      moveBlocksBulk,
      connectEdge,
      disconnectEdge,
      deleteBlock,
      deleteElement,
      setStartingPoint,
      setEntryPoint,
      undo,
      redo,
    }),
    [
      state,
      select,
      refetch,
      applyBlock,
      applyFlow,
      patchBlock,
      moveBlock,
      moveBlocksBulk,
      connectEdge,
      disconnectEdge,
      deleteBlock,
      deleteElement,
      setStartingPoint,
      setEntryPoint,
      undo,
      redo,
    ],
  );
}
