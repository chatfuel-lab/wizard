import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';
import {
  ActionBar,
  Canvas,
  CanvasEdges,
  CanvasMinimap,
  CanvasNode,
  CanvasToolbar,
  CanvasZoomControls,
  ContextMenu,
  IconHand,
  IconKanban,
  IconLayoutList,
  IconLink,
  IconMaximize,
  IconPlus,
  IconPointer,
  IconTrash,
  ShortcutsDialog,
  bandAtLeast,
  useBand,
  useCanvasSelection,
  useHotkeys,
  type CanvasApi,
  type CanvasEdgeSpec,
  type CanvasTool,
} from '~ui';
import { useCanvasActions } from '../hooks/useCanvasActions';
import { useCanvasCommands } from '../hooks/useCanvasCommands';
import { useCanvasMenu } from '../hooks/useCanvasMenu';
import { usePalettePlacement } from '../hooks/usePalettePlacement';
import { usePlaceBlock } from '../hooks/usePlaceBlock';
import { useProjectedNodes } from '../hooks/useProjectedNodes';
import { outletLabels } from '../lib/edgeLabels';
import { blockErrorCount } from '../lib/elementSummary';
import { TOOL_LABELS, TOOL_SHORTCUT, type FlowTool } from '../lib/flowCommands';
import {
  HOTKEYS,
  ROOT_ONLY_SHORTCUTS,
  SHORTCUT_ROWS,
  SHORTCUT_SECTIONS,
  type FlowShortcutId,
} from '../lib/flowShortcuts';
import {
  BLOCK_SOURCE_HANDLE,
  planConnection,
  planDisconnect,
  toEdges,
  type ConnectPlan,
  type DisconnectPlan,
} from '../lib/graph';
import { moveSelection } from '../lib/moveSelection';
import type { DanglingEdge, FlowT } from '../types';
import { BlockNode } from './BlockNode';
import { BlockPalette, TemplatePromptDialog } from './BlockPalette';
import { FlowCommandPalette } from './FlowCommandPalette';
import { useSelection } from './selectionContext';

/**
 * The world-unit grid, used twice and declared once.
 *
 * The dots the background draws and the step a dragged block snaps to are the
 * same grid or they are worse than no grid at all: a block that lands between
 * two dots every time looks like the snapping is broken rather than like the
 * dots mean something.
 */
const GRID = 24;

/**
 * What the palette island covers on the left, so a fit does not put a block
 * under it: the island's `w-56` (224px) plus the `left-3` gutter it stands off
 * the edge by, plus the same gutter again between it and the scene. Passed as
 * `fitInset`, which the canvas takes as the default for `fitOnMount` and for
 * every fit that does not name its own — the toolbar's, auto-layout's, "zoom to
 * selection". The island is only there from `wide`; below that the palette is
 * a sheet and covers nothing.
 */
const PALETTE_INSET = 224 + 12 * 2;

/** The strip's four tools. `TOOL_SHORTCUT` prints the digit; the letters live in the binding list. */
const TOOL_STRIP: readonly CanvasTool<FlowTool>[] = [
  { id: 'select', label: TOOL_LABELS.select, icon: IconPointer, shortcut: TOOL_SHORTCUT.select },
  { id: 'pan', label: TOOL_LABELS.pan, icon: IconHand, shortcut: TOOL_SHORTCUT.pan },
  { id: 'connect', label: TOOL_LABELS.connect, icon: IconLink, shortcut: TOOL_SHORTCUT.connect },
  { id: 'add', label: TOOL_LABELS.add, icon: IconPlus, shortcut: TOOL_SHORTCUT.add },
];

/** The bindings the window listener takes; the rest resolve on the canvas root — see `ROOT_ONLY_SHORTCUTS`. */
const WINDOW_HOTKEYS = HOTKEYS.filter((binding) => !ROOT_ONLY_SHORTCUTS.includes(binding.id));

export interface FlowCanvasProps {
  flow: FlowT;
  /**
   * Filled with the canvas handle on mount — the canvas's imperative handle,
   * held as a plain ref so the auto-layout button up in the page header's
   * `actions` can reach `fitView` without half the editor sitting inside a
   * context whose only subscriber is one button.
   */
  apiRef: RefObject<CanvasApi | null>;
  /**
   * The element the keyboard shortcuts are scoped to — the whole editor, not
   * the canvas. See "Every key goes through one root" below.
   */
  hotkeyRoot: RefObject<HTMLElement | null>;
  /**
   * useFlowStore's awaitable reload. The palette creates blocks through
   * the slim Create*Block responses, which carry no elements or connections,
   * so the canvas state comes from a full refetch — and Refresh in the ⌘K
   * palette is the same call.
   */
  refetch: () => Promise<void>;
  /** Fired on drag end with the dropped (float) coordinates. */
  onMoveBlock: (blockId: string, x: number, y: number) => void;
  /**
   * Drag end on a multi-selection — one `MoveBlocksBulk` for the whole group.
   * Also align and auto-layout, which are the same request from a different
   * pure function.
   *
   * Not the single move fired N times: the batch is one request that either
   * lands or does not, so a group that half-moved is not a state the canvas can
   * be left in.
   */
  onMoveBlocks: (updates: BlockPositionBulkUpdate[]) => Promise<void>;
  onClearSelection: () => void;
  /** A handle was dragged onto a block — fire ConnectBlocks/ConnectComponent. */
  onConnectEdge: (plan: ConnectPlan) => void;
  /** A selected edge was deleted — fire DisconnectBlocks/DisconnectComponent. */
  onDisconnectEdge: (plan: DisconnectPlan, sourceBlockID?: string) => void;
  /**
   * Actions this canvas asked for and did not get, by block id.
   *
   * The header banner says the same thing, and says it once. This says it on
   * the card, which is the only place it can be read while looking at what it
   * is about — and it survives the banner's four-second timer, because a move
   * that did not save is still not saved on the fifth second.
   */
  blockErrors: Record<string, string>;
  /** A handle was dropped on empty canvas — open the create-and-connect picker. */
  onDanglingEdge: (dangling: DanglingEdge) => void;
  /**
   * Delete/Backspace, or the action bar, with blocks selected — ask for a
   * confirmed delete of all of them. A list rather than an id because the
   * confirmation has to be able to say how many, and because `DeleteBlock` is
   * per-block: the count is the only warning the user gets before N requests.
   */
  onRequestDeleteBlocks: (blockIds: string[]) => void;
  /** The context menu's "Make this the starting point". */
  onSetStartingPoint: (blockId: string) => void;
  /**
   * The Test dock, which lives OUTSIDE this canvas (a sibling of it, absolute
   * against the same wrapper) and yet is the canvas's business twice over: it
   * covers the bottom-right corner, which is where the minimap was, and it
   * covers part of the scene, which is what `fitInset` is for.
   *
   * `state` and not a boolean because there are three of them and each moves
   * something different: `none` leaves the canvas exactly as it was, `pill`
   * lifts the minimap over a collapsed dock, and `open` takes the minimap away
   * — a map you cannot see the canvas around is not a map, which is the same
   * call the compact band already makes about it.
   */
  testDock?: {
    state: 'none' | 'pill' | 'open';
    inset: number;
    running: boolean;
    toggle: () => void;
    restart: () => void;
  };
  /**
   * ⌘Z and ⇧⌘Z.
   *
   * The canvas presses the key and nothing more: the history belongs to the
   * editor, because most of what it records — a connection, a delete, an entry
   * point toggled in the inspector — never passes through here.
   */
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * The canvas: server-authoritative nodes and edges (the `lib/graph` projection)
 * on the design system's own canvas, with its chrome — the tool strip, the
 * block palette, the selection island, the minimap — floating over it.
 *
 * ## No local copy of the graph
 *
 * The `lib/graph` projection is rendered directly — no mirrored node state, no
 * effect merging server truth into a local copy. What makes that safe mid-drag:
 * `CanvasNode` renders at its PROP position plus a live displacement held
 * outside React, so a rebuild from the server moves the prop and the
 * displacement stays where the finger is.
 *
 * Drag end is the other half of the same contract and it is a rule, not a
 * preference: `onMoveBlock` must apply optimistically and synchronously, which
 * `useFlowStore.moveBlock` does. The node drops its displacement in the same
 * tick, so a position that only arrives a round trip later would leave the block
 * standing at its old coordinates for the length of that round trip.
 *
 * ## Dragging a group is dragging one node, twice over
 *
 * The node under the pointer moves itself — the canvas does that, without a
 * render — and reports its total displacement on every frame. Everything else
 * in the selection is moved with the same number through `api.moveNodes`, which
 * writes the same kind of offset the dragged node writes for itself. One
 * mechanism, so a group drags exactly the way a single block does, and the
 * whole gesture still costs no React renders.
 *
 * The commit is the other half: `lib/moveSelection` turns the drop into one
 * position per block and the result goes out as a single `MoveBlocksBulk`. The
 * arithmetic is there and not here because vitest is node-only.
 *
 * ## Tools are a mode on the canvas, not a mode in the module
 *
 * Select is the default and does what it always did. Pan makes a background
 * drag pan instead of marquee (`Canvas` already knows how; `panOnDrag`); blocks
 * still drag, and Space held pans in any tool. Connect is click-then-click:
 * the first block is remembered, the second gets a block-level connection
 * through the very same `onConnectEdge` a handle drag uses — it exists because
 * dragging a six-pixel pip is the one gesture a touch screen cannot do well.
 * Add opens the palette: focuses its search box where the palette is on
 * screen, opens the bottom sheet where it is not.
 *
 * ## The palette says WHAT and the gesture says WHERE
 *
 * A block arrives one of three ways and all three end in `usePlaceBlock`
 * with a world point: dragged out of the palette and released (the pointer's
 * way, and the primary one — the drop point is the position); armed in the
 * palette and clicked onto the canvas (the fallback for a click that never
 * became a drag, and the touch sheet's only way); or armed and Enter, which
 * puts it at the viewport centre (the keyboard's way in). None of them guess.
 *
 * ## Deletions stay server-authoritative
 *
 * Nothing here removes a node or an edge locally. Delete on a selection asks
 * upstream for a confirmed delete; Delete on a selected edge routes its
 * captured parts through `planDisconnect`. Blocks and edges disappear when a
 * mutation's reconciled flow says they have, and not before.
 *
 * ## Two selections, on purpose
 *
 * The canvas selection (this file, `useCanvasSelection`) answers "what does
 * Delete act on" and survives a marquee. The module selection (`selectionContext`,
 * set by `BlockNode` itself) answers "what is the inspector editing" and goes a
 * level finer, down to an element inside a block. A plain click sets both. They
 * are not the same question and merging them would cost the element level.
 *
 * ## Every key goes through one root, and the root is the editor
 *
 * `useHotkeys({ rootRef: hotkeyRoot })` binds the whole of `lib/flowShortcuts`
 * — ⌘K, `?`, `/`, ⌘Z included — to the EDITOR element: header, canvas and
 * inspector together. Focus outside it, and none of them fire: that is the
 * embed rule, and it is what keeps ⌘K in the host application's own search box
 * the host's.
 *
 * Not the canvas element, and this was a bug. `InspectorHost` moves focus into
 * its column the moment it opens, so that Escape can reach it — which means the
 * first click on any block took focus OUT of the canvas, and from then on ⌘Z,
 * Delete and every tool key were silently out of scope until something clicked
 * the background. Undo that only works with the inspector closed is undo that
 * does not work. The inspector is part of this editor; a key pressed there,
 * outside a text field, is a key pressed at the flow. Fields are still fields:
 * `useHotkeys` stands down while typing, and Escape in the column is the
 * column's own handler, which prevents default before the window ever sees it.
 *
 * The one key not in that listener is Enter, and `ROOT_ONLY_SHORTCUTS` says why.
 *
 * ## The ResizeObserver rule
 *
 * `Canvas` runs its own `ResizeObserver` on its own element, which is what keeps
 * `clientToWorld`, `fitView` and viewport clipping honest when the inspector
 * opens beside the canvas and narrows it. Nothing above it notices that change,
 * and that is deliberate: a band observer anywhere near a canvas oscillates —
 * the inline panel narrows the canvas, the band flips, the panel becomes a
 * Drawer, the canvas widens, the band flips back. Nothing in this module may
 * call `useContainerBand` on a canvas element; `useBand()` reads the module root.
 */
export function FlowCanvas({
  flow,
  apiRef,
  hotkeyRoot,
  refetch,
  onMoveBlock,
  onMoveBlocks,
  onClearSelection,
  onConnectEdge,
  onDisconnectEdge,
  onDanglingEdge,
  onRequestDeleteBlocks,
  onSetStartingPoint,
  onUndo,
  onRedo,
  blockErrors,
  testDock,
}: FlowCanvasProps) {
  const nodes = useProjectedNodes(flow.blocks, flow.connections);
  /* Edges need the blocks only for the orphan filter, and a rename that reaches
     here already re-derives `labels` below from the same `flow.blocks` — so
     keying this on both costs nothing the label pass was not already paying,
     and a `blockIds` set stable across renames would be machinery for no
     render saved. */
  const graphEdges = useMemo(() => toEdges(flow.blocks, flow.connections), [flow.blocks, flow.connections]);
  const selection = useCanvasSelection();
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const { selection: inspected, select } = useSelection();
  const band = useBand();

  const [tool, setTool] = useState<FlowTool>('select');
  /** The Connect tool's first click, waiting for its second. */
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [commandMode, setCommandMode] = useState<'commands' | 'blocks' | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* Where the palette lives is a band decision, and a "renders" one — a Drawer
     is a different component from an island, with a focus trap and a scrim.
     Wide and up: the island is always there. Narrow: there is room for it only
     while it is wanted, so the Add tool shows it. Compact: a bottom sheet. */
  const paletteAsSheet = band === 'compact';
  const paletteShown = !paletteAsSheet && (bandAtLeast(band, 'wide') || tool === 'add');

  const placement = usePlaceBlock(flow, refetch);
  const { armed, setArmed, sheetOpen, setSheetOpen, paletteRef, focusPaletteSearch, placeAt } = usePalettePlacement(
    placement,
    setTool,
  );

  /* The two selections, reconciled in the one direction that needs it.
     A click sets both, a marquee sets only the canvas one — but a deep link
     (`?b=`) and the inspector's own "select this block" set only the module
     one, and a highlighted block that is not highlighted on the canvas is a
     block the user cannot find. Nothing flows back the other way: a marquee
     over twenty blocks must not open the inspector on one of them. */
  const inspectedBlock = inspected?.blockId ?? null;
  useEffect(() => {
    if (!inspectedBlock || selection.isSelected(inspectedBlock)) return;
    selection.replace([inspectedBlock]);
  }, [inspectedBlock, selection]);

  /* A block that is gone leaves the selection with it. Without this the action
     bar goes on counting blocks the server has deleted, and Delete on what
     survived a partial multi-delete would re-ask for the ones that already
     went. `prune` returns the SAME set when it dropped nothing, so running it
     after every flow is free and cannot loop. */
  useEffect(() => {
    selection.prune(nodes.map((node) => node.id));
  }, [nodes, selection]);

  /* State as well as the ref, and the reason is `useHotkeys`. Its `rootRef` is
     read when the effect runs, and on the first render `apiRef.current` is still
     null — a ref filling in does not re-run anything. The state makes the
     arrival of the canvas a render, which is the only thing that re-binds the
     keys to it. The callback is stable, so React calls it on mount and unmount
     and not on every render. */
  const [api, setApi] = useState<CanvasApi | null>(null);
  const attach = useCallback(
    (next: CanvasApi | null) => {
      apiRef.current = next;
      setApi(next);
    },
    [apiRef],
  );

  const { viewportCentre, fit, align, autoLayout, goToBlock } = useCanvasActions(
    api,
    selection,
    select,
    flow,
    onMoveBlocks,
  );

  /* Keyed on `flow.blocks`, not on `flow`: every element setter returns a new
     `flow` object, so on the whole flow a button rename would rebuild every
     label on the canvas. */
  const labels = useMemo(() => outletLabels(flow.blocks), [flow.blocks]);

  const edges: CanvasEdgeSpec[] = useMemo(() => {
    const focused = selection.selected;
    return graphEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      target: edge.target,
      label: labels.get(edge.id),
      selected: edge.id === selectedEdge,
      /* Selecting a block traces what it is wired to: everything not touching
         the selection drops back. On a flow of any size this is the difference
         between "there are lines here" and "these are this block's lines".
         With nothing selected nothing is dimmed, because dimming relative to
         nothing is just a quieter canvas. */
      tone: focused.size > 0 && !focused.has(edge.source) && !focused.has(edge.target) ? ('muted' as const) : undefined,
    }));
  }, [graphEdges, labels, selectedEdge, selection.selected]);

  const clearAll = useCallback(() => {
    selection.clear();
    setSelectedEdge(null);
    setConnectFrom(null);
    onClearSelection();
  }, [onClearSelection, selection]);

  /* ── the tools ───────────────────────────────────────────────────────── */

  const chooseTool = useCallback(
    (next: FlowTool) => {
      setTool(next);
      if (next !== 'connect') setConnectFrom(null);
      if (next === 'add') {
        if (paletteAsSheet) setSheetOpen(true);
        /* After the render that shows the island: on the narrow band it does
           not exist until the tool says so. */
        else requestAnimationFrame(focusPaletteSearch);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSheetOpen is usePalettePlacement's useState setter; stable by construction
    [focusPaletteSearch, paletteAsSheet],
  );

  const deleteSelected = useCallback(() => {
    if (selectedEdge) {
      /* The parts, not the id: `planDisconnect` routes to DisconnectBlocks or
         DisconnectComponent from what the edge was built out of, so nothing
         downstream has to parse an id back apart. */
      const data = graphEdges.find((edge) => edge.id === selectedEdge)?.data;
      const plan = planDisconnect(data);
      /* The edge knows its source block on both kinds; the disconnect request
         for a component edge does not carry it, so it is handed over
         separately — a refusal has to land on a card. */
      if (plan) onDisconnectEdge(plan, data?.sourceBlockID);
      setSelectedEdge(null);
      return;
    }
    const selected = [...selection.selected];
    if (selected.length > 0) onRequestDeleteBlocks(selected);
  }, [graphEdges, onDisconnectEdge, onRequestDeleteBlocks, selectedEdge, selection.selected]);

  /* ── ⌘K ──────────────────────────────────────────────────────────────── */

  const { commandContext, commandHandlers } = useCanvasCommands({
    tool,
    flow,
    nodes,
    selection,
    testDock,
    chooseTool,
    fit,
    align,
    deleteSelected,
    clearAll,
    autoLayout,
    refetch,
    onUndo,
    onRedo,
    setShortcutsOpen,
    goToBlock,
  });

  /* ── the context menu ────────────────────────────────────────────────── */

  const { menu, setMenu, menuBlock, menuItems } = useCanvasMenu(
    flow.blocks,
    goToBlock,
    onSetStartingPoint,
    onRequestDeleteBlocks,
    selection,
    setTool,
    setConnectFrom,
  );

  /* ── keys ────────────────────────────────────────────────────────────── */

  useHotkeys<FlowShortcutId>(
    WINDOW_HOTKEYS,
    (hotkey, event) => {
      switch (hotkey) {
        case 'palette':
          setCommandMode('commands');
          return;
        case 'search':
          setCommandMode('blocks');
          return;
        case 'help':
          setShortcutsOpen(true);
          return;
        case 'undo':
          if (event.shiftKey) onRedo();
          else onUndo();
          return;
        case 'selectAll':
          selection.replace(nodes.map((node) => node.id));
          setSelectedEdge(null);
          return;
        case 'clear':
          /* One layer at a time, innermost first: an armed block, then a
             half-made connection, then the selection. One Escape must not undo
             three decisions at once. */
          if (armed) setArmed(null);
          else if (connectFrom) setConnectFrom(null);
          else clearAll();
          return;
        case 'toolSelect':
          chooseTool('select');
          return;
        case 'toolPan':
          chooseTool('pan');
          return;
        case 'toolConnect':
          chooseTool('connect');
          return;
        case 'toolAdd':
          chooseTool('add');
          return;
        case 'fit':
          fit();
          return;
        case 'test':
          testDock?.toggle();
          return;
        case 'delete':
          deleteSelected();
          return;
        case 'place':
          /* Root-only; never reaches this listener. Listed so the switch is
             exhaustive and a new id cannot go unhandled in silence. */
          return;
      }
    },
    {
      rootRef: hotkeyRoot,
      /* Belt AND braces, and the braces are the point. The root rule already
         silences these while focus is inside a portalled surface — but see the
         note in `FlowCommandPalette`: the primitive's focus trap does not
         always move focus in, and a Delete pressed with the shortcuts sheet
         open must not delete the block behind it. */
      enabled:
        commandMode === null && !shortcutsOpen && placement.templatePrompt === null && !sheetOpen && menu === null,
    },
  );

  /* Enter, on the canvas root itself and nowhere else — `ROOT_ONLY_SHORTCUTS`
     says why it is not in the list above. Read through refs so the listener
     binds once per canvas and not once per keystroke's worth of state. */
  const enterRef = useRef({ armed, placeAt, viewportCentre });
  enterRef.current = { armed, placeAt, viewportCentre };
  useEffect(() => {
    const root = api?.containerRef.current;
    if (!root) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.target !== root) return;
      const { armed: held, placeAt: put, viewportCentre: centre } = enterRef.current;
      if (!held) return;
      const at = centre();
      if (!at) return;
      event.preventDefault();
      put(at, held);
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [api]);

  /* ── chrome ──────────────────────────────────────────────────────────── */

  const chrome = (
    <>
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col items-start gap-2">
        <CanvasToolbar tools={TOOL_STRIP} value={tool} onChange={chooseTool} orientation="horizontal" />
        {paletteShown ? (
          <BlockPalette
            flow={flow}
            variant="island"
            armed={armed}
            onArmedChange={setArmed}
            onDrop={(id, client) => {
              if (api) placeAt(api.clientToWorld(client), id);
            }}
            containerRef={paletteRef}
          />
        ) : null}
        {placement.actionError ? (
          <span role="alert" className="max-w-56 truncate text-micro text-danger">
            {placement.actionError}
          </span>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-3">
        <CanvasZoomControls />
      </div>

      {/* In `chrome` because it must not pan with the scene, and inside the
          canvas rather than beside it because an embed occupies one panel
          of somebody else's page — a bar hung off the body would stretch
          across the host's whole window. */}
      <ActionBar
        count={selection.selected.size}
        noun={{ one: 'block', many: 'blocks' }}
        actions={[
          {
            id: 'fit',
            label: 'Zoom to selection',
            icon: <IconMaximize size={14} />,
            onSelect: fit,
          },
          /* Only with two or more: one block has nothing to line up with, and
             a button that does nothing is worse than no button. */
          ...(selection.selected.size >= 2
            ? [
                {
                  id: 'alignLeft',
                  label: 'Align left',
                  icon: <IconLayoutList size={14} />,
                  onSelect: () => align('left'),
                },
                {
                  id: 'alignTop',
                  label: 'Align top',
                  icon: <IconKanban size={14} />,
                  onSelect: () => align('top'),
                },
              ]
            : []),
          {
            id: 'delete',
            label: 'Delete',
            icon: <IconTrash size={14} />,
            tone: 'danger',
            shortcut: ['Delete'],
            onSelect: () => onRequestDeleteBlocks([...selection.selected]),
          },
        ]}
        onClear={clearAll}
      />

      {/* Not on the compact band: a map the size of a third of the screen is
          not a map, it is a second canvas. And not under the Test dock: an
          expanded dock owns this corner outright, a collapsed one lifts the
          map over its pill. */}
      {bandAtLeast(band, 'narrow') && testDock?.state !== 'open' ? (
        <div
          className={`pointer-events-auto absolute right-3 ${testDock?.state === 'pill' ? 'bottom-14' : 'bottom-3'}`}
        >
          <CanvasMinimap
            nodeClassName={(id) => {
              if (selection.isSelected(id)) return 'fill-accent';
              const block = flow.blocks.find((candidate) => candidate.id === id);
              /* Danger for both a broken block and a refused action about it:
                 at minimap scale there is no room for two reds. */
              if ((block && blockErrorCount(block) > 0) || blockErrors[id]) return 'fill-danger';
              return undefined;
            }}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <Canvas
        ref={attach}
        fitOnMount
        fitInset={
          paletteShown || testDock?.state === 'open'
            ? {
                ...(paletteShown ? { left: PALETTE_INSET } : {}),
                ...(testDock?.state === 'open' ? { right: testDock.inset } : {}),
              }
            : undefined
        }
        grid={GRID}
        snapGrid={GRID}
        /* Drawn by the canvas, not by this module: it already knows every node's
           rect and it is the only thing that sees the drag frame by frame. All
           the module does is ask. */
        guides
        /* Only source handles start a connection. Let the left target pip
           start one and the direction of the resulting edge is whichever end
           the user happened to grab first, which for a flow graph is a
           different edge entirely. `CanvasHandle` enforces it by type rather
           than by a mode flag. */
        connectionRadius={24}
        minZoom={0.15}
        /* Pan is the Pan tool's, and only its. A second finger during a marquee
           pinches on any tool now — the canvas drops the marquee and hands the
           gesture to the viewport — so the coarse-pointer override that used to
           force panning on touch is gone with the reason for it. */
        panOnDrag={tool === 'pan'}
        aria-label="Flow canvas"
        className={`size-full ${
          armed || tool === 'connect' ? 'cursor-crosshair' : tool === 'pan' ? 'cursor-grab' : ''
        }`}
        chrome={chrome}
        onBackgroundClick={(event) => {
          /* An armed block lands on the next click, at the pointer, in world
             coordinates — never in the middle of whatever the viewport happens
             to be showing. Dragging one out of the palette is the pointer's
             path and both end here. */
          if (armed && api) {
            placeAt(api.clientToWorld({ x: event.clientX, y: event.clientY }));
            return;
          }
          clearAll();
        }}
        onMarquee={(ids, additive) => {
          selection.marquee(ids, additive);
          setSelectedEdge(null);
        }}
        onConnect={({ source, sourceHandle, target }) => {
          const plan = planConnection(source, sourceHandle, target);
          if (plan) onConnectEdge(plan);
        }}
        onConnectEnd={({ source, sourceHandle, position, client }) => {
          /* Landing on nothing is not a failed connection, it is the second leg of
             the creation triad: the picker opens at `client` and whatever is
             chosen is created at `position`, wired to this source in one atomic
             request. Both coordinate systems are needed and neither can be
             derived from the other after the fact — the viewport may have moved by
             the time the pick lands. */
          onDanglingEdge({ sourceBlockID: source, sourceHandle, position, client });
        }}
      >
        <CanvasEdges
          edges={edges}
          onSelect={(id) => {
            setSelectedEdge(id);
            selection.clear();
          }}
        />
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            id={node.id}
            x={node.position.x}
            y={node.position.y}
            selected={selection.isSelected(node.id)}
            /* `group`, so the card inside can read `data-selected` and
               `data-dragging` off this element with `group-data-*`. Those states
               belong to the canvas and the card only decides how they look. */
            className="group"
            onPointerDown={(event, id) => {
              setSelectedEdge(null);
              selection.press(id, event.shiftKey || event.metaKey);
            }}
            onLongPress={(event, id) => {
              setMenu({ point: { x: event.clientX, y: event.clientY }, blockId: id });
            }}
            onClick={(event, id) => {
              /* Connect: the first click remembers, the second wires. The
                 same `planConnection` and the same `onConnectEdge` a handle
                 drag ends in, so the server sees one kind of request. */
              if (tool === 'connect') {
                if (!connectFrom) {
                  setConnectFrom(id);
                  selection.replace([id]);
                } else if (connectFrom !== id) {
                  const plan = planConnection(connectFrom, BLOCK_SOURCE_HANDLE, id);
                  if (plan) onConnectEdge(plan);
                  setConnectFrom(null);
                }
                return;
              }
              if (!event.shiftKey && !event.metaKey) selection.release(id);
            }}
            onContextMenu={(event, id) => {
              event.preventDefault();
              setMenu({ point: { x: event.clientX, y: event.clientY }, blockId: id });
            }}
            onDrag={(id, _position, delta) => {
              /* A node the selection does not hold was shift-clicked out of it
                 and is being dragged on its own. Carrying the group along would
                 be the opposite of what that gesture asks for. */
              if (!selection.isSelected(id)) return;
              const others = [...selection.selected].filter((other) => other !== id);
              if (others.length > 0) api?.moveNodes(others, delta);
            }}
            /* The same rule the group drag follows, seen from the guides: what
               moves with this node cannot be aligned to, because it always is.
               A node dragged out of the selection (the shift-click case above)
               keeps every neighbour, selected or not — nothing else is moving. */
            guideAgainst={(other) => !(selection.isSelected(node.id) && selection.isSelected(other))}
            onDragEnd={(id, position) => {
              const updates = moveSelection(flow.blocks, selection.selected, id, position);
              const [only] = updates;
              if (!only) return;
              /* One block keeps the single mutation: `MoveBlock` returns just
                 that block, so it costs a fraction of the bulk response and it
                 is the overwhelmingly common case. */
              if (updates.length === 1) onMoveBlock(only.blockID, only.positionX, only.positionY);
              else void onMoveBlocks(updates);
            }}
          >
            <BlockNode
              data={node.data}
              actionError={blockErrors[node.id]}
              /* The Connect tool's first click, shown on the card so the
                 second click knows where the line will come from. */
              connecting={connectFrom === node.id}
            />
          </CanvasNode>
        ))}
      </Canvas>

      {/* Portalled surfaces. They render outside the canvas element and hold
          focus while open, which is exactly what makes every canvas key stand
          down while one is up — see `useHotkeys`'s root rule. */}
      <ContextMenu
        items={menuItems}
        point={menu?.point ?? null}
        onPointChange={(point) => {
          if (!point) setMenu(null);
        }}
        aria-label={menuBlock ? `Actions for ${menuBlock.name}` : 'Block actions'}
      />
      <FlowCommandPalette
        mode={commandMode}
        onClose={() => setCommandMode(null)}
        context={commandContext}
        handlers={commandHandlers}
      />
      {/* Rendered straight from `lib/flowShortcuts.ts`, so the sheet cannot
          drift from the handlers — `flowShortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
      {paletteAsSheet ? (
        <BlockPalette
          flow={flow}
          variant="sheet"
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            /* Closing without picking is changing one's mind about adding. */
            setTool((current) => (current === 'add' && !armed ? 'select' : current));
          }}
          armed={armed}
          onArmedChange={setArmed}
          onDrop={() => undefined}
        />
      ) : null}
      <TemplatePromptDialog
        prompt={placement.templatePrompt}
        pending={placement.pending}
        onChoose={(templateID) => void placement.chooseTemplate(templateID)}
        onDismiss={placement.dismissTemplate}
      />
    </>
  );
}
