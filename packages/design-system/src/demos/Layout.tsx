import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  BAND_INLINE,
  BAND_NARROW,
  BAND_WIDE,
  Badge,
  Button,
  IconColumns,
  IconFilter,
  IconGrip,
  IconInbox,
  IconRefresh,
  IconSearch,
  Input,
  InspectorHost,
  Island,
  ModuleRoot,
  PageBody,
  PageHeader,
  SegmentedControl,
  SplitPane,
  Tabs,
  Toolbar,
  useBand,
} from '~ui';
import { Demo, Note } from './shared';

/**
 * The rig. Everything in this section is inside one of these, because a layout
 * primitive that is only ever seen at one width has not been demonstrated.
 *
 * Resizing the browser would work too, but it would move the gallery's own
 * chrome at the same time and there would be no way to read the container's
 * width — which is the number that matters, and the number a module actually
 * sees. Dragging the handle changes ONE box.
 */
export function ResizableBox({
  children,
  height = 420,
}: {
  children: React.ReactNode;
  /** Pixel height of the box. The default fits a page template; a form wants more. */
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  // The initial width is whatever the layout gives it; read it once so the
  // readout is not empty before the first drag.
  useEffect(() => {
    const node = boxRef.current;
    if (node) setWidth(Math.round(node.getBoundingClientRect().width));
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const node = boxRef.current;
    if (!node) return;
    event.preventDefault();
    drag.current = { startX: event.clientX, startWidth: node.getBoundingClientRect().width };

    const onMove = (move: PointerEvent) => {
      const session = drag.current;
      if (!session || !boxRef.current) return;
      const next = Math.max(320, session.startWidth + (move.clientX - session.startX));
      boxRef.current.style.width = `${next}px`;
      setWidth(Math.round(next));
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // Window listeners, not setPointerCapture: capture is released the instant
    // React re-renders the element holding it, and this one re-renders on every
    // pixel of the drag.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const jump = (to: number) => {
    if (!boxRef.current) return;
    boxRef.current.style.width = `${to}px`;
    setWidth(to);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-meta text-text-faint tabular-nums">container {width ?? '—'}px</span>
        <span className="text-meta text-text-muted">jump to</span>
        {[360, BAND_NARROW, BAND_WIDE, BAND_INLINE].map((stop) => (
          <button
            key={stop}
            type="button"
            onClick={() => jump(stop)}
            className="rounded-chip bg-surface-sunken px-1.5 py-0.5 font-mono text-micro text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
          >
            {stop}
          </button>
        ))}
      </div>
      <div className="flex">
        <div
          ref={boxRef}
          style={{ height }}
          className="flex min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface"
        >
          {children}
        </div>
        <button
          type="button"
          onPointerDown={onPointerDown}
          aria-label="Resize the container"
          className="ml-1 flex w-4 shrink-0 cursor-ew-resize touch-none items-center justify-center rounded-chip text-text-faint hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
        >
          <IconGrip size={14} />
        </button>
      </div>
    </div>
  );
}

/** Reads the band from inside a ModuleRoot — it cannot be read from outside. */
function BandReadout() {
  const band = useBand();
  return <span className="rounded-chip bg-accent-soft px-1.5 py-0.5 font-mono text-micro text-accent">{band}</span>;
}

const CONVERSATIONS = ['Ana Ruiz', 'Priya Nair', 'Tom Baker', 'Lea Fischer', 'Sam Okafor'];

function InboxShape() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showing, setShowing] = useState<'side' | 'detail'>('side');

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-gutter">
        <Input placeholder="Search conversations" aria-label="Search conversations" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {CONVERSATIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setSelected(name);
              setShowing('detail');
            }}
            className={`touch-target flex w-full items-center gap-2 px-gutter py-2 text-left text-body transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
              selected === name ? 'bg-row-selected' : ''
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {name === 'Priya Nair' ? <Badge count={3} /> : null}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ModuleRoot>
      <PageHeader
        title="Inbox"
        meta={<BandReadout />}
        actions={
          <Button variant="ghost" size="sm">
            <IconRefresh size={14} />
          </Button>
        }
      />
      <SplitPane side={list} sideLabel="Conversations" sideWidth="list" showing={showing} onShowingChange={setShowing}>
        <PageBody>
          {selected ? (
            <p className="text-body text-text">Thread with {selected}.</p>
          ) : (
            <p className="text-body text-text-muted">Pick a conversation.</p>
          )}
          <p className="mt-2 text-meta text-text-faint">
            Below the wide band this is one pane with a back control, not two panes squeezed.
          </p>
        </PageBody>
      </SplitPane>
    </ModuleRoot>
  );
}

function BoardShape() {
  const [open, setOpen] = useState(false);

  return (
    <ModuleRoot>
      <PageHeader
        title="Deals"
        meta={<BandReadout />}
        actions={
          <SegmentedControl
            value="board"
            onChange={() => {}}
            options={[
              { value: 'board', label: 'Board' },
              { value: 'table', label: 'Table' },
            ]}
            size="sm"
            aria-label="View"
          />
        }
      />
      <Toolbar>
        <Button variant="ghost" size="sm">
          <IconFilter size={14} /> Filter
        </Button>
        <Button variant="ghost" size="sm">
          <IconColumns size={14} /> Columns
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close panel' : 'Open panel'}
        </Button>
      </Toolbar>
      <div className="flex min-h-0 flex-1">
        <PageBody padded={false}>
          <div className="flex h-full gap-2 overflow-x-auto p-gutter">
            {['New', 'Qualified', 'Proposal', 'Won'].map((stage) => (
              <div key={stage} className="flex w-column shrink-0 flex-col rounded-card bg-surface-sunken p-2">
                <span className="text-label font-medium text-text">{stage}</span>
                <div className="mt-2 h-16 rounded-control bg-surface-raised" />
              </div>
            ))}
          </div>
        </PageBody>
        <InspectorHost open={open} onClose={() => setOpen(false)} title="Deal" width="panel">
          <div className="p-gutter text-body text-text-muted">
            A Drawer below the inline band, an inline column above it. Escape closes both, and focus returns to where it
            was.
          </div>
        </InspectorHost>
      </div>
    </ModuleRoot>
  );
}

function CanvasShape() {
  return (
    <ModuleRoot>
      <PageHeader title="Flow" meta={<BandReadout />} />
      <SplitPane
        side={
          <PageBody>
            <p className="text-body text-text">Flows</p>
            <p className="mt-1 text-meta text-text-muted">Welcome</p>
            <p className="text-meta text-text-muted">FAQ</p>
          </PageBody>
        }
        sideLabel="Flows"
        sideWidth="sidenav"
      >
        <div className="relative min-h-0 flex-1 bg-surface-sunken">
          <div className="absolute bottom-3 left-3">
            <Island>
              <Button variant="ghost" size="sm" aria-label="Search">
                <IconSearch size={14} />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Inbox">
                <IconInbox size={14} />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Columns">
                <IconColumns size={14} />
              </Button>
            </Island>
          </div>
        </div>
      </SplitPane>
    </ModuleRoot>
  );
}

const SHAPE_TABS = [
  { id: 'team', label: 'Team' },
  { id: 'workspace', label: 'Workspace' },
];

function TabbedShape() {
  const [tab, setTab] = useState('team');

  return (
    <ModuleRoot>
      <PageHeader
        title="Account & Team"
        meta={<BandReadout />}
        actions={
          <Button variant="ghost" size="sm">
            <IconRefresh size={14} />
          </Button>
        }
        tabs={<Tabs tabs={SHAPE_TABS} active={tab} onSelect={setTab} />}
      />
      <PageBody measure="form">
        <p className="text-body text-text">
          {tab === 'team' ? 'Members and invites.' : 'Workspace name, token health, bots.'}
        </p>
      </PageBody>
    </ModuleRoot>
  );
}

export function LayoutSection() {
  return (
    <div className="space-y-6">
      <Demo name="Bands" tokens="--container-compact/-wide/-inline · useBand()">
        <Note>
          Drag the handle, or jump to a stop. The chip beside each title is the live band, read from inside the{' '}
          <code>ModuleRoot</code>. Everything here reacts to the CONTAINER's width — the browser window never moves,
          which is the whole point: a module can be 700px wide inside a 2560px screen, and a media query would answer
          the wrong question.
        </Note>
        <ResizableBox>
          <InboxShape />
        </ResizableBox>
      </Demo>

      <Demo name="List + detail" tokens="SplitPane · --width-list">
        <Note>
          Two panes at 900px and up; below that one pane and a back control. That switch is a JS band decision, not a
          container query, because it changes what is in the DOM: CSS can restyle what is rendered but it cannot make a
          back button appear, and hiding the list in CSS would keep mounting and subscribing for rows nobody can see.
        </Note>
        <ResizableBox>
          <InboxShape />
        </ResizableBox>
      </Demo>

      <Demo name="Header + toolbar + panel" tokens="PageHeader · Toolbar · InspectorHost">
        <Note>
          Open the panel and drag across 1280px: it moves between a Drawer and an inline column with the same body.
          Watch the padding step at 900 and 1280 too — no class here is responsive, <code>p-gutter</code> resolves to a
          variable that <code>ModuleRoot</code> re-tunes.
        </Note>
        <ResizableBox>
          <BoardShape />
        </ResizableBox>
      </Demo>

      <Demo name="Side nav + canvas + Island" tokens="SplitPane · Island · --shadow-island">
        <Note>
          <code>Island</code> is the floating surface every canvas toolbar, palette and zoom widget is built from — one
          radius, one elevation, one border, so they read as one family.
        </Note>
        <ResizableBox>
          <CanvasShape />
        </ResizableBox>
      </Demo>

      <Demo name="Header with tabs" tokens="PageHeader tabs · Tabs">
        <Note>
          A tab strip is not a control that sits in a bar, it is a bar: the rule it draws is meant to BE the edge the
          content hangs from. In <code>actions</code> it drew a second line a few pixels above the header's own border.
          The <code>tabs</code> slot gives it a full width row and pulls the header's border up onto the strip's own
          rule, so the active tab's underline straddles one shared line. Narrow the box — the title row wraps, the strip
          does not have to.
        </Note>
        <ResizableBox>
          <TabbedShape />
        </ResizableBox>
      </Demo>
    </div>
  );
}
