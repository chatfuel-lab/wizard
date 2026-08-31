import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, DragLayer, IconChevronRight, IconGrip, IconLock, Tag, useDragSession } from '~ui';
import { Demo, Note } from './shared';

/**
 * The proving ground for content/ui/src/dnd.
 *
 * Deliberately shaped like the real Deals board rather than a two-column toy:
 * six columns in a horizontal scroller, a collapsed column that is still a drop
 * target and spring-loads open, a locked card that must refuse to drag, and
 * edge auto-scroll. Those are exactly the parts a minimal demo would not
 * exercise, and exactly where the bugs live.
 */

interface Card {
  id: string;
  name: string;
  amount: string;
  locked?: boolean;
}

const STAGES = [
  { id: 'new', label: 'New', dot: 'bg-pipeline-1' },
  { id: 'sorting', label: 'Sorting', dot: 'bg-pipeline-2' },
  { id: 'ready', label: 'Ready', dot: 'bg-pipeline-3' },
  { id: 'working', label: 'Working on', dot: 'bg-pipeline-4' },
  { id: 'won', label: 'Won', dot: 'bg-pipeline-5' },
  { id: 'lost', label: 'Lost', dot: 'bg-pipeline-6' },
] as const;

type StageId = (typeof STAGES)[number]['id'];

const INITIAL: Record<StageId, Card[]> = {
  new: [
    { id: 'c1', name: 'Ada Lovelace', amount: '€12,400' },
    { id: 'c2', name: 'Grace Hopper', amount: '€3,200' },
    { id: 'c3', name: 'Restricted contact', amount: '—', locked: true },
  ],
  sorting: [{ id: 'c4', name: 'Alan Turing', amount: '€8,900' }],
  ready: [
    { id: 'c5', name: 'Katherine Johnson', amount: '€21,000' },
    { id: 'c6', name: 'Margaret Hamilton', amount: '€6,750' },
  ],
  working: [{ id: 'c7', name: 'Barbara Liskov', amount: '€44,100' }],
  won: [{ id: 'c8', name: 'Radia Perlman', amount: '€18,300' }],
  lost: [],
};

const SPRING_LOAD_MS = 500;

function CardBody({ card, dragging = false }: { card: Card; dragging?: boolean }) {
  return (
    <div
      className={`rounded-card border bg-surface-raised px-2.5 py-2 ${dragging ? 'border-accent' : 'border-border'}`}
    >
      <div className="flex items-center gap-2">
        {card.locked ? (
          <span className="flex aspect-square h-6 items-center justify-center rounded-full bg-surface-sunken text-text-faint">
            <IconLock size={12} />
          </span>
        ) : (
          <Avatar name={card.name} size={24} />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{card.name}</span>
        {card.locked ? null : <IconGrip size={14} className="shrink-0 text-text-faint" />}
      </div>
      <div className="mt-1 pl-8 text-xs tabular-nums text-text-muted">{card.amount}</div>
    </div>
  );
}

export function DndSection() {
  const [board, setBoard] = useState<Record<StageId, Card[]>>(INITIAL);
  const [collapsed, setCollapsed] = useState<StageId[]>(['lost']);
  const [log, setLog] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = useDragSession<Card>({
    scrollRef,
    onDrop: (card, targetId) => {
      const target = targetId as StageId;
      setBoard((prev) => {
        const from = (Object.keys(prev) as StageId[]).find((stage) => prev[stage].some((each) => each.id === card.id));
        if (from === undefined || from === target) return prev;
        return {
          ...prev,
          [from]: prev[from].filter((each) => each.id !== card.id),
          /* Always the top: the server re-stamps the sort key on a stage
             change, so that is genuinely where the card lands. */
          [target]: [card, ...prev[target]],
        };
      });
      setLog((prev) => [`${card.name} → ${target}`, ...prev].slice(0, 4));
    },
    onCancel: (card) => setLog((prev) => [`${card.name} — cancelled`, ...prev].slice(0, 4)),
    getAnnouncement: (event) => {
      const stage = STAGES.find((each) => each.id === event.targetId)?.label ?? 'nothing';
      if (event.phase === 'start') return `Picked up ${event.data.name}. Escape cancels.`;
      if (event.phase === 'over') return `${event.data.name} over ${stage}.`;
      if (event.phase === 'drop') return `${event.data.name} moved to ${stage}.`;
      return `${event.data.name} returned.`;
    },
  });

  /* Spring-load: hovering a collapsed rail during a drag opens it, so a
   * collapsed column is never a dead end. */
  const { overId, isDragging } = session;
  useEffect(() => {
    if (!isDragging || overId === null) return;
    if (!collapsed.includes(overId as StageId)) return;
    const timer = window.setTimeout(() => setCollapsed((prev) => prev.filter((id) => id !== overId)), SPRING_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [overId, isDragging, collapsed]);

  return (
    <div className="space-y-4">
      <Demo name="Kanban board" tokens="pipeline-1…6 · shadow-drag · z-drag · row-hover · accent-soft drop target">
        <Note>
          Mouse and pen activate after 5px of travel; touch needs a 180ms hold, so the column still scrolls with a
          normal swipe. Drag a card to the right-hand edge to see the quadratic auto-scroll. Escape mid-drag flies the
          card back. The collapsed <b>Lost</b> rail is still a drop target and springs open after {SPRING_LOAD_MS}ms of
          hover.
        </Note>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto rounded-card bg-surface p-3"
          style={{ scrollbarGutter: 'stable' }}
        >
          {STAGES.map((stage) => {
            const isCollapsed = collapsed.includes(stage.id);
            const cards = board[stage.id];
            const targetProps = session.dropTargetProps(stage.id);
            const isOver = targetProps['data-over'] === true;

            if (isCollapsed) {
              return (
                <div
                  key={stage.id}
                  {...targetProps}
                  onClick={() => setCollapsed((prev) => prev.filter((id) => id !== stage.id))}
                  className={`flex w-11 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-card border py-2 transition-colors duration-fast ease-standard ${
                    isOver ? 'border-accent bg-accent-soft' : 'border-border bg-surface-sunken'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                  <span className="text-xs tabular-nums text-text-muted">{cards.length}</span>
                  <span className="mt-1 text-xs font-medium text-text-muted" style={{ writingMode: 'vertical-rl' }}>
                    {stage.label}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={stage.id}
                {...targetProps}
                className={`flex max-h-80 w-56 shrink-0 flex-col rounded-card border transition-colors duration-fast ease-standard ${
                  isOver ? 'border-accent bg-accent-soft' : 'border-border bg-surface-sunken'
                }`}
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stage.dot}`} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">{stage.label}</span>
                  <span className="text-xs tabular-nums text-text-faint">{cards.length}</span>
                  <button
                    type="button"
                    aria-label={`Collapse ${stage.label}`}
                    onClick={() => setCollapsed((prev) => [...prev, stage.id])}
                    className="rounded-chip p-0.5 text-text-faint transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                  >
                    <IconChevronRight size={14} />
                  </button>
                </div>

                <div className="flex min-h-16 flex-col gap-1.5 overflow-y-auto px-1.5 pb-1.5">
                  {/* The placeholder always opens at the top, because that is
                      where the card actually lands. A drop-index would be a lie. */}
                  {isOver && session.activeId !== null ? (
                    <div className="h-14 shrink-0 rounded-card border border-dashed border-accent bg-surface-raised/60" />
                  ) : null}

                  {cards.map((card) =>
                    card.locked ? (
                      <div key={card.id} className="opacity-60">
                        <CardBody card={card} />
                      </div>
                    ) : (
                      <div
                        key={card.id}
                        {...session.draggableProps(card.id, card)}
                        className="cursor-grab transition-opacity duration-fast ease-standard data-[dragging]:opacity-40"
                      >
                        <CardBody card={card} />
                      </div>
                    ),
                  )}

                  {cards.length === 0 && !isOver ? (
                    <p className="px-1 py-3 text-center text-xs text-text-faint">Empty</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <DragLayer session={session}>{(card) => <CardBody card={card} dragging />}</DragLayer>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setBoard(INITIAL);
              setCollapsed(['lost']);
              setLog([]);
            }}
          >
            Reset board
          </Button>
          {log.map((entry, index) => (
            <Tag key={`${entry}-${index}`} tone={index === 0 ? 'accent' : 'neutral'}>
              {entry}
            </Tag>
          ))}
        </div>
      </Demo>

      <Demo name="What the primitive does not do" tokens="—">
        <Note>
          There is no within-column reordering, and that is not an omission: board order is fixed to{' '}
          <code className="font-mono text-micro">lastSalesStageUpdateTime</code> server-side and{' '}
          <code className="font-mono text-micro">contactDealsConnection</code> takes no{' '}
          <code className="font-mono text-micro">orderBy</code>, so a manual position could never be saved. Sorting UI
          would look like it worked and silently lose the order on reload.
        </Note>
        <Note>
          The drop settle fades the ghost where it was released rather than flying it to its landing spot. The server
          decides the final position, so any flight path would be a guess — the arrival animation belongs to the board,
          over the real card.
        </Note>
      </Demo>
    </div>
  );
}
