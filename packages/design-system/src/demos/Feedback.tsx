import { useRef, useState } from 'react';
import {
  ActionBar,
  Avatar,
  BulkProgress,
  Button,
  Dialog,
  Drawer,
  ErrorBoundary,
  IconArrowRight,
  IconDownload,
  IconTrash,
  Tag,
  ToastProvider,
  useToast,
  type BulkFailure,
  type BulkRunStatus,
  type DialogSize,
  type DrawerSide,
} from '~ui';
import { Demo, Note, Row } from './shared';

function ToastDemo() {
  const toast = useToast();
  const [undone, setUndone] = useState(0);

  return (
    <>
      <Note>
        Imperative rather than a controlled array: an undo toast is fired from inside a mutation callback, where there
        is no render to hang a prop off. Hovering the stack pauses the timers rather than restarting them, and reusing
        an id updates a toast in place instead of stacking duplicates — press &ldquo;Retry the same id&rdquo; a few
        times.
      </Note>
      <Row label="tones">
        <Button size="sm" variant="ghost" onClick={() => toast.show({ title: 'Saved' })}>
          info
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast.show({ title: 'Deal moved to Won', tone: 'success' })}>
          success
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            toast.show({
              title: 'Totals cover loaded rows only',
              description: '12 of 21 deals loaded in this column.',
              tone: 'warning',
            })
          }
        >
          warning
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            toast.show({
              title: 'Could not update the stage',
              description: 'The server rejected the change.',
              tone: 'danger',
            })
          }
        >
          danger (sticky)
        </Button>
      </Row>
      <Row label="with action">
        <Button
          size="sm"
          onClick={() =>
            toast.show({
              title: 'Moved Ada Lovelace to Won',
              tone: 'success',
              action: { label: 'Undo', onClick: () => setUndone((n) => n + 1) },
            })
          }
        >
          Undo toast
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toast.show({ id: 'retry', title: 'Retrying…', description: `Attempt ${Date.now() % 100}` })}
        >
          Retry the same id
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast.clear()}>
          Clear
        </Button>
        {undone > 0 ? <Tag tone="accent">undo pressed {undone}×</Tag> : null}
      </Row>
      <Row label="overflow">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            for (let index = 0; index < 6; index += 1) {
              toast.show({ id: `burst-${index}`, title: `Notification ${index + 1}` });
            }
          }}
        >
          Fire six at once (capped at four)
        </Button>
      </Row>
    </>
  );
}

export function FeedbackSection() {
  const [dialogSize, setDialogSize] = useState<DialogSize | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<DrawerSide | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Demo name="Toast" tokens="z-toast · surface-overlay · animate-slide-in-bottom · MAX_TOASTS 4">
        <ToastProvider>
          <ToastDemo />
        </ToastProvider>
      </Demo>

      <Demo name="Dialog" tokens="bg-scrim · animate-scrim-in/out · shadow-modal · inert background">
        <Note>
          The overlay no longer unmounts the moment <code className="font-mono text-micro">open</code> flips false —
          presence holds the tree through an exit phase, and the scrim&apos;s own animation is sized to the slowest
          panel exit so the panel is never cut off mid-slide.
        </Note>
        <Row label="sizes">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Button key={size} variant="ghost" size="sm" onClick={() => setDialogSize(size)}>
              {size}
            </Button>
          ))}
        </Row>
        <Dialog
          open={dialogSize !== null}
          onClose={() => setDialogSize(null)}
          title={`Delete this flow? (${dialogSize ?? ''})`}
          size={dialogSize ?? 'md'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogSize(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialogSize(null)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-muted">
            This cannot be undone. Live conversations will fall back to the default flow. Tab around — focus is trapped,
            and the page behind is inert rather than merely aria-hidden.
          </p>
        </Dialog>
        <Note>
          <code className="font-mono text-micro">width</code> and{' '}
          <code className="font-mono text-micro">maxHeight</code> take a measure where the four sizes are too coarse — a
          column something is written in is as wide as the writing wants.{' '}
          <code className="font-mono text-micro">meta</code> pins an identity to the right of the title,{' '}
          <code className="font-mono text-micro">padded={'{false}'}</code> hands the gutter to a body that draws its own
          regions, and <code className="font-mono text-micro">fullScreen</code> fills the window for the narrowest band.
          The card is as tall as what is in it until the ceiling, and only then does the body scroll under a header and
          a footer that stay put.
        </Note>
        <Row label="measure">
          <Button variant="ghost" size="sm" onClick={() => setComposerOpen(true)}>
            open
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFullOpen(true)}>
            full screen
          </Button>
        </Row>
        <Dialog
          open={composerOpen || fullOpen}
          onClose={() => {
            setComposerOpen(false);
            setFullOpen(false);
          }}
          title="New post"
          width="min(var(--container-composer), calc(100vw - 2rem))"
          maxHeight="calc(100vh - 4rem)"
          fullScreen={fullOpen}
          padded={false}
          meta={
            <span className="flex items-center gap-1.5 text-meta text-text-muted">
              <Avatar name="Northwind Coffee" size={20} shape="square" />
              <span>@northwind.coffee</span>
            </span>
          }
          footer={
            <div className="flex w-full items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setComposerOpen(false);
                  setFullOpen(false);
                }}
              >
                Cancel
              </Button>
              <span className="flex-1" />
              <Button
                variant="primary"
                onClick={() => {
                  setComposerOpen(false);
                  setFullOpen(false);
                }}
              >
                Publish now
              </Button>
            </div>
          }
        >
          <div className="space-y-3 p-5">
            <div className="rounded-card border border-border p-4 text-sm text-text-muted">
              A body that pads itself, so the rules between its regions run edge to edge.
            </div>
            <Row label="Channel">
              <Tag tone="accent">Instagram</Tag>
            </Row>
          </div>
        </Dialog>
      </Demo>

      <Demo name="Drawer" tokens="animate-slide-in-{right,left,bottom} · max-w-drawer">
        <Row label="sides">
          {(['right', 'left', 'bottom'] as const).map((side) => (
            <Button key={side} variant="ghost" size="sm" onClick={() => setDrawerSide(side)}>
              {side}
            </Button>
          ))}
        </Row>
        <Drawer
          open={drawerSide !== null}
          onClose={() => setDrawerSide(null)}
          side={drawerSide ?? 'right'}
          title="Contact details"
          meta={
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-text-muted">
              <Avatar name="Ada Lovelace" size={20} />
              <span className="truncate">@ada</span>
            </span>
          }
          footer={<Button onClick={() => setDrawerSide(null)}>Done</Button>}
        >
          <div className="space-y-3">
            <Row label="Name">
              <span className="text-sm text-text">Ada Lovelace</span>
            </Row>
            <Row label="Channel">
              <Tag tone="accent">WhatsApp</Tag>
            </Row>
          </div>
        </Drawer>
        <Note>
          <code className="font-mono">meta</code> sits beside the title, before the close button: the title says what
          the panel is and stays put, this says which one. <code className="font-mono">scroll={'{false}'}</code> hands
          the scrolling to the children — a body that splits into columns each scrolling on its own must not also slide
          as a whole, or the split rides under the pinned footer and neither column ever reaches its own overflow.
        </Note>
        <Row label="split body">
          <Button variant="ghost" size="sm" onClick={() => setSplitOpen(true)}>
            open
          </Button>
        </Row>
        <Drawer
          open={splitOpen}
          onClose={() => setSplitOpen(false)}
          title="New post"
          width="46rem"
          padded={false}
          scroll={false}
          meta={
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-text-muted">
              <Avatar name="Northwind Coffee" size={20} />
              <span className="truncate">@northwind.coffee</span>
            </span>
          }
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setSplitOpen(false)}>
                Cancel
              </Button>
              <span className="flex-1" />
              <Button variant="primary" onClick={() => setSplitOpen(false)}>
                Publish now
              </Button>
            </div>
          }
        >
          <div className="flex h-full min-h-0">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {Array.from({ length: 30 }, (_, i) => (
                  <p key={i} className="text-sm text-text-muted">
                    A line of the form, number {i + 1}.
                  </p>
                ))}
              </div>
            </div>
            <aside className="min-h-0 w-64 shrink-0 overflow-y-auto border-l border-border bg-surface-sunken p-4">
              <div className="sticky top-0 rounded-card border border-border bg-surface p-3 text-sm text-text-muted">
                A column that scrolls on its own.
              </div>
            </aside>
          </div>
        </Drawer>
      </Demo>

      <BulkProgressDemo />

      <ActionBarDemo />

      <ErrorBoundaryDemo />
    </div>
  );
}

/**
 * A run shaped like a real one, because there is no other kind here: this API
 * has no bulk mutation, so "add a tag to 44 contacts" is 44 sequential requests
 * from the browser and one of them will be refused.
 */
function BulkProgressDemo() {
  const [done, setDone] = useState(0);
  const [failures, setFailures] = useState<BulkFailure[]>([]);
  const [status, setStatus] = useState<BulkRunStatus>('running');
  const running = useRef(false);
  const TOTAL = 44;

  const reset = () => {
    running.current = false;
    setDone(0);
    setFailures([]);
    setStatus('running');
  };

  const start = () => {
    reset();
    running.current = true;
    let index = 0;
    const step = () => {
      if (!running.current) return;
      index += 1;
      setDone(index);
      /* Two records this bot cannot write — the shape of the real failure:
         some records refuse and the rest still have to go through. */
      if (index === 7 || index === 23) {
        setFailures((prev) => [
          ...prev,
          {
            id: `c${index}`,
            label: `Contact ${index}`,
            reason: 'Attribute is read-only on this record',
          },
        ]);
      }
      if (index >= TOTAL) {
        running.current = false;
        setStatus('done');
        return;
      }
      window.setTimeout(step, 90);
    };
    window.setTimeout(step, 90);
  };

  return (
    <Demo name="BulkProgress" tokens="Progress determinate · Collapsible failures · lib/bulkRun">
      <Note>
        The API has no bulk mutation of any kind, so every bulk action in the product is N sequential calls somebody is
        watching — which makes this strip part of the feature rather than decoration. It is the only place the truth
        about a half-finished run is told: where it got to, which records were refused, and why. The count never divides
        by zero, the failure line appears only once something has failed, and a stopped run never claims success.
      </Note>
      <Row>
        <Button size="sm" onClick={start}>
          Run 44
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            running.current = false;
            setStatus('stopped');
          }}
        >
          Stop from outside
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </Row>
      <div className="mt-3 max-w-xl space-y-3">
        <BulkProgress
          label="Adding tag VIP"
          done={done}
          total={TOTAL}
          failures={failures}
          status={status}
          onStop={() => {
            running.current = false;
            setStatus('stopped');
          }}
        />
        {/* The clean finish — the one state that earns the success tone, and
            the one a run with failures must never be mistaken for. */}
        <BulkProgress label="Adding tag Newsletter" done={44} total={44} status="done" />
        {/* Stopped with nothing wrong: neither success nor failure. Nothing
            broke, but nothing finished either, so it never claims either one. */}
        <BulkProgress label="Setting owner" done={18} total={44} status="stopped" />
        <BulkProgress label="Exporting selection" done={0} total={0} />
        <BulkProgress
          label="Removing owner"
          done={12}
          total={12}
          status="done"
          failures={[
            { id: 'x1', label: 'Anna Koch', reason: 'Contact was deleted while the run was going' },
            { id: 'x2', label: 'Grace Hopper', reason: 'Attribute is read-only on this record' },
            { id: 'x3', label: 'Alan Turing', reason: 'Attribute is read-only on this record' },
            { id: 'x4', label: 'Radia Perlman', reason: 'Attribute is read-only on this record' },
            { id: 'x5', label: 'Barbara Liskov', reason: 'Attribute is read-only on this record' },
            { id: 'x6', label: 'Katherine Johnson', reason: 'Attribute is read-only on this record' },
          ]}
        />
      </div>
    </Demo>
  );
}

function ActionBarDemo() {
  const [count, setCount] = useState(3);

  return (
    <Demo name="ActionBar" tokens="z-rail · absolute, not portalled · animate-slide-in-bottom">
      <Note>
        The bulk bar. It renders <b>inside</b> its container rather than portalling to the body, and that is the whole
        point: an embed is one panel of somebody else&apos;s page, so a fixed bar on the body would stretch across the
        host&apos;s viewport. It sits at <code className="font-mono text-micro">z-rail</code> — above a sticky table
        header, below every menu, so a dropdown opened from the bar is never clipped by it.
      </Note>
      <Row label="selected">
        {[0, 1, 3, 12].map((n) => (
          <Button key={n} variant="ghost" size="sm" onClick={() => setCount(n)}>
            {n}
          </Button>
        ))}
      </Row>
      <div className="relative mt-2 h-40 overflow-hidden rounded-card border border-dashed border-border bg-surface">
        <p className="p-3 text-xs text-text-faint">The container. At 0 selected the bar renders nothing at all.</p>
        <ActionBar
          count={count}
          onClear={() => setCount(0)}
          actions={[
            {
              id: 'move',
              label: 'Move to…',
              icon: <IconArrowRight size={14} />,
              shortcut: ['1'],
              onSelect: () => {},
            },
            {
              id: 'export',
              label: 'Export',
              icon: <IconDownload size={14} />,
              onSelect: () => {},
            },
            { kind: 'separator', id: 's1' },
            {
              id: 'unassign',
              label: 'Remove owner',
              tone: 'danger',
              icon: <IconTrash size={14} />,
              onSelect: () => {},
            },
          ]}
        />
      </div>
    </Demo>
  );
}
/**
 * The one component here whose demo has to break something on purpose: a
 * boundary that is never tripped is indistinguishable from one that does not
 * work. The kinds are told apart because the answers differ — a bug is worth
 * retrying in place, a chunk that no longer exists is not.
 */
function ErrorBoundaryDemo() {
  const [kind, setKind] = useState<'ok' | 'bug' | 'stale'>('bug');

  function Child() {
    if (kind === 'bug') throw new Error("Cannot read properties of undefined (reading 'edges')");
    if (kind === 'stale') throw new Error('Failed to fetch dynamically imported module: /assets/contacts-a1b2.js');
    return <p className="p-6 text-sm text-text-muted">The module, rendering as it should.</p>;
  }

  return (
    <Demo name="ErrorBoundary" tokens="EmptyState fallback · remount on retry · class component">
      <Note>
        <code className="font-mono text-micro">Suspense</code> catches promises, not exceptions — without a boundary one
        module that throws while rendering unmounts the entire app and leaves a white screen. Wrapped, the failure stays
        inside the content area and the nav is still there to leave by. Retry <b>remounts</b> rather than re-renders, so
        the subtree is built from nothing instead of being handed the state that broke it; a stale chunk after a
        redeploy cannot be retried at all, and is offered a reload instead.
      </Note>
      <Row label="the child">
        <Button size="sm" variant="ghost" onClick={() => setKind('bug')}>
          throws
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setKind('stale')}>
          chunk is gone
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setKind('ok')}>
          renders
        </Button>
      </Row>
      <div className="mt-2 rounded-card border border-dashed border-border bg-surface">
        {/* Keyed by kind so switching the button rebuilds the boundary: in the
            product that key is (module, bot), and moving away is a fresh start
            rather than a screen still showing the last one's error. */}
        <ErrorBoundary key={kind} label="Contacts">
          <Child />
        </ErrorBoundary>
      </div>
    </Demo>
  );
}
