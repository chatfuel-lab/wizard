import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Button,
  Dialog,
  IconClock,
  PageHeader,
  Tag,
  bandAtLeast,
  useBand,
  useToast,
  type CanvasApi,
  type FloatingDockSize,
} from '~ui';
import { useFlowStore, type FlowStructureState } from '../hooks/useFlowStore';
import { useFlowTest } from '../hooks/useFlowTest';
import { useMyRole } from '../hooks/useMyRole';
import { deleteSummary } from '../lib/deleteSummary';
import { FIT_PADDING } from '../lib/graph';
import { computeAutoLayout } from '../lib/layout';
import { clampDockSize, dockInset, readDockState, TEST_DOCK_INLINE_FROM, writeDockState } from '../lib/testDock';
import type { DanglingEdge, FlowT } from '../types';
import { CanvasSkeleton } from './CanvasSkeleton';
import { ConnectMenu } from './ConnectMenu';
import { FlowCanvas } from './FlowCanvas';
import { InspectorPanel } from './InspectorPanel';
import { SelectionContext } from './selectionContext';
import { TestDock } from './test/TestDock';

export interface FlowEditorProps {
  flowId: string;
  /** Deep-link block (`?b=`), consumed once on mount. */
  initialBlockId: string | null;
  /** Keeps `?b=` shareable — the app writes it into the module params. */
  onSelectedBlockChange: (blockId: string | null) => void;
}

/**
 * One flow's editing surface: canvas + inspector over useFlowStore.
 * Remounted per flow (key={flowId} upstream), so all selection state here is
 * flow-scoped. No subscriptions exist for flows — the refresh button and
 * reconnect refetch are the only cross-client freshness paths.
 *
 * Selection is NOT held here any more. It lives in the store, beside the flow
 * whose replacement is the only thing that can invalidate it — which retired
 * the effect that used to run after every render, compare the selection against
 * the flow it had just drawn, and set state if they disagreed.
 */
export function FlowEditor({ flowId, initialBlockId, onSelectedBlockChange }: FlowEditorProps) {
  const structure = useFlowStore(flowId);
  const { selection, select } = structure;
  const toast = useToast();
  /** An edge dropped on empty canvas, waiting for the create-connect pick. */
  const [dangling, setDangling] = useState<DanglingEdge | null>(null);
  /** Blocks awaiting delete confirmation (Dialog). Empty means closed. */
  const [deleteCandidates, setDeleteCandidates] = useState<string[]>([]);
  // ConnectMenu opens at the drop point measured inside this element.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  /**
   * The canvas's imperative handle, for the one control in the page header
   * that needs to talk to it: auto-layout (`fitView` afterwards). Adding a
   * block happens on the canvas itself, from the palette, where the gesture
   * that says what also says where — so a plain ref serves the one button
   * without wrapping the whole editor in a context for it.
   */
  const canvasApi = useRef<CanvasApi | null>(null);
  /* The keyboard's scope: header, canvas and inspector as one — see the "one
     root" section in `FlowCanvas`. */
  const editorRef = useRef<HTMLDivElement | null>(null);

  /* The Test dock, and its state on this device.
     Read once at mount and written back whenever it changes: whether the dock
     is open and how big it is are preferences, not routing, and the address bar
     is the wrong place for a preference — the session behind the dock is this
     reader's own and cannot be shared through a link anyway. The write is an
     effect and not a line inside the state updater, which React is free to run
     twice. */
  const band = useBand();
  const [dock, setDock] = useState(() =>
    readDockState(typeof window === 'undefined' ? undefined : window.localStorage),
  );
  useEffect(() => {
    writeDockState(window.localStorage, dock);
  }, [dock]);
  const setDockOpen = useCallback((open: boolean) => setDock((prev) => ({ ...prev, open })), []);
  const setDockSize = useCallback(
    (size: FloatingDockSize) => setDock((prev) => ({ ...prev, size: clampDockSize(size) })),
    [],
  );

  const role = useMyRole();
  const test = useFlowTest(flowId, structure.flow?.platform ?? '', role.canSend);

  useEffect(() => {
    onSelectedBlockChange(selection?.blockId ?? null);
  }, [selection?.blockId, onSelectedBlockChange]);

  /* The deep link (`?b=`), applied once and only once the flow is here.
     It cannot be an initial value any more: the store refuses a selection that
     points at nothing, and at mount there is no flow to point into. A stale
     link therefore selects nothing rather than selecting a ghost — which is
     what the pruning effect used to clean up a render later. */
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !structure.flow) return;
    /* Against the server's flow, not the device's copy. The block a link names
       is often the newest thing in the flow — made by whoever sent the link —
       and the newest thing is exactly what a snapshot from last week has not
       got; applied against the snapshot it would be pruned as a ghost and
       lost. When the load has failed the snapshot is all there is going to
       be, and a best-effort selection beats none. */
    if (structure.stale && !structure.error) return;
    deepLinked.current = true;
    if (initialBlockId) select({ blockId: initialBlockId, elementId: null });
  }, [structure.flow, structure.stale, structure.error, initialBlockId, select]);

  const selectionValue = useMemo(() => ({ selection, select }), [selection, select]);

  if (structure.loading) return <CanvasSkeleton />;

  if (!structure.flow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-text-muted">{structure.error ?? 'This flow could not be loaded.'}</p>
        <Button variant="secondary" size="sm" onClick={structure.refetch}>
          Retry
        </Button>
      </div>
    );
  }

  const flow = structure.flow;
  const selectedBlock = selection ? flow.blocks.find((b) => b.id === selection.blockId) : undefined;
  const bannerError = structure.actionError ?? structure.error;
  const blocksToDelete = flow.blocks.filter((b) => deleteCandidates.includes(b.id));
  /* What the canvas has to know about the dock. Below the band it is a Drawer
     over everything, so as far as the scene is concerned there is no dock. */
  const dockState = !bandAtLeast(band, TEST_DOCK_INLINE_FROM) ? 'none' : dock.open ? 'open' : 'pill';

  /**
   * One `DeleteBlock` at a time, and awaited in turn.
   *
   * There is no bulk delete, so this is N requests either way; the question is
   * whether they overlap. They must not: each one answers with the WHOLE flow,
   * and two in flight means the second reply describes a flow the first delete
   * had not happened to yet, which puts the block back. Sequential also makes a
   * partial failure legible — every refusal lands on its own block's card
   * through `structural`, so what is still on the canvas afterwards is exactly
   * what survived.
   */
  const confirmDelete = async () => {
    const ids = deleteCandidates;
    setDeleteCandidates([]);
    for (const id of ids) await structure.deleteBlock(id);
  };

  /**
   * ⌘Z that cannot do anything says so.
   *
   * The whole reason the history records operations it can never reverse. A
   * fixed toast id, so holding ⌘Z down updates one message rather than stacking
   * four of it; `warning` rather than `danger`, because nothing went wrong —
   * the answer is simply no.
   */
  const undo = () => {
    const entry = structure.undo();
    if (!entry?.refusal) return;
    toast.show({
      id: 'flow-undo-refused',
      tone: 'warning',
      title: entry.refusal.title,
      description: entry.refusal.description,
    });
  };

  return (
    <SelectionContext.Provider value={selectionValue}>
      <div ref={editorRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* The flow IS the page here, so its bar is the PageHeader — there is
            no second module-level header above it to compete with. */}
        <PageHeader
          title={flow.name}
          meta={
            <>
              <Tag>{flow.platform}</Tag>
              {/* The canvas painted from this device's copy and the server has
                  not answered yet. Warning and not danger: nothing is wrong,
                  the picture is simply older than it looks. It goes away on
                  its own the moment the load lands — and it does not appear
                  at all until the load has taken longer than a blink, which
                  is what the animation delay is: a fast network would
                  otherwise flash a warning on every open, and a warning that
                  flashes on every open is one nobody reads on the day it
                  matters. `both` keeps it invisible through the delay. */}
              {structure.stale ? (
                <span
                  role="status"
                  title="Showing this device's last copy while the flow loads"
                  className="animate-fade-in"
                  style={{ animationDelay: '400ms' }}
                >
                  <Tag tone="warning">
                    <IconClock size={11} />
                    <span className="ml-0.5">May be out of date</span>
                  </Tag>
                </span>
              ) : null}
              {structure.inboundLinks.length > 0 ? (
                <span className="text-meta text-text-faint">
                  {structure.inboundLinks.length} inbound link
                  {structure.inboundLinks.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </>
          }
          actions={
            <>
              {/* The shout, not the record. It catches a failure whose block is
                  off-screen and then gets out of the way on a timer; the card
                  itself keeps saying so until the block is written to again. */}
              {bannerError ? <span className="max-w-56 truncate text-meta text-danger">{bannerError}</span> : null}
              <AutoLayoutButton flow={flow} onApply={structure.moveBlocksBulk} canvasApi={canvasApi} />
              <Button variant="ghost" size="sm" onClick={structure.refetch}>
                Refresh
              </Button>
            </>
          }
        />
        <div className="flex min-h-0 flex-1">
          {/* `relative` is load-bearing, and more so since ModuleRoot: it sets
              `container-type: inline-size`, which makes the module a
              containing block for `position: fixed` descendants. ConnectMenu
              sidesteps that entirely by being `absolute` against THIS element
              — the same element whose rect it measures the drop point
              against. Anything genuinely fixed must portal to the body, which
              is what every ~ui floating surface already does. */}
          <div ref={canvasRef} className="relative min-w-0 flex-1">
            <FlowCanvas
              flow={flow}
              apiRef={canvasApi}
              hotkeyRoot={editorRef}
              onMoveBlock={(blockId, x, y) => void structure.moveBlock(blockId, x, y)}
              refetch={structure.refetch}
              onMoveBlocks={structure.moveBlocksBulk}
              onClearSelection={() => select(null)}
              onConnectEdge={(plan) => void structure.connectEdge(plan)}
              onDisconnectEdge={(plan, sourceBlockID) => void structure.disconnectEdge(plan, sourceBlockID)}
              onDanglingEdge={setDangling}
              onRequestDeleteBlocks={setDeleteCandidates}
              onSetStartingPoint={(blockId) => void structure.setStartingPoint(blockId)}
              onUndo={undo}
              onRedo={() => void structure.redo()}
              blockErrors={structure.blockErrors}
              testDock={{
                state: dockState,
                inset: dockInset(dock.size),
                running: test.session !== null,
                toggle: () => setDockOpen(!dock.open),
                restart: test.restart,
              }}
            />
            {dangling ? (
              <ConnectMenu
                flow={flow}
                refetch={structure.refetch}
                dangling={dangling}
                canvasRef={canvasRef}
                onClose={() => setDangling(null)}
              />
            ) : null}
            {/* Outside `<FlowCanvas>` and absolute against this wrapper, the
                way ConnectMenu is: inside the canvas it would sit in the
                scene's own pointer and wheel surface, and a thread that
                zoomed the canvas when it scrolled would be unusable. */}
            <TestDock
              flow={flow}
              test={test}
              open={dock.open}
              onOpenChange={setDockOpen}
              size={dock.size}
              onSizeChange={setDockSize}
              band={band}
              onSelectBlock={(blockId) => select({ blockId, elementId: null })}
            />
          </div>
          {selection && selectedBlock ? (
            <InspectorPanel
              flow={flow}
              block={selectedBlock}
              selection={selection}
              onBlock={structure.applyBlock}
              onPatchBlock={structure.patchBlock}
              onRequestDeleteBlock={(blockId) => setDeleteCandidates([blockId])}
              onDeleteElement={(elementId) => void structure.deleteElement(elementId)}
              onRefetch={structure.refetch}
              onSetStartingPoint={(blockId) => void structure.setStartingPoint(blockId)}
              onSetEntryPoint={structure.setEntryPoint}
            />
          ) : null}
        </div>
      </div>
      <Dialog
        open={blocksToDelete.length > 0}
        onClose={() => setDeleteCandidates([])}
        title={blocksToDelete.length === 1 ? 'Delete block?' : `Delete ${blocksToDelete.length} blocks?`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteCandidates([])}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => void confirmDelete()}>
              {blocksToDelete.length === 1 ? 'Delete block' : `Delete ${blocksToDelete.length} blocks`}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          {deleteSummary(blocksToDelete)}{' '}
          {/* Stated because it is true and because nothing else will say it:
              there is no undelete in this API, and a re-created block is a new
              id with none of the contents. Undo refuses this operation for
              the same reason. */}
          <strong className="font-medium">This cannot be undone.</strong>
        </p>
      </Dialog>
    </SelectionContext.Provider>
  );
}

/**
 * Toolbar auto-layout: pure computeAutoLayout → optimistic bulk move, then fit.
 *
 * The fit has to come after the move and not with it: `computeAutoLayout`
 * usually makes the graph a different shape entirely, and framing the old shape
 * would leave half of it off screen.
 */
function AutoLayoutButton({
  flow,
  onApply,
  canvasApi,
}: {
  flow: FlowT;
  onApply: FlowStructureState['moveBlocksBulk'];
  canvasApi: RefObject<CanvasApi | null>;
}) {
  const [pending, setPending] = useState(false);
  if (flow.blocks.length < 2) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void onApply(computeAutoLayout(flow))
          .then(() => canvasApi.current?.fitView({ padding: FIT_PADDING, maxZoom: 1 }))
          .finally(() => setPending(false));
      }}
    >
      Auto-layout
    </Button>
  );
}
