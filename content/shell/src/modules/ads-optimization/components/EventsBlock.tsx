import { useRef } from 'react';
import {
  Button,
  Card,
  DragLayer,
  EmptyState,
  IconGrip,
  IconPlus,
  IconTarget,
  IconTrash,
  Tag,
  parseBindings,
  resolveHotkey,
  useDragSession,
} from '~ui';
import { MAX_EVENTS } from '../lib/eventRules';
import { EVENT_ROW_BINDINGS } from '../lib/shortcuts';
import { conditionErrors, conversionLabel, describeEvent, isStandard, triggerLabel } from '../lib/summary';
import { triggerOf } from '../lib/eventKinds';
import type { AutomationRef, ConversionEvent, EventSetView } from '../types';
import { InheritLine } from './InheritLine';
import { TriggerIcon } from './TriggerIcon';

/* Parsed once: the specs are a module constant, not a prop. */
const ROW_HOTKEYS = parseBindings(EVENT_ROW_BINDINGS);

interface EventsBlockProps {
  set: EventSetView;
  busy: boolean;
  onAdd: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (event: ConversionEvent) => void;
  onReorder: (from: number, to: number) => void;
  onRevert: (parentId: string) => void;
  onOpenSet: (setId: string) => void;
}

/**
 * The conversions a set reports, in the order they are stored.
 *
 * Order is part of the value the API keeps, so it is draggable and it is also
 * reachable from the keyboard - a list that can only be reordered with a
 * pointer is a list somebody cannot reorder. Both paths call the same
 * `onReorder`, which rewrites the whole list, because that is the only write
 * the API has.
 */
export function EventsBlock({ set, busy, onAdd, onEdit, onDelete, onReorder, onRevert, onOpenSet }: EventsBlockProps) {
  const events = set.events?.value ?? [];
  const listRef = useRef<HTMLDivElement | null>(null);
  const indexOf = (id: string) => events.findIndex((event) => event.id === id);

  const session = useDragSession<{ id: string }>({
    disabled: busy || events.length < 2,
    scrollRef: listRef,
    onDrop: ({ id }, targetId) => {
      const from = indexOf(id);
      const to = indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return;
      onReorder(from, to);
    },
  });

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= events.length) return;
    onReorder(index, to);
  };

  const full = events.length >= MAX_EVENTS;

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-label font-medium text-text">Reported conversions</h3>
          <div className="flex items-center gap-3">
            <span className="text-meta tabular-nums text-text-faint">
              {events.length} / {MAX_EVENTS}
            </span>
            {events.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={onAdd} disabled={busy || full}>
                <IconPlus size={14} />
                Add an event
              </Button>
            ) : null}
          </div>
        </div>

        <InheritLine
          inheritsFrom={(set.events?.inheritsFrom as AutomationRef | null) ?? null}
          canInheritFrom={set.events?.canInheritFrom ?? []}
          onOpen={onOpenSet}
          onRevert={onRevert}
          disabled={busy}
        />

        {events.length === 0 ? (
          <EmptyState
            icon={<IconTarget size={20} />}
            title="Nothing is reported yet"
            action={
              <Button variant="primary" onClick={onAdd}>
                <IconPlus size={14} />
                Add an event
              </Button>
            }
          />
        ) : (
          <div ref={listRef} className="flex flex-col">
            {events.map((event, index) => {
              const trigger = triggerOf(event);
              const detail = describeEvent(event);
              const errors = conditionErrors(event);
              const drag = session.draggableProps(event.id, { id: event.id });
              const drop = session.dropTargetProps(event.id);
              return (
                <div
                  key={event.id}
                  ref={drop.ref}
                  data-over={drop['data-over']}
                  style={drag.style}
                  data-dragging={drag['data-dragging']}
                  className="group flex items-center gap-2 border-b border-border-subtle py-2 last:border-b-0 data-[over=true]:bg-row-hover"
                >
                  <button
                    type="button"
                    onPointerDown={drag.onPointerDown}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.defaultPrevented) return;
                      const fired = resolveHotkey(ROW_HOTKEYS, keyEvent, null, 0, false).fired;
                      if (!fired) return;
                      keyEvent.preventDefault();
                      move(index, fired === 'moveEventUp' ? -1 : 1);
                    }}
                    aria-label={`Reorder ${conversionLabel(event.eventName)}`}
                    className="focus-visible:focus-ring cursor-grab rounded-control p-1 text-text-faint hover:text-text"
                  >
                    <IconGrip size={14} />
                  </button>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-body text-text">{conversionLabel(event.eventName)}</span>
                    {isStandard(event.eventName) ? <Tag tone="neutral">Meta</Tag> : null}
                  </div>

                  <div className="hidden min-w-0 flex-1 items-center gap-1.5 text-text-muted @wide/module:flex">
                    {trigger ? <TriggerIcon trigger={trigger.id} size={14} /> : null}
                    <span className="truncate text-meta">{triggerLabel(event)}</span>
                  </div>

                  <div className="hidden min-w-0 flex-1 @wide/module:block">
                    <span className="line-clamp-2 text-meta text-text-muted" title={detail}>
                      {detail}
                    </span>
                    {errors.length > 0 ? <Tag tone="danger">Condition rejected</Tag> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(event.id)} disabled={busy}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Delete ${conversionLabel(event.eventName)}`}
                      onClick={() => onDelete(event)}
                      disabled={busy}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DragLayer session={session}>
          {({ id }) => {
            const event = events.find((candidate) => candidate.id === id);
            if (!event) return null;
            return (
              <div className="rounded-control border border-border bg-surface-raised px-3 py-2 shadow-overlay">
                <span className="text-body text-text">{conversionLabel(event.eventName)}</span>
              </div>
            );
          }}
        </DragLayer>
      </div>
    </Card>
  );
}
