import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessageFor } from '~api';
import {
  Button,
  Dialog,
  DropdownMenu,
  IconBolt,
  IconMore,
  IconPlus,
  IconSearch,
  IconTrash,
  Input,
  Skeleton,
  Tag,
  Tooltip,
  useRovingFocus,
  useToast,
  type MenuItem,
  type UseRovingFocusResult,
} from '~ui';
import type { FlowsListState } from '../hooks/useFlowsList';
import type { FlowListItem } from '../types';
import { NewFlowDialog } from './NewFlowDialog';
import { PlatformGlyph } from './PlatformGlyph';

/**
 * How long the pointer has to rest on a row before its flow is fetched. A
 * pointer travelling down the list crosses every row on the way and means
 * none of them; one that stops has probably arrived. Short, because the whole
 * point is to be ahead of the click, and the cache behind it makes a wrong
 * guess cost one request and never two.
 */
const HOVER_INTENT_MS = 120;

export interface FlowPickerProps {
  flows: FlowsListState;
  selectedId: string | null;
  onSelect: (flowId: string) => void;
  /** The open flow was deleted: whoever owns the selection has to let go of it. */
  onDeleted?: (flowId: string) => void;
  /**
   * The pointer settled on a row, or focus landed on it: start loading that
   * flow so the click that follows finds it in flight or done.
   */
  onPrefetch?: (flowId: string) => void;
}

interface FlowSection {
  title: string;
  flows: readonly FlowListItem[];
}

/**
 * Left rail: flowGroups / flowsWithoutGroup / defaultReplyFlows — flat, no
 * pagination, a search box over the lot.
 *
 * Width and the dividing border come from SplitPane's `<aside>` (w-sidenav).
 * The background stays HERE rather than moving to that wrapper: below the
 * collapse band there is no `<aside>` at all and this nav is the entire screen,
 * so a background left on the parent would disappear at exactly the width where
 * the picker is all there is to see.
 *
 * The row carries its channel as a coloured glyph rather than as a text tag:
 * the platform is the one thing about a flow that is recognised rather than
 * read, and a tag on every row spends the width the flow's own name needs.
 * One roving Tab stop over every visible row; the search box is its own.
 */
export function FlowPicker({ flows, selectedId, onSelect, onDeleted, onPrefetch }: FlowPickerProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<FlowListItem | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleting, setDeleting] = useState<FlowListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLocaleLowerCase();

  const sections: FlowSection[] = useMemo(() => {
    const matches = (flow: FlowListItem, title: string) =>
      !q || `${flow.name} ${title}`.toLocaleLowerCase().includes(q);
    const all: FlowSection[] = [
      ...flows.groups.map((group) => ({ title: group.name, flows: group.flows })),
      { title: 'Flows', flows: flows.ungrouped },
      { title: 'Default replies', flows: flows.defaultReply },
    ];
    return all
      .map((section) => ({ ...section, flows: section.flows.filter((flow) => matches(flow, section.title)) }))
      .filter((section) => section.flows.length > 0);
  }, [flows.groups, flows.ungrouped, flows.defaultReply, q]);

  const openRename = (flow: FlowListItem) => {
    setRenameDraft(flow.name);
    setRenaming(flow);
  };

  const commitRename = async () => {
    const flow = renaming;
    const next = renameDraft.trim();
    if (!flow || !next || next === flow.name) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    try {
      await flows.rename(flow.id, next);
      setRenaming(null);
    } catch (err) {
      toast.show({
        tone: 'danger',
        title: 'The flow was not renamed',
        description: errorMessageFor(err, {}),
        duration: 0,
      });
    } finally {
      setBusy(false);
    }
  };

  const commitDelete = async () => {
    const flow = deleting;
    if (!flow) return;
    setBusy(true);
    try {
      await flows.remove(flow.id);
      setDeleting(null);
      /* Only after the server agreed: closing the canvas over a flow that is
         still there would look like a delete that worked. */
      if (flow.id === selectedId) onDeleted?.(flow.id);
    } catch (err) {
      toast.show({
        tone: 'danger',
        title: 'The flow was not deleted',
        description: errorMessageFor(err, {}),
        duration: 0,
      });
    } finally {
      setBusy(false);
    }
  };

  /* One roving list over every visible row, in rail order. */
  const rows = useMemo(() => sections.flatMap((section) => section.flows), [sections]);
  const roving = useRovingFocus(rows.length, { orientation: 'vertical', labels: rows.map((flow) => flow.name) });
  const indexOf = (flowId: string) => rows.findIndex((flow) => flow.id === flowId);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised" onKeyDown={roving.onKeyDown}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a flow…"
            aria-label="Find a flow"
            className="pl-8 text-xs"
          />
        </div>
        <Tooltip label="New flow">
          <Button variant="ghost" size="sm" iconOnly aria-label="New flow" onClick={() => setCreating(true)}>
            <IconPlus size={14} />
          </Button>
        </Tooltip>
      </div>

      <nav aria-label="Flows" className="min-h-0 flex-1 overflow-y-auto">
        {flows.loading ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading flows">
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
            <Skeleton variant="block" height="2rem" />
          </div>
        ) : flows.error ? (
          <div className="space-y-2 p-3">
            <p className="text-xs text-danger">{flows.error}</p>
            <Button variant="secondary" size="sm" onClick={flows.refetch}>
              Retry
            </Button>
          </div>
        ) : sections.length === 0 ? (
          <p className="p-3 text-xs text-text-muted">
            {q ? `No flow matches “${query.trim()}”.` : 'This bot has no flows yet.'}
          </p>
        ) : (
          sections.map((section) => (
            <section
              key={section.title}
              aria-label={section.title}
              className="border-b border-border-subtle py-1 last:border-b-0"
            >
              <div className="px-3 py-1.5">
                <span className="text-micro font-semibold uppercase tracking-wide text-text-faint">
                  {section.title}
                </span>
              </div>
              <ul role="list">
                {section.flows.map((flow) => (
                  <li key={flow.id}>
                    <FlowRow
                      flow={flow}
                      selected={flow.id === selectedId}
                      roving={roving}
                      index={indexOf(flow.id)}
                      onSelect={onSelect}
                      onRename={openRename}
                      onDelete={setDeleting}
                      onPrefetch={onPrefetch}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </nav>

      <NewFlowDialog open={creating} onClose={() => setCreating(false)} onCreate={flows.create} onCreated={onSelect} />

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename flow"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!renameDraft.trim()} onClick={() => void commitRename()}>
              Save
            </Button>
          </div>
        }
      >
        <Input
          value={renameDraft}
          onChange={(event) => setRenameDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !renameDraft.trim() || busy) return;
            event.preventDefault();
            void commitRename();
          }}
          aria-label="Name"
          disabled={busy}
          autoFocus
        />
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : 'Delete'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void commitDelete()}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-text-muted">
          Its blocks go with it, and anything that redirected to it stops working. This cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}

function FlowRow({
  flow,
  selected,
  roving,
  index,
  onSelect,
  onRename,
  onDelete,
  onPrefetch,
}: {
  flow: FlowListItem;
  selected: boolean;
  roving: UseRovingFocusResult;
  index: number;
  onSelect: (flowId: string) => void;
  onRename: (flow: FlowListItem) => void;
  onDelete: (flow: FlowListItem) => void;
  onPrefetch?: (flowId: string) => void;
}) {
  const entryPointOn = flow.entryPoints.some((entryPoint) => entryPoint.isEntryPointEnabled);

  /* Hover intent, and nothing cleverer: a timer armed on enter or focus,
     disarmed on leave, blur or unmount. The selected row is skipped because
     its flow is the one already open. Everything about "was this already
     fetched" is the cache's business, not this row's. */
  const intent = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const arm = () => {
    if (!onPrefetch || selected) return;
    clearTimeout(intent.current);
    intent.current = setTimeout(() => onPrefetch(flow.id), HOVER_INTENT_MS);
  };
  const disarm = () => clearTimeout(intent.current);
  useEffect(() => disarm, []);

  const actions: MenuItem[] = [
    { id: 'rename', label: 'Rename…', onSelect: () => onRename(flow) },
    { kind: 'separator', id: 'sep' },
    { id: 'delete', label: 'Delete…', icon: <IconTrash size={14} />, tone: 'danger', onSelect: () => onDelete(flow) },
  ];

  /* A row and its actions, not a button with buttons inside it: one focus stop
     for the roving list, and the menu is its own — a control nested in the row
     control would be invalid markup and unreachable from the keyboard. */
  return (
    <div
      className={`group flex items-center transition-colors duration-fast ease-standard hover:bg-surface-hover ${
        selected ? 'bg-accent-soft' : ''
      }`}
    >
      <button
        type="button"
        {...roving.itemProps(index)}
        onClick={() => onSelect(flow.id)}
        onPointerEnter={arm}
        onPointerLeave={disarm}
        onFocus={arm}
        onBlur={disarm}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 pr-1 text-left focus-visible:focus-ring"
      >
        <PlatformGlyph platform={flow.platform} />
        <span className={`min-w-0 flex-1 truncate text-sm text-text ${selected ? 'font-medium' : ''}`}>
          {flow.name}
        </span>
        {flow.entryPoints.length > 0 ? (
          <span title={entryPointOn ? 'Entry point enabled' : 'Entry point disabled'}>
            <Tag tone={entryPointOn ? 'success' : 'neutral'}>
              <IconBolt size={10} />
            </Tag>
          </span>
        ) : null}
      </button>

      <DropdownMenu
        items={actions}
        aria-label={`Actions for ${flow.name}`}
        trigger={(props) => (
          <Button
            {...props}
            iconOnly
            variant="ghost"
            size="xs"
            aria-label={`Actions for ${flow.name}`}
            className="mr-1 shrink-0"
          >
            <IconMore size={14} />
          </Button>
        )}
      />
    </div>
  );
}
