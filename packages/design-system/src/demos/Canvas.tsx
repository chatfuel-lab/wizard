import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  Button,
  Canvas,
  CanvasEdges,
  CanvasHandle,
  CanvasMinimap,
  CanvasNode,
  CanvasPalette,
  CanvasToolbar,
  CanvasZoomControls,
  ContextMenu,
  IconBolt,
  IconCalendar,
  IconExternal,
  IconFile,
  IconFilter,
  IconFlow,
  IconHand,
  IconImage,
  IconLink,
  IconMic,
  IconPlay,
  IconPointer,
  IconSend,
  IconMaximize,
  IconSparkles,
  IconTrash,
  IconUser,
  IconUsers,
  Island,
  Switch,
  Tag,
  useCanvasSelection,
  type CanvasApi,
  type CanvasConnectEnd,
  type CanvasEdgeSpec,
  type CanvasPaletteItem,
} from '~ui';
import { Demo, Note } from './shared';

/**
 * The proving ground for content/ui/src/canvas — and the gate for the flow
 * builder's move onto it.
 *
 * The flow builder swaps `@xyflow/react` for this canvas, and that swap is as
 * risky as a single change gets, so the rule is that every gesture the builder
 * needs has to be demonstrable HERE first, on a scene shaped like the real
 * one. If the demo cannot drag an edge into empty space and report both
 * coordinate systems, the swap does not start.
 *
 * The ten things it has to prove. Eight of them are one per piece of xyflow the
 * flow builder actually uses. The last two are the pieces nobody calls, which is
 * exactly why each of them went unnoticed for a whole acceptance round.
 *
 *  1. pan the background; wheel-zoom anchored under the cursor; ⌘+wheel; pinch
 *  2. drag a node with continuous position, and no yank when the graph is
 *     rebuilt from a server response mid-drag — the "rebuild" switch below
 *     replaces the whole node array four times a second
 *  3. drag from a handle onto another node to connect; drag into empty space to
 *     get a dangling edge carrying BOTH the world position (where a new block
 *     would go) and the client position (where a picker would open)
 *  4. click an edge; Delete/Backspace on a selected edge and on a selected node
 *  5. click the background to clear; marquee to select several
 *  6. fit on the button and on first render — including an empty scene and a
 *     scene of one node, which are the two that divide by zero
 *  7. viewport clipping, visible on the rendered-node counter while panning
 *  8. the dot grid scaling with zoom and not drifting against the scene
 *  9. the canvas being NARROWED — the "detail panel" switch. xyflow runs its own
 *     ResizeObserver on its wrapper and writes the result into its store, and
 *     that is what keeps `screenToFlowPosition`, `fitView` and clipping honest
 *     when the inspector opens beside the canvas. Nothing calls it, so nothing
 *     would have missed it; it would simply have been wrong by the width of the
 *     inspector, everywhere, forever.
 * 10. a parent that RE-RENDERS DURING A DRAG — the last switch. Every module
 *     does this constantly; this demo never did, and that one difference is why
 *     it passed while the flow builder committed the wrong position on every
 *     single drop. The node's window listeners were keyed on its callback
 *     props, a consumer writes those as inline arrows, so a parent render tore
 *     the listeners down mid-gesture and the cleanup cancelled the pending
 *     animation frame the committed position was read back from.
 */

interface DemoNode {
  id: string;
  x: number;
  y: number;
  title: string;
  kind: 'trigger' | 'action';
  outlets: string[];
  /** Which palette family it came from, for the glyph. */
  block?: string;
}

const COLUMNS = 5;
const ROWS = 4;
const COLUMN_WIDTH = 300;
const ROW_HEIGHT = 190;

function buildScene(): { nodes: DemoNode[]; edges: CanvasEdgeSpec[] } {
  const nodes: DemoNode[] = [];
  const edges: CanvasEdgeSpec[] = [];

  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const id = `n${column}-${row}`;
      nodes.push({
        id,
        x: column * COLUMN_WIDTH,
        y: row * ROW_HEIGHT,
        title: column === 0 ? `Entry ${row + 1}` : `Step ${column}.${row + 1}`,
        kind: column === 0 ? 'trigger' : 'action',
        outlets: column % 2 === 0 ? ['yes', 'no'] : ['next'],
      });
      if (column > 0) {
        const source = `n${column - 1}-${row}`;
        edges.push({
          id: `${source}->${id}`,
          source,
          sourceHandle: column % 2 === 0 ? 'next' : 'yes',
          target: id,
          label: column === 2 ? 'matched' : undefined,
        });
      }
    }
  }

  /* One edge that runs backwards, because a backward edge is the case an
     orthogonal router gets wrong: the midpoint is behind the source, so a naive
     route draws a straight line through both blocks. */
  edges.push({
    id: 'loop',
    source: 'n4-3',
    sourceHandle: 'next',
    target: 'n1-0',
    label: 'retry',
    tone: 'muted',
  });

  return { nodes, edges };
}

/**
 * The real thing, near enough: `flow-builder/lib/blockPlugins.ts` ships
 * twenty-six families, grouped by platform, with the entry-point ones flagged.
 * A palette demoed on four toy items proves nothing — the whole question is
 * whether twenty-six named blocks are findable, and they are only findable if
 * there are twenty-six of them.
 */
const BLOCKS: CanvasPaletteItem[] = [
  { id: 'widgetTextAndButtons', label: 'Text + buttons', group: 'Widget', icon: IconSend, keywords: ['widget'] },
  { id: 'widgetImage', label: 'Image', group: 'Widget', icon: IconImage, keywords: ['widget'] },
  {
    id: 'widgetSwitchToHuman',
    label: 'Human agent',
    group: 'Widget',
    icon: IconUser,
    keywords: ['widget', 'operator', 'live chat'],
  },
  {
    id: 'widgetEntryPoint',
    label: 'Entry point',
    group: 'Widget',
    icon: IconBolt,
    note: 'entry',
    keywords: ['widget', 'trigger', 'start'],
  },

  { id: 'whatsAppText', label: 'Text', group: 'WhatsApp', icon: IconSend, keywords: ['whatsapp', 'wa'] },
  { id: 'whatsAppImage', label: 'Image', group: 'WhatsApp', icon: IconImage, keywords: ['whatsapp', 'wa'] },
  { id: 'whatsAppVideo', label: 'Video', group: 'WhatsApp', icon: IconPlay, keywords: ['whatsapp', 'wa'] },
  { id: 'whatsAppAudio', label: 'Audio', group: 'WhatsApp', icon: IconMic, keywords: ['whatsapp', 'wa', 'voice'] },
  {
    id: 'whatsAppDocument',
    label: 'Document',
    group: 'WhatsApp',
    icon: IconFile,
    keywords: ['whatsapp', 'wa', 'file', 'pdf'],
  },
  {
    id: 'whatsAppTextAndButtons',
    label: 'Text + buttons',
    group: 'WhatsApp',
    icon: IconSend,
    keywords: ['whatsapp', 'wa'],
  },
  {
    id: 'whatsAppTextAndURL',
    label: 'Text + URL',
    group: 'WhatsApp',
    icon: IconLink,
    keywords: ['whatsapp', 'wa', 'link'],
  },
  { id: 'whatsAppList', label: 'List', group: 'WhatsApp', icon: IconFilter, keywords: ['whatsapp', 'wa', 'menu'] },
  { id: 'whatsAppTemplate', label: 'Template', group: 'WhatsApp', icon: IconFile, keywords: ['whatsapp', 'wa', 'hsm'] },
  {
    id: 'whatsAppSwitchToHuman',
    label: 'Human agent',
    group: 'WhatsApp',
    icon: IconUser,
    keywords: ['whatsapp', 'wa', 'operator'],
  },
  {
    id: 'triggeredMessage',
    label: 'Triggered message',
    group: 'WhatsApp',
    icon: IconBolt,
    note: 'entry',
    keywords: ['whatsapp', 'trigger'],
  },
  {
    id: 'whatsAppOneTimeNotification',
    label: 'One-time broadcast',
    group: 'WhatsApp',
    icon: IconUsers,
    note: 'entry',
    keywords: ['whatsapp', 'otn'],
  },
  {
    id: 'whatsAppScheduledMessage',
    label: 'Scheduled message',
    group: 'WhatsApp',
    icon: IconCalendar,
    note: 'entry',
    keywords: ['whatsapp', 'cron'],
  },

  {
    id: 'instagramSwitchToHuman',
    label: 'Human agent',
    group: 'Instagram',
    icon: IconUser,
    keywords: ['instagram', 'ig'],
  },
  { id: 'tiktokSwitchToHuman', label: 'Human agent', group: 'TikTok', icon: IconUser, keywords: ['tiktok'] },

  { id: 'setCondition', label: 'Condition', group: 'Actions', icon: IconFilter, keywords: ['if', 'branch', 'split'] },
  {
    id: 'setContactProperty',
    label: 'Set contact property',
    group: 'Actions',
    icon: IconUser,
    keywords: ['attribute', 'variable'],
  },
  {
    id: 'clearContactProperty',
    label: 'Clear contact property',
    group: 'Actions',
    icon: IconUser,
    keywords: ['attribute', 'unset'],
  },
  {
    id: 'sendJson',
    label: 'Send JSON',
    group: 'Actions',
    icon: IconExternal,
    keywords: ['http', 'webhook', 'request', 'api'],
  },
  { id: 'summarizeChat', label: 'Summarize chat', group: 'Actions', icon: IconSparkles, keywords: ['ai', 'gpt'] },
  { id: 'redirectToFlow', label: 'Redirect to flow', group: 'Actions', icon: IconFlow, keywords: ['jump', 'goto'] },
  { id: 'aiAgent', label: 'AI agent', group: 'Actions', icon: IconSparkles, keywords: ['fuely', 'gpt', 'assistant'] },
];

const BLOCK_BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));

/* The palette island: `w-56` at `left-3`, so 12 + 224 px of the canvas is
   under chrome, and a fit must not put the first column there. The number is
   passed to the canvas as `fitInset` because the canvas cannot measure its own
   chrome — an island can be anything, anywhere — and the module that placed it
   knows how wide it made it. */
const PALETTE_WIDTH = 224;
const CHROME_GAP = 12;

const TOOLS = [
  { id: 'select' as const, label: 'Select', icon: IconPointer, shortcut: '1' },
  { id: 'pan' as const, label: 'Pan', icon: IconHand, shortcut: '2' },
];

function Glyph({ node }: { node: DemoNode }) {
  const Icon = node.block ? BLOCK_BY_ID.get(node.block)?.icon : undefined;
  if (Icon) return <Icon size={14} />;
  return node.kind === 'trigger' ? (
    <IconBolt size={14} className="text-pipeline-4" />
  ) : (
    <IconFlow size={14} className="text-text-faint" />
  );
}

function NodeBody({
  node,
  selected,
  mounted,
}: {
  node: DemoNode;
  selected: boolean;
  mounted: MutableRefObject<number>;
}) {
  /* The clipping counter. Mounting here rather than in `CanvasNode` measures the
     thing that actually matters: whether the expensive contents rendered, not
     whether a positioned wrapper exists. */
  useEffect(() => {
    mounted.current += 1;
    return () => {
      mounted.current -= 1;
    };
  }, [mounted]);

  return (
    <div
      /* A ring, not just a border colour. Swapping a 1px border from grey to
         indigo is a change nobody can see across a canvas — and it gets worse
         with every notch of zoom-out, because everything in the world layer
         scales with the scene. */
      className={`w-56 rounded-card border bg-surface-raised shadow-raised transition-colors ${
        selected ? 'border-accent ring-2 ring-selection-stroke' : 'border-border'
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-border-subtle px-3 py-2 ${
          selected ? 'bg-accent-soft' : ''
        }`}
      >
        <Glyph node={node} />
        <span className="truncate text-label font-medium text-text">{node.title}</span>
      </div>
      <div className="space-y-1 px-3 py-2">
        {node.outlets.map((outlet) => (
          <div key={outlet} className="flex items-center justify-between gap-2">
            <span className="text-micro text-text-muted">{outlet}</span>
            <CanvasHandle nodeId={node.id} id={outlet} side="right" type="source" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowScene({
  apiRef,
  mounted,
}: {
  apiRef: MutableRefObject<CanvasApi | null>;
  mounted: MutableRefObject<number>;
}) {
  const initial = useMemo(buildScene, []);
  const [nodes, setNodes] = useState(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [dangling, setDangling] = useState<CanvasConnectEnd | null>(null);
  const [rebuild, setRebuild] = useState(false);
  const [guides, setGuides] = useState(true);
  const [armed, setArmed] = useState<string | null>(null);
  /* Point 9. Not chrome — chrome floats OVER the canvas and never changes its
     size. This is a sibling in a flex row, so opening it makes the canvas
     genuinely narrower, which is the only thing that exercises the canvas's own
     ResizeObserver. */
  const [panel, setPanel] = useState(false);
  /* The difference between this demo and the real flow builder, made a switch.
     A parent that re-renders while a node is being dragged is the ordinary case
     in a module — the flow builder re-renders on pointer-down, on selection, on
     every mutation response — and it was the case this demo never produced, so
     it passed while the module lost the drop position on every drag. */
  const [churn, setChurn] = useState(false);
  const [, forceRender] = useState(0);
  /* One menu for every node, opened at a point: right-click with a mouse,
     hold with a finger. Both roads set the same state, which is the shape the
     flow builder's own menu has. */
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const placeBlock = useCallback((blockId: string, at: { x: number; y: number }) => {
    const block = BLOCK_BY_ID.get(blockId);
    if (!block) return;
    setNodes((current) => [
      ...current,
      {
        /* The world point is where the pointer was; the node's origin is its
           top-left, so it lands centred under the cursor rather than hanging
           down and to the right of it. */
        id: `new-${current.length}-${block.id}`,
        x: at.x - 112,
        y: at.y - 20,
        title: block.label,
        kind: block.note === 'entry' ? 'trigger' : 'action',
        outlets: ['next'],
        block: block.id,
      },
    ]);
  }, []);
  const selection = useCanvasSelection();

  /* Point 2. Every 250ms the whole node array is replaced with structurally new
     objects at the same positions — what a server response looks like from the
     canvas's side. Drag a node with this on: it must not jump. */
  useEffect(() => {
    if (!rebuild) return undefined;
    const timer = window.setInterval(() => {
      setNodes((current) => current.map((node) => ({ ...node })));
    }, 250);
    return () => window.clearInterval(timer);
  }, [rebuild]);

  const removeSelected = useCallback(() => {
    if (selectedEdge) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdge));
      setSelectedEdge(null);
      return;
    }
    if (selection.selected.size === 0) return;
    const doomed = selection.selected;
    setNodes((current) => current.filter((node) => !doomed.has(node.id)));
    setEdges((current) => current.filter((edge) => !doomed.has(edge.source) && !doomed.has(edge.target)));
    selection.clear();
  }, [selectedEdge, selection]);

  /* Point 4. Window-level rather than `useHotkeys` only because this is one key
     in a gallery; a module uses `useHotkeys({ rootRef: api.containerRef })`, and
     that is the embed rule — Delete pressed in the host's search box is theirs. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      /* Backspace as well as Delete: on a Mac the key printed `delete` sends
         Backspace, and there is no Delete key at all on a laptop. */
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target?.tagName ?? '')) return;
      if (!apiRef.current?.containerRef.current?.contains(document.activeElement)) return;
      event.preventDefault();
      removeSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [apiRef, removeSelected]);

  /* Selection survives a rebuild but not a deletion, and the primitive answers
     with the SAME set when nothing was dropped — which is what stops this from
     being an infinite loop. */
  useEffect(() => {
    selection.prune(nodes.map((node) => node.id));
  }, [nodes, selection]);

  const dragDelta = useRef({ dx: 0, dy: 0 });

  /* Chrome lives in its own slot, in screen coordinates. Not in `children` —
     that is the transformed layer, and a toolbar that pans with the scene is
     not a toolbar — and not outside `<Canvas>`, which is outside the provider
     every one of these reads. */
  const chrome = (
    <>
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2">
        <CanvasToolbar tools={TOOLS} value={tool} onChange={setTool} orientation="horizontal" />
        <CanvasPalette
          items={BLOCKS}
          onDrop={(id, client) => {
            const at = apiRef.current?.clientToWorld(client);
            if (at) placeBlock(id, at);
          }}
          value={armed}
          onChange={setArmed}
          className="w-56"
          maxHeight={264}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-3">
        <CanvasZoomControls />
      </div>

      {/* The other half of the toolbar split: what is selected, and what can be
          done to it. It exists only while something IS selected, which is why
          it is not merged into the tool strip — a strip that changes height as
          you click around is a strip that never sits still.

          It is also the only way to delete anything on a Mac laptop: the key
          labelled `delete` sends Backspace, there is no Delete key, and a
          canvas whose only destructive affordance is a key some keyboards do
          not have is a canvas with no destructive affordance. */}
      {selection.selected.size > 0 || selectedEdge ? (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
          <Island>
            <span className="px-2 text-micro text-text-muted">
              {selectedEdge
                ? 'Edge selected'
                : `${selection.selected.size} block${selection.selected.size === 1 ? '' : 's'} selected`}
            </span>
            {selection.selected.size > 0 ? (
              <button
                type="button"
                aria-label="Zoom to selection"
                onClick={() => apiRef.current?.fitNodes([...selection.selected], { maxZoom: 1.5 })}
                className="flex size-7 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
              >
                <IconMaximize size={14} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Delete selection"
              onClick={removeSelected}
              className="flex size-7 items-center justify-center rounded-control text-danger transition-colors hover:bg-danger-soft focus-visible:focus-ring"
            >
              <IconTrash size={14} />
            </button>
          </Island>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute bottom-3 right-3">
        <CanvasMinimap nodeClassName={(id) => (selection.isSelected(id) ? 'fill-accent' : undefined)} />
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 w-64">
        <Island orientation="vertical">
          {/* A full-width child rather than `items-stretch` on the Island: two
              `items-*` utilities on one element is a coin toss decided by CSS
              source order, not by which one was written last. */}
          <div className="w-full space-y-1">
            <div className="px-1">
              <Switch checked={rebuild} onChange={setRebuild} label="Rebuild from server" />
            </div>
            <div className="px-1">
              <Switch checked={guides} onChange={setGuides} label="Alignment guides" />
            </div>
            <div className="px-1">
              <Switch checked={panel} onChange={setPanel} label="Detail panel" />
            </div>
            <div className="px-1">
              <Switch checked={churn} onChange={setChurn} label="Re-render on every pointer move" />
            </div>
            <Readout
              nodes={nodes.length}
              mounted={mounted}
              selected={selection.selected.size}
              edge={selectedEdge}
              dangling={dangling}
            />
          </div>
        </Island>
      </div>
    </>
  );

  const selectedNodes = nodes.filter((node) => selection.isSelected(node.id));

  return (
    /* The canvas and the panel are siblings in a row, and the canvas is
       `flex-1 min-w-0` rather than a fixed width. That is the whole point of
       point 9: opening the panel narrows the canvas element itself, and every
       screen-to-world answer the canvas gives — `clientToWorld` for a drop,
       `fitView`'s framing, which nodes clipping keeps — is computed against a
       size only its own ResizeObserver knows. In the flow builder this is the
       inspector, and it is the one thing xyflow was doing for us that nothing
       here proved until now.

       `min-w-0` is load-bearing: a flex item's default `min-width: auto` is its
       content, and the canvas's content is a scene wider than the box, so
       without it the row would grow instead of the canvas shrinking. */
    <div className="flex h-[28rem] gap-3">
      <Canvas
        ref={(api) => {
          apiRef.current = api;
        }}
        /* NOT fitOnMount, deliberately. The scene is 1500x760 world units and the
           box is 448px tall, so a fit lands at about 46% — and at 46% every single
           thing this demo exists to show stops being visible: a selected node's
           outline is half a pixel, and the whole scene is on screen at once so
           clipping never engages. Starting at 100% means a screenful is a
           screenful, which is what the real editor opens to. `fitView` is one
           click away in the zoom controls, and the demo below is where fitting is
           actually under test. */
        defaultViewport={{ x: 40, y: 40, zoom: 1 }}
        /* Every fit — the zoom controls' button, the panel's, "zoom to
           selection" — frames the scene into the canvas minus the palette
           column, so the first block lands beside the island and not under
           it. Left only: the islands on the other sides are small enough that
           the fit's own 48px padding clears them. */
        fitInset={{ left: CHROME_GAP + PALETTE_WIDTH + CHROME_GAP }}
        grid={24}
        guides={guides}
        panOnDrag={tool === 'pan'}
        aria-label="Flow canvas demo"
        chrome={chrome}
        className={`min-w-0 flex-1 rounded-lg border border-border ${armed ? 'cursor-crosshair' : ''}`}
        onBackgroundClick={(event) => {
          /* The keyboard's path in: an armed block lands on the next click.
             Dragging one out of the palette is the pointer's path, and both end
             up here — at the pointer, in world coordinates, never in the middle
             of whatever the viewport happens to be showing. */
          if (armed && apiRef.current) {
            placeBlock(armed, apiRef.current.clientToWorld({ x: event.clientX, y: event.clientY }));
            setArmed(null);
            return;
          }
          selection.clear();
          setSelectedEdge(null);
        }}
        onMarquee={(ids, additive) => {
          selection.marquee(ids, additive);
          setSelectedEdge(null);
        }}
        onConnect={({ source, sourceHandle, target }) => {
          setEdges((current) => [
            ...current.filter((edge) => !(edge.source === source && edge.sourceHandle === sourceHandle)),
            { id: `${source}:${sourceHandle}->${target}`, source, sourceHandle, target },
          ]);
        }}
        onConnectEnd={setDangling}
      >
        <CanvasEdges
          edges={edges.map((edge) => ({ ...edge, selected: edge.id === selectedEdge }))}
          onSelect={(id) => {
            setSelectedEdge(id);
            selection.clear();
          }}
        />
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            id={node.id}
            x={node.x}
            y={node.y}
            selected={selection.isSelected(node.id)}
            onPointerDown={(event, id) => {
              setSelectedEdge(null);
              selection.press(id, event.shiftKey || event.metaKey);
            }}
            onClick={(event, id) => {
              if (!event.shiftKey && !event.metaKey) selection.release(id);
            }}
            onContextMenu={(event, id) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, id });
            }}
            /* The finger's road to the same menu. The primitive times the hold,
               refuses one that becomes a drag, and eats the click that follows
               the lift — the demo only says what to open. */
            onLongPress={(event, id) => setMenu({ x: event.clientX, y: event.clientY, id })}
            onDragStart={() => {
              dragDelta.current = { dx: 0, dy: 0 };
            }}
            onDrag={(id, _position, delta) => {
              /* Point 2, the multi-selection half: the node under the pointer sets
                 its own displacement and the rest of the selection gets the same
                 one, through the same path. */
              const others = [...selection.selected].filter((other) => other !== id);
              if (others.length > 0) apiRef.current?.moveNodes(others, delta);
              dragDelta.current = delta;
              /* Point 10. Every pointer move re-renders this whole component,
                 which recreates the callback props `CanvasNode` is given. If any
                 of its subscriptions depended on those, they would be torn down
                 and rebuilt mid-gesture — and the rebuild used to cancel the
                 pending animation frame, so the position the drag committed came
                 from whichever frame happened to survive. */
              if (churn) forceRender((tick) => tick + 1);
            }}
            onDragEnd={(id, position) => {
              const { dx, dy } = dragDelta.current;
              const others = [...selection.selected].filter((other) => other !== id);
              setNodes((current) =>
                current.map((node) => {
                  if (node.id === id) return { ...node, x: position.x, y: position.y };
                  if (!others.includes(node.id)) return node;
                  return { ...node, x: node.x + dx, y: node.y + dy };
                }),
              );
            }}
          >
            <NodeBody node={node} selected={selection.isSelected(node.id)} mounted={mounted} />
            <CanvasHandle nodeId={node.id} side="left" type="target" className="absolute -left-1 top-4" />
          </CanvasNode>
        ))}
      </Canvas>

      {panel ? (
        <DetailPanel
          nodes={selectedNodes}
          edge={selectedEdge}
          onFit={() => apiRef.current?.fitView({ maxZoom: 1 })}
          onClose={() => setPanel(false)}
        />
      ) : null}

      <ContextMenu
        aria-label="Node actions"
        point={menu}
        onPointChange={(point) => {
          if (point === null) setMenu(null);
        }}
        items={[
          {
            id: 'zoom',
            label: 'Zoom to this block',
            icon: <IconMaximize size={14} />,
            onSelect: () => {
              if (menu) apiRef.current?.fitNodes([menu.id], { maxZoom: 1.5 });
            },
          },
          {
            id: 'delete',
            label: 'Delete block',
            tone: 'danger',
            icon: <IconTrash size={14} />,
            onSelect: () => {
              if (!menu) return;
              const doomed = menu.id;
              setNodes((current) => current.filter((node) => node.id !== doomed));
              setEdges((current) => current.filter((edge) => edge.source !== doomed && edge.target !== doomed));
            },
          },
        ]}
      />
    </div>
  );
}

/**
 * The detail panel — a stand-in for the flow builder's inspector, and the only
 * part of this demo whose job is to NOT be over the canvas.
 *
 * It is deliberately thin. The real inspector dispatches twenty-four block
 * typenames across twenty-one editors and it exists today, on xyflow, working;
 * faking it here would prove nothing about the canvas and quite a lot about my
 * ability to write a form. What this proves is the geometry: a panel of a fixed
 * width takes 288px away from the canvas, and every screen-to-world answer on
 * the other side of that has to change with it.
 *
 * Deliberately NOT `useContainerBand` and deliberately not a `Drawer` below a
 * threshold. A band observer near a canvas oscillates: the inline panel narrows
 * the canvas, the band flips, the panel becomes a drawer, the canvas widens, the
 * band flips back. The module root is the observed element; the canvas is inside
 * it. That rule is written into `FlowCanvas`'s doc comment and this demo is
 * where breaking it would show up.
 */
function DetailPanel({
  nodes,
  edge,
  onFit,
  onClose,
}: {
  nodes: DemoNode[];
  edge: string | null;
  onFit: () => void;
  onClose: () => void;
}) {
  return (
    <Island orientation="vertical" className="w-72 shrink-0 overflow-y-auto">
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-sm font-medium text-text">Details</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {edge ? (
          /* `Line` renders `<dt>`/`<dd>`, so every use of it needs a `<dl>` over
             it — the same wrapper `Readout` puts around its four. */
          <dl className="px-1 text-micro">
            <Line label="Edge">
              <span className="text-text">{edge}</span>
            </Line>
          </dl>
        ) : nodes.length === 0 ? (
          <p className="px-1 text-micro text-text-muted">
            Nothing selected. Open and close this panel and watch <strong>Nodes rendered</strong> change — clipping is
            computed against a viewport that just got 288px narrower.
          </p>
        ) : (
          <div className="space-y-2">
            {nodes.slice(0, 6).map((node) => (
              <div key={node.id} className="rounded-control bg-surface px-2 py-1.5">
                <div className="truncate text-xs font-medium text-text">{node.title}</div>
                <dl className="mt-0.5 space-y-0.5 text-micro">
                  <Line label="id">
                    <span className="text-text">{node.id}</span>
                  </Line>
                  <Line label="at">
                    <span className="tabular-nums text-text">
                      {Math.round(node.x)}, {Math.round(node.y)}
                    </span>
                  </Line>
                  <Line label="outlets">
                    <span className="tabular-nums text-text">{node.outlets.length}</span>
                  </Line>
                </dl>
              </div>
            ))}
            {nodes.length > 6 ? (
              <p className="px-1 text-micro text-text-faint">and {nodes.length - 6} more selected</p>
            ) : null}
          </div>
        )}

        <div className="px-1 pt-1">
          {/* The check that matters: fit AFTER the panel is open must frame the
              scene into the narrowed box, not into the width the canvas had
              when it mounted. */}
          <Button variant="ghost" size="sm" onClick={onFit}>
            Fit to the new width
          </Button>
        </div>
      </div>
    </Island>
  );
}

/**
 * The numbers that make the invisible parts checkable.
 *
 * `mounted` is polled rather than pushed: it is a ref written by every node's
 * mount effect, and turning it into state would mean the counter re-renders the
 * thing it is counting.
 */
function Readout({
  nodes,
  mounted,
  selected,
  edge,
  dangling,
}: {
  nodes: number;
  mounted: MutableRefObject<number>;
  selected: number;
  edge: string | null;
  dangling: CanvasConnectEnd | null;
}) {
  const [rendered, setRendered] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setRendered(mounted.current), 200);
    return () => window.clearInterval(timer);
  }, [mounted]);

  return (
    <dl className="space-y-1 px-1 py-1 text-micro">
      <Line label="Nodes rendered">
        <span className="tabular-nums text-text">
          {rendered} / {nodes}
        </span>
      </Line>
      <Line label="Selected">
        <span className="tabular-nums text-text">{selected}</span>
      </Line>
      <Line label="Edge">
        <span className="truncate text-text">{edge ?? '—'}</span>
      </Line>
      <Line label="Dropped in space">
        {dangling ? (
          <span className="text-text">
            world {Math.round(dangling.position.x)},{Math.round(dangling.position.y)} · client{' '}
            {Math.round(dangling.client.x)},{Math.round(dangling.client.y)}
          </span>
        ) : (
          <span className="text-text-faint">—</span>
        )}
      </Line>
    </dl>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

/** Screen pixels of the two-block scene's canvas that its chrome strip covers. */
const TWO_BLOCK_INSET = 96;

/**
 * The scenes a mount-time fit gets wrong if it is written naively: two that
 * make `fitToBounds` divide by zero, and one that fits before the blocks have
 * a size.
 */
function EdgeCaseCanvas({ scene }: { scene: 'empty' | 'one' | 'two' }) {
  const apiRef = useRef<CanvasApi | null>(null);
  return (
    <div className="relative">
      <Canvas
        ref={(api) => {
          apiRef.current = api;
        }}
        fitOnMount
        fitInset={scene === 'two' ? { left: TWO_BLOCK_INSET } : undefined}
        aria-label={scene === 'empty' ? 'Empty canvas' : scene === 'one' ? 'Single node canvas' : 'Two block canvas'}
        className="h-52 rounded-lg border border-border"
        chrome={
          scene === 'two' ? (
            /* A stand-in for the palette column: the fit has to land the
               scene in what is right of this, not under it. */
            <div
              data-demo-chrome
              className="absolute inset-y-0 left-0 flex items-end border-r border-border bg-surface-sunken p-2 text-micro text-text-faint"
              style={{ width: TWO_BLOCK_INSET }}
            >
              inset
            </div>
          ) : undefined
        }
      >
        {scene === 'empty' ? null : scene === 'one' ? (
          <CanvasNode id="only" x={0} y={0}>
            <div className="w-40 rounded-card border border-border bg-surface-raised px-3 py-2 shadow-raised">
              <span className="text-label text-text">The only node</span>
            </div>
          </CanvasNode>
        ) : (
          /* The live case: two blocks 440 units apart, each 256 wide once
             drawn. Their POSITIONS span 440 and would fit at 1:1; their rects
             span 696 and do not. */
          <>
            <CanvasNode id="first" x={192} y={40}>
              <div className="w-64 rounded-card border border-border bg-surface-raised px-3 py-2 shadow-raised">
                <span className="text-label text-text">First block</span>
              </div>
            </CanvasNode>
            <CanvasNode id="second" x={632} y={40}>
              <div className="w-64 rounded-card border border-border bg-surface-raised px-3 py-2 shadow-raised">
                <span className="text-label text-text">Second block</span>
              </div>
            </CanvasNode>
          </>
        )}
      </Canvas>
      <div className="absolute bottom-2 right-2">
        <Button size="sm" variant="ghost" onClick={() => apiRef.current?.fitView()}>
          Fit
        </Button>
      </div>
    </div>
  );
}

export function CanvasSection() {
  const apiRef = useRef<CanvasApi | null>(null);
  const mounted = useRef(0);

  return (
    <div className="space-y-6">
      <Demo
        name="Flow canvas"
        tokens="Canvas · CanvasNode · CanvasEdges · CanvasHandle · CanvasToolbar · CanvasPalette · CanvasZoomControls · CanvasMinimap"
      >
        <Note>
          Shaped like the flow builder rather than a two-node toy, because this demo is the gate for replacing{' '}
          <code>@xyflow/react</code>: twenty nodes, two outlets each, an edge that runs backwards, and a scene wider
          than the viewport so clipping has something to clip.
          <br />
          <br />
          Wheel zooms under the cursor; ⌘ or ctrl and wheel do too, which is also what a trackpad pinch sends.
          Middle-drag or hold space to pan. Drag the background to marquee, shift to add. Drag an outlet onto another
          node to connect it, or into empty space — the readout then shows both coordinate systems, which is what a
          create-and-connect picker needs. Click an edge and press Delete. Turn on <strong>
            Rebuild from server
          </strong>{' '}
          and drag a node: the whole node array is replaced four times a second and the node under the pointer must not
          move.
          <br />
          <br />
          It opens at 100% and shows about a third of the scene, which is the point: the <strong>
            Nodes rendered
          </strong>{' '}
          counter only means something while most of the graph is off screen. Note that the <strong>Pan</strong> tool
          makes a background drag pan instead of marquee — that is what the tool is for, so switch back to{' '}
          <strong>Select</strong> before testing the marquee. On a touch screen two fingers pinch in <em>either</em>{' '}
          tool: a marquee the first finger had started is dropped the moment the second lands, and both fingers go to
          the viewport (<code>lib/canvasGesture.ts</code>) — whether the second finger lands on the background or on a{' '}
          <em>node</em>: a node asks the canvas before it starts a drag, and a claimed finger neither drags the card nor
          clicks it on the lift. Before this the Select tool answered a pinch with two marquees, and the only way to
          zoom a phone was to force the Pan tool on it.
          <br />
          <br />
          The palette carries the twenty-six block families the flow builder actually ships, grouped by platform.{' '}
          <strong>Drag one onto the canvas</strong> — the gesture that says what also says where, which is the point of
          moving the picker off the header: today's <code>&lt;Select&gt;</code> sits four hundred pixels from the drop
          point, so it has to guess, and it guesses the middle of the viewport. Dropping back onto the palette, onto a
          toolbar, or outside the canvas cancels. Clicking an item instead <em>arms</em> it and the next click on the
          canvas places it — kept because a drag is not reachable from a keyboard and a palette only usable with a
          pointer locks people out of creating anything. Type to search across labels and keywords (<code>wa but</code>,{' '}
          <code>webhook</code>, <code>otn</code>); Escape clears the box, Escape again disarms. The wheel over the
          palette scrolls the palette, not the canvas — chrome is inside the canvas element, so without an exemption the
          canvas's own wheel handler eats it.
          <br />
          <br />
          Right-click a block for its menu; on a touch screen, <strong>hold a finger on it</strong> for half a second
          instead — <code>CanvasNode.onLongPress</code>, timed by the primitive because the browser&apos;s own
          long-press <code>contextmenu</code> is a coin toss between platforms. A hold that starts moving is a drag and
          never fires; a hold that fires makes the lift that follows neither a click on the block nor the native click
          after it, so the menu is not covered by whatever a tap would have opened.
          <br />
          <br />
          Select something and a properties island appears at the bottom with a trash button. That is the other half of
          the toolbar split, and on a Mac laptop it is the only way to delete anything: the key printed{' '}
          <code>delete</code> sends Backspace and there is no Delete key.
          <br />
          <br />
          Press <strong>Fit to content</strong> in the zoom controls: the scene frames itself into the canvas{' '}
          <em>minus the palette column</em> — <code>fitInset</code> is the width the demo made the island, passed in
          because the canvas cannot know what its chrome covers — so the first column of blocks lands beside the palette
          rather than under it. Before this every fit centred the flow on the whole box and the tool island sat over its
          top-left corner.
          <br />
          <br />
          <strong>Detail panel</strong> is the one switch that is not about the canvas looking right — it is about the
          canvas being told it got smaller. The panel is a flex sibling, not chrome, so opening it takes 288px away from
          the canvas element itself. Everything the canvas answers in screen coordinates has to follow:{' '}
          <strong>Nodes rendered</strong> drops because clipping is computed against a narrower viewport,{' '}
          <strong>Fit to the new width</strong> must frame into the box as it is now and not as it was at mount, and a
          node at the right edge must still be grabbable exactly where it is drawn. In the flow builder this panel is
          the inspector, and until now it was xyflow's own ResizeObserver keeping all three honest.
          <br />
          <br />
          <strong>Re-render on every pointer move</strong> is the switch that would have caught the worst bug this
          canvas has had. A module re-renders constantly while you drag — on pointer-down, on selection, on every
          mutation response — and this demo never did, so it passed while the flow builder committed the wrong position
          on <em>every</em> drop: the node put its window listeners in an effect keyed on its callback props, a consumer
          writes those as inline arrows, and so a parent render tore the listeners down mid-gesture and the cleanup
          cancelled the pending animation frame. The committed position was then read back out of the store that frame
          was supposed to write, which meant a stale position, or — if no frame survived at all — the point the drag{' '}
          <em>started</em> from. Turn it on and drag: the node must land where you dropped it, on a long slow drag and
          on a fast flick alike.
        </Note>
        <FlowScene apiRef={apiRef} mounted={mounted} />
      </Demo>

      <Demo name="Fitting nothing, one thing, and two things" tokens="fitToBounds · fitOnMount · readyToFit">
        <Note>
          The two scenes that make a naive fit divide by zero: a bounds of zero width and no bounds at all. An empty
          canvas fits to the identity viewport — 100%, untransformed — rather than to <code>NaN</code>, and a single
          node is centred at a sane zoom instead of magnified to the limit. Both are ordinary on a flow that was created
          a second ago.
          <br />
          <br />
          The third is the one that fits too early. Nodes are content-sized and each reports its size on its own, so
          there is a frame in which the first block has a width and the second is still a point; a fit taken then frames
          the blocks&rsquo; positions, not the blocks — this pair &ldquo;fits at 1:1&rdquo; and the second one hangs off
          the right edge. The mount fit now waits until every node has been measured (<code>readyToFit</code>), then
          fits once and never again. Both blocks land whole, right of the inset strip.
        </Note>
        <div className="grid gap-4 @2xl:grid-cols-3">
          <div className="space-y-2">
            <Tag>Empty scene</Tag>
            <EdgeCaseCanvas scene="empty" />
          </div>
          <div className="space-y-2">
            <Tag>One node</Tag>
            <EdgeCaseCanvas scene="one" />
          </div>
          <div className="space-y-2">
            <Tag>Two blocks, 440 apart</Tag>
            <EdgeCaseCanvas scene="two" />
          </div>
        </div>
      </Demo>
    </div>
  );
}
