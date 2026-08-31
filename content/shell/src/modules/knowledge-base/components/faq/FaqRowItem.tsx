import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Button,
  Checkbox,
  IconChevronDown,
  IconChevronUp,
  IconGrip,
  IconTrash,
  Input,
  Tag,
  Textarea,
  Tooltip,
  type DraggableProps,
  type DropTargetProps,
} from '~ui';
import { FAQ_ANSWER_MAX, type Finding } from '../../lib/lint';
import { entryChars, findingChip, highlight, severityTone, type DuplicateMark } from '../../lib/faqList';
import type { FaqField, NudgeTo } from '../../lib/faqDraftStore';
import type { FaqRow } from '../../types';

export interface FaqRowItemProps {
  row: FaqRow;
  /** Position in the saved order, 1-based — the order the assistant reads. */
  position: number;
  total: number;
  query: string;
  selected: boolean;
  editing: boolean;
  canEdit: boolean;
  /** Off while a sort lens is on: a drop index would mean nothing underneath it. */
  reorderable: boolean;
  findings: readonly Finding[];
  duplicate: DuplicateMark | undefined;
  /** Set for exactly one render, by a new row or a deep link, then consumed. */
  focusField: FaqField | null;
  onFocusConsumed: () => void;
  onToggleSelect: (shift: boolean) => void;
  onToggleEditing: () => void;
  onPatch: (field: FaqField, value: string) => void;
  onDelete: () => void;
  onNudge: (to: NudgeTo) => void;
  onShowDuplicate: (key: string) => void;
  /** From the page's one drag session. Null when this row cannot be dragged. */
  dragProps: DraggableProps | null;
  dropProps: DropTargetProps;
  dragging: boolean;
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="bg-transparent font-semibold text-accent">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/**
 * One question and answer: a dense row that expands in place into its editor.
 *
 * In place rather than in a drawer, and it is the whole reason this page is
 * usable: the job is almost always "read down the list and fix four answers",
 * and a drawer makes that four open-edit-close cycles over a list you can no
 * longer see. The expanded row keeps its neighbours on screen.
 *
 * Three details that are easy to get wrong:
 *
 * - **The drag handler sits on the ROW but only fires from the grip.** Putting
 *   `draggableProps` on the grip itself would size the ghost to a 24px dot;
 *   putting it on the row unguarded would start a drag from the checkbox and
 *   from inside the textarea. So the row carries the handler and the guard asks
 *   whether the pointer went down on the grip.
 * - **An expanded row is never draggable.** `draggableProps` also sets
 *   `user-select: none`, which would spread into the textarea and make the
 *   answer unselectable — and dragging a row you are typing in is not a gesture
 *   anybody means.
 * - **The grip is the keyboard reorder.** Focused, its arrows move the ROW
 *   rather than the focus; that is the one mapping a handle can have that needs
 *   no "pick up" mode, and `Home`/`End` reach the ends of a long list directly.
 */
export function FaqRowItem({
  row,
  position,
  total,
  query,
  selected,
  editing,
  canEdit,
  reorderable,
  findings,
  duplicate,
  focusField,
  onFocusConsumed,
  onToggleSelect,
  onToggleEditing,
  onPatch,
  onDelete,
  onNudge,
  onShowDuplicate,
  dragProps,
  dropProps,
  dragging,
}: FaqRowItemProps) {
  const questionRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focusField === null) return;
    /* The answer is found through the DOM rather than a ref: `Textarea` owns its
       own ref for the auto-grow measurement and forwards none, and a second copy
       of that primitive here to gain one would be worse than a querySelector. */
    const node = focusField === 'question' ? questionRef.current : (itemRef.current?.querySelector('textarea') ?? null);
    /* `block: 'nearest'` so a row already on screen does not jump; focus alone
       would scroll it to wherever the browser felt like. */
    itemRef.current?.scrollIntoView({ block: 'nearest' });
    node?.focus();
    onFocusConsumed();
  }, [focusField, onFocusConsumed]);

  const chars = entryChars(row);
  const over = dropProps['data-over'] === true;
  /* Trimmed, not just falsy-checked: a question of three spaces is as nameless
     as an empty one, and "Select    " is not a control name. */
  const name = row.question.trim() === '' ? 'the entry with no question' : row.question;

  const onGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const to: NudgeTo | null =
      event.key === 'ArrowUp'
        ? 'up'
        : event.key === 'ArrowDown'
          ? 'down'
          : event.key === 'Home'
            ? 'top'
            : event.key === 'End'
              ? 'bottom'
              : null;
    if (to === null) return;
    event.preventDefault();
    onNudge(to);
  };

  /* The row's own pointerdown, forwarded to the drag session only from the
     grip. `currentTarget` stays the row, which is what makes the ghost the row. */
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!(event.target instanceof Element) || event.target.closest('[data-faq-grip]') === null) return;
    dragProps?.onPointerDown(event);
  };

  return (
    <li
      ref={(node) => {
        itemRef.current = node;
        dropProps.ref(node);
      }}
      style={dragProps?.style}
      onPointerDown={dragProps ? onPointerDown : undefined}
      data-dragging={dragging ? true : undefined}
      className={`border-b border-border-subtle transition-colors duration-fast ease-standard last:border-b-0 ${
        over ? 'bg-accent-soft' : selected ? 'bg-row-selected' : 'bg-surface-raised hover:bg-row-hover'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2 px-2 py-1.5">
        <span className="flex h-6 shrink-0 items-center">
          <Checkbox
            checked={selected}
            onChange={(_checked, event) => onToggleSelect(event.shiftKey)}
            aria-label={`Select ${name}`}
          />
        </span>

        {canEdit && reorderable ? (
          <Tooltip label="Drag to reorder, or use the arrow keys">
            <button
              type="button"
              data-faq-grip
              onKeyDown={onGripKeyDown}
              aria-label={`Reorder ${name}. Position ${position} of ${total}. Use the arrow keys.`}
              className="flex h-6 shrink-0 cursor-grab items-center rounded-control px-0.5 text-text-faint transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring active:cursor-grabbing"
            >
              <IconGrip size={14} />
            </button>
          </Tooltip>
        ) : (
          <span
            aria-hidden
            className="flex h-6 w-5 shrink-0 items-center justify-center text-micro tabular-nums text-text-faint"
          >
            {position}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleEditing}
          aria-expanded={editing}
          className="min-w-0 flex-1 rounded-control py-0.5 text-left focus-visible:focus-ring"
        >
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={`min-w-0 truncate text-sm font-medium ${row.question.trim() === '' ? 'text-text-faint' : 'text-text'}`}
            >
              {row.question.trim() === '' ? 'No question yet' : <Highlighted text={row.question} query={query} />}
            </span>
            {findings.map((finding) => (
              <Tooltip key={finding.id} label={`${finding.title} — ${finding.detail}`}>
                <Tag tone={severityTone(finding.severity)}>{findingChip(finding)}</Tag>
              </Tooltip>
            ))}
          </span>
          {editing ? null : (
            <span
              className={`mt-0.5 line-clamp-2 text-xs ${row.answer.trim() === '' ? 'text-danger' : 'text-text-muted'}`}
            >
              {row.answer.trim() === '' ? (
                'This question has no answer — the assistant will look like it answered anyway.'
              ) : (
                <Highlighted text={row.answer} query={query} />
              )}
            </span>
          )}
        </button>

        <span className="flex shrink-0 items-center gap-1">
          {duplicate ? (
            <Tooltip
              label={`Asked ${duplicate.total} times. Show the ${duplicate.index === 1 ? 'next' : 'first'} one.`}
            >
              <button
                type="button"
                onClick={() => onShowDuplicate(duplicate.others[0]!)}
                className="rounded-chip bg-warning-soft px-1.5 py-0.5 text-micro font-medium text-warning transition-opacity duration-fast ease-standard hover:opacity-80 focus-visible:focus-ring"
              >
                {duplicate.index} of {duplicate.total}
              </button>
            </Tooltip>
          ) : null}
          <span
            className={`hidden w-14 text-right text-micro tabular-nums @compact:inline ${row.answer.length > FAQ_ANSWER_MAX ? 'text-warning' : 'text-text-faint'}`}
          >
            {chars}
          </span>
          {canEdit ? (
            <Tooltip label="Delete">
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                aria-label={`Delete ${row.question || 'this entry'}`}
                onClick={onDelete}
              >
                <IconTrash />
              </Button>
            </Tooltip>
          ) : null}
          <span aria-hidden className="text-text-faint">
            {editing ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        </span>
      </div>

      {editing ? (
        <div
          /* Escape closes the editor. Local to this subtree rather than a module
             binding: the `?` sheet documents `lib/shortcuts.ts`, and a global key
             that is not in that list would be a shortcut nobody can discover. */
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            onToggleEditing();
          }}
          className="flex flex-col gap-2 border-t border-border-subtle px-2 py-3 @compact:px-10"
        >
          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium uppercase tracking-wide text-text-faint">Question</span>
            <Input
              ref={questionRef}
              value={row.question}
              readOnly={!canEdit}
              onChange={(event) => onPatch('question', event.target.value)}
              placeholder="Phrase it the way a customer would ask"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium uppercase tracking-wide text-text-faint">Answer</span>
            <Textarea
              value={row.answer}
              readOnly={!canEdit}
              onChange={(event) => onPatch('answer', event.target.value)}
              placeholder="Two or three sentences. Link out for the detail."
              autoGrow
              rows={3}
              maxRows={14}
            />
          </label>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {row.answer.length > FAQ_ANSWER_MAX ? (
              <span className="text-micro text-warning">
                Over {FAQ_ANSWER_MAX} characters is a page, not an answer — split it or link out.
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onToggleEditing} className="ml-auto">
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
