import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { IconClose } from '../icons';
import {
  DEFAULT_SEPARATORS,
  acceptItems,
  focusAfterRemove,
  hasSeparator,
  nextFocusIndex,
  rejectionSummary,
  splitInput,
  type AcceptResult,
} from '../lib/app/chips';
import type { TagProps } from '../primitives/Tag';

export type ChipTone = NonNullable<TagProps['tone']>;

export interface ChipInputProps {
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Chips show, nothing can be added or removed. */
  readOnly?: boolean;
  size?: 'sm' | 'md';
  /** Lands on the draft box, so a `<Label htmlFor>` reaches it. */
  id?: string;
  /** Something is wrong with the value as a whole — draws the danger edge; the message is the caller's. */
  invalid?: boolean;
  /** Ceiling on the list. Shows an `n / max` counter. */
  maxItems?: number;
  /** Per chip, in code points. */
  maxLength?: number;
  /** A message when the item is not acceptable, null when it is. Sees the normalised item. */
  validate?: (item: string) => string | null;
  /** Default: trim. */
  normalize?: (item: string) => string;
  /** Refuse an item already in the list, case-insensitively. Default true. */
  dedupe?: boolean;
  /**
   * Typed or pasted text splits into chips at any of these. Default
   * `/[,\n;]/`. Typing one commits what came before it; pasting text that
   * holds one commits every piece.
   */
  separators?: RegExp;
  /** Commit whatever is typed when focus leaves the field. Default true. */
  commitOnBlur?: boolean;
  /** A custom chip body — a thumbnail beside the label. The × and the keyboard stay ours. */
  renderChip?: (item: string, index: number) => ReactNode;
  chipTone?: ChipTone;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
}

const ROOT_SIZE: Record<NonNullable<ChipInputProps['size']>, string> = {
  sm: 'min-h-field-sm gap-1 px-1 py-0.5',
  md: 'min-h-field gap-1 px-1.5 py-1',
};

const CHIP_SIZE: Record<NonNullable<ChipInputProps['size']>, string> = {
  sm: 'h-5 gap-0.5 pl-1.5 text-micro',
  md: 'h-6 gap-1 pl-2 text-xs',
};

const INPUT_SIZE: Record<NonNullable<ChipInputProps['size']>, string> = {
  sm: 'h-5 min-w-20 text-label',
  md: 'h-6 min-w-24 text-sm',
};

/* The same five as Tag, so a chip in a field and a Tag in a table row that
   name the same thing look the same. */
const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/** How long the refused-value nudge is on screen; the keyframe is 120ms. */
const SHAKE_MS = 200;

/**
 * A controlled token editor for short string lists — keywords, ref links,
 * ad ids. The list is the value; the draft box at the end is local state.
 *
 * One Tab stop. The draft box is it; chips are reached with ← from the
 * caret's start (or Backspace on an empty draft) and left with → past the
 * last one, Escape, or End. That is the roving pattern from `lib/interaction/roving`,
 * except the input is a member of the group — `lib/app/chips` names its
 * position `count`, one past the last chip. On a chip, Backspace and Delete
 * remove it and `focusAfterRemove` says where focus lands. Every × button
 * is `tabIndex={-1}` so a list of thirty is still one stop; it swallows its
 * own pointerdown so clicking it never blurs the draft box.
 *
 * Every rule about what gets IN — splitting, trimming, duplicates, the
 * per-item and per-list ceilings, the caller's `validate` — is
 * `acceptItems`, so a paste of eight into three free slots takes three and
 * says why the rest did not fit. A refusal is a message under the field, a
 * polite announcement, and one sideways nudge (`motion-safe:` only). A
 * refused draft STAYS in the box for editing; a refused paste is dropped —
 * there is nothing to edit it back into.
 */
export function ChipInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  size = 'md',
  id,
  invalid = false,
  maxItems,
  maxLength,
  validate,
  normalize,
  dedupe = true,
  separators = DEFAULT_SEPARATORS,
  commitOnBlur = true,
  renderChip,
  chipTone = 'neutral',
  className = '',
  ...aria
}: ChipInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const uid = useId();
  const hintId = `${uid}-hint`;
  const messageId = `${uid}-message`;

  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [announcement, setAnnouncement] = useState<{ text: string; tick: number }>({ text: '', tick: 0 });

  const count = value.length;
  const inert = disabled || readOnly;
  const full = maxItems !== undefined && count >= maxItems;

  const focusAt = (index: number) => {
    if (index >= count) inputRef.current?.focus();
    else chipRefs.current[index]?.focus();
  };

  /* Focus after a removal is applied AFTER the list has re-rendered: the chip
     that should take it may not exist yet (the indexes shifted), and the chip
     that had it may be gone. Layout effect so the browser never paints a
     frame with focus on <body> between the two. */
  const pendingFocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    focusAt(index);
  });

  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
    },
    [],
  );

  const announce = (text: string) => setAnnouncement((prev) => ({ text, tick: prev.tick + 1 }));

  const refuse = (text: string) => {
    setMessage(text);
    announce(text);
    setShaking(true);
    if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), SHAKE_MS);
  };

  const commit = (items: readonly string[]): AcceptResult => {
    const result = acceptItems(value, items, { maxItems, maxLength, validate, normalize, dedupe });
    if (result.accepted.length > 0) onChange(result.next);
    const refusal = rejectionSummary(result.rejected);
    if (refusal !== null) {
      refuse(refusal);
    } else {
      setMessage(null);
      if (result.accepted.length > 0) announce(`Added ${result.accepted.join(', ')}`);
    }
    return result;
  };

  const remove = (index: number, focus: number) => {
    const item = value[index];
    if (item === undefined || inert) return;
    pendingFocus.current = focus;
    onChange(value.filter((_, i) => i !== index));
    setMessage(null);
    announce(`Removed ${item}`);
  };

  /* Enter, or a typed separator, commits the draft. A refused draft stays
     put — minus the separator that tried to commit it — so it can be fixed. */
  const commitDraft = () => {
    if (draft === '') return;
    const result = commit([draft]);
    if (result.accepted.length > 0 || result.rejected.every((r) => r.reason === 'empty')) setDraft('');
  };

  const onDraftChange = (text: string) => {
    setMessage(null);
    if (inert || !hasSeparator(text, separators)) {
      setDraft(text);
      return;
    }
    const pieces = text.split(separators);
    const rest = (pieces.pop() ?? '').trimStart();
    const result = commit(pieces);
    const held = result.rejected.filter((r) => r.reason !== 'empty').map((r) => r.item);
    /* The common case is one piece and a comma; if that piece was refused it
       is the draft again. Several refused pieces (a drop, an IME commit) go
       back space-joined rather than vanish. */
    setDraft([...held, rest].filter((piece) => piece !== '').join(' '));
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (inert) return;
    const text = event.clipboardData.getData('text');
    if (!hasSeparator(text, separators)) return; // plain paste, into the draft
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? start;
    commit(splitInput(draft.slice(0, start) + text + draft.slice(end), separators));
    setDraft('');
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === 'Enter') {
      /* Only ours when there is something to commit — an empty draft leaves
         Enter to the form around it. */
      if (draft !== '' && !readOnly) {
        event.preventDefault();
        commitDraft();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (draft !== '') {
        /* Clearing the draft is the whole job; do not also close a dialog. */
        event.stopPropagation();
        setDraft('');
        setMessage(null);
      }
      return;
    }
    const input = event.currentTarget;
    const target = nextFocusIndex(event.key, {
      count,
      focused: count,
      inputEmpty: draft === '',
      caretAtStart: input.selectionStart === 0 && input.selectionEnd === 0,
    });
    if (target !== null) {
      event.preventDefault();
      focusAt(target);
    }
  };

  const onChipKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (disabled) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (!readOnly) remove(index, focusAfterRemove(count, index, event.key));
      return;
    }
    const target = nextFocusIndex(event.key, {
      count,
      focused: index,
      inputEmpty: draft === '',
      caretAtStart: true,
    });
    if (target !== null) {
      event.preventDefault();
      if (event.key === 'Escape') event.stopPropagation();
      focusAt(target);
      return;
    }
    /* Typing on a chip means "I am done here, back to adding": focus moves to
       the draft box and — because the default is NOT prevented — the browser
       delivers the character to the box that is focused when the key's
       default action runs, which is now that one. So Backspace, Backspace,
       "s" reads as: step onto the last chip, remove it, start the next. */
    if (!readOnly && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      focusAt(count);
    }
  };

  const onInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!commitOnBlur || inert) return;
    /* Focus moving to a chip or a × is still inside the field. */
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) return;
    commitDraft();
  };

  /* A click on the padding, or between chips, is a click on the field. */
  const onRootPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const describedBy = [aria['aria-describedby'], inert ? null : hintId, message !== null ? messageId : null]
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join(' ');

  const showFooter = message !== null || maxItems !== undefined;

  return (
    <div className={className}>
      <div
        ref={rootRef}
        role="group"
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
        aria-disabled={disabled || undefined}
        onPointerDown={onRootPointerDown}
        className={`flex flex-wrap items-center rounded-control border bg-surface-sunken transition-colors duration-fast ease-standard ${
          ROOT_SIZE[size]
        } ${invalid ? 'border-danger' : 'border-border focus-within:border-accent'} ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text'
        } ${shaking ? 'motion-safe:animate-shake' : ''}`}
      >
        {value.map((item, index) => (
          <span
            key={`${index}:${item}`}
            ref={(node) => {
              chipRefs.current[index] = node;
            }}
            tabIndex={disabled ? undefined : -1}
            onKeyDown={(event) => onChipKeyDown(event, index)}
            className={`inline-flex max-w-full shrink-0 items-center rounded-chip font-medium outline-none focus-visible:focus-ring ${
              CHIP_SIZE[size]
            } ${inert ? (size === 'sm' ? 'pr-1.5' : 'pr-2') : 'pr-0.5'} ${TONE_CLASSES[chipTone]}`}
          >
            <span className="min-w-0 truncate">{renderChip ? renderChip(item, index) : item}</span>
            <span className="sr-only">
              , {index + 1} of {count}
            </span>
            {inert ? null : (
              /* A glyph in a 16px hit inside a 24px chip — under the smallest
                 Button (24px), which is why it is a bare <button>. It swallows
                 pointerdown so the draft box keeps focus (and its blur commit
                 does not fire) when a chip is removed by mouse; keyboard users
                 never reach it — Backspace / Delete on the chip do the same. */
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Remove ${item}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => remove(index, count - 1)}
                className="flex size-4 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity duration-fast ease-standard hover:opacity-100 focus-visible:focus-ring"
              >
                <IconClose size={12} />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          placeholder={full ? undefined : placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off"
          aria-label={aria['aria-label']}
          aria-labelledby={aria['aria-labelledby']}
          aria-describedby={describedBy || undefined}
          aria-invalid={invalid || message !== null || undefined}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          onBlur={onInputBlur}
          className={`flex-1 bg-transparent px-1 text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed ${INPUT_SIZE[size]}`}
        />
      </div>

      {showFooter ? (
        <div className="mt-1 flex items-start justify-between gap-3">
          <p id={messageId} className="min-w-0 text-xs text-danger">
            {message}
          </p>
          {maxItems !== undefined ? (
            <span className={`ml-auto shrink-0 text-micro tabular-nums ${full ? 'text-danger' : 'text-text-faint'}`}>
              {count} / {maxItems}
            </span>
          ) : null}
        </div>
      ) : null}

      {inert ? null : (
        <span id={hintId} className="sr-only">
          Press Enter or comma to add. Left and right arrows move between items; Backspace or Delete removes the focused
          item.
        </span>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        <span key={announcement.tick}>{announcement.text}</span>
      </span>
    </div>
  );
}
