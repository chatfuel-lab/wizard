import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FloatingSurface } from '../floating/FloatingSurface';
import { IconClock } from '../icons';
import {
  formatHHmm,
  formatMinuteOfDay,
  parseHHmm,
  parseTimeInput,
  snapMinute,
  timeSteps,
  usesHour12,
} from '../lib/time/timeOfDay';

export interface TimeInputProps {
  /** Canonical `HH:mm`, or null for empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Minutes between listed options. Typed values are NOT snapped — 09:10 stays 09:10. */
  step?: number;
  /** Inclusive `HH:mm` bounds for the list AND for typed values. `max` may be `24:00`. */
  min?: string;
  max?: string;
  hour12?: boolean;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Something is wrong with this value — draws the danger edge; the message is the caller's. */
  invalid?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TimeInputProps['size']>, string> = {
  sm: 'h-field-sm text-label',
  md: 'h-field text-body',
};

/* The text box's width, per size: room for `12:30 PM` and no more. */
const INPUT_WIDTH: Record<NonNullable<TimeInputProps['size']>, string> = {
  sm: 'w-18',
  md: 'w-20',
};

/**
 * A time field that reads like a text box and offers a list.
 *
 * The listbox pattern from `Combobox`: focus never leaves the input,
 * `aria-activedescendant` marks the highlighted row, so a user can keep
 * typing while arrowing. What is different is the parse: `parseTimeInput`
 * accepts what people type (`930`, `9:30p`, `2130`) and the field commits on
 * Enter or blur, showing the value back in the locale's own form. The value
 * across the boundary is always canonical `HH:mm` — the store and the API
 * never see `9:30 PM`.
 *
 * ↑/↓ with the list closed step the value by `step`; with it open they move
 * the highlight. Escape stops propagation so it does not also close a dialog.
 */
export function TimeInput({
  value,
  onChange,
  step = 15,
  min,
  max,
  hour12: hour12Prop,
  locale,
  placeholder = '--:--',
  disabled = false,
  invalid = false,
  size = 'md',
  className = '',
  ...aria
}: TimeInputProps) {
  const hour12 = hour12Prop ?? usesHour12(locale);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const minute = value === null ? null : parseHHmm(value);
  const minMinute = min === undefined ? 0 : (parseHHmm(min) ?? 0);
  const maxMinute = max === undefined ? 1440 : (parseHHmm(max) ?? 1440);

  const label = useCallback(
    (m: number | null) => (m === null ? '' : formatMinuteOfDay(m, { hour12, locale })),
    [hour12, locale],
  );

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(label(minute));
  const [active, setActive] = useState(0);
  const options = useMemo(() => timeSteps(step, { min: minMinute, max: maxMinute }), [maxMinute, minMinute, step]);

  /* The text follows the value while the field is not being edited. */
  useEffect(() => {
    if (!open) setText(label(minute));
  }, [label, minute, open]);

  /* Highlight the current value (or the nearest option) when the list opens. */
  useEffect(() => {
    if (!open) return;
    const target = minute ?? Math.max(minMinute, Math.min(maxMinute, 540));
    let best = 0;
    for (let i = 0; i < options.length; i += 1) {
      if (Math.abs(options[i]! - target) < Math.abs(options[best]! - target)) best = i;
    }
    setActive(best);
    /* Bring it into view once the surface has been positioned. */
    requestAnimationFrame(() => {
      document.getElementById(`${listId}-${best}`)?.scrollIntoView({ block: 'center' });
    });
  }, [listId, maxMinute, minMinute, minute, open, options]);

  const commit = (next: number | null) => {
    if (next === null) {
      onChange(null);
      setText('');
      return;
    }
    const clamped = Math.max(minMinute, Math.min(maxMinute, next));
    onChange(formatHHmm(clamped));
    setText(label(clamped));
  };

  const commitText = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      commit(null);
      return;
    }
    const parsed = parseTimeInput(trimmed);
    if (parsed === null) {
      /* Not a time: show the last good value again rather than keeping junk. */
      setText(label(minute));
      return;
    }
    commit(parsed);
  };

  const close = () => setOpen(false);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        /* Closed: step the value itself. */
        const base = minute ?? Math.max(minMinute, Math.min(maxMinute, 540));
        commit(snapMinute(base + direction * step, step));
        return;
      }
      if (options.length === 0) return;
      const next = (active + direction + options.length) % options.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (open && options[active] !== undefined && text.trim() === label(minute).trim()) {
        commit(options[active]!);
      } else {
        commitText();
      }
      close();
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.stopPropagation();
        setText(label(minute));
        close();
      }
      return;
    }
    if (event.key === 'Tab') {
      commitText();
      close();
    }
  };

  const activeId = open && options.length > 0 ? `${listId}-${active}` : undefined;

  return (
    <>
      <div
        ref={anchorRef}
        className={`relative inline-flex items-center rounded-control border bg-surface-sunken transition-colors duration-fast ease-standard ${
          SIZE_CLASSES[size]
        } ${invalid ? 'border-danger' : open ? 'border-accent' : 'border-border'} ${
          disabled ? 'opacity-60' : ''
        } ${className}`}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label={aria['aria-label']}
          aria-describedby={aria['aria-describedby']}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!open) commitText();
          }}
          onPointerDown={() => !disabled && setOpen(true)}
          className={`h-full min-w-0 rounded-control bg-transparent pl-2.5 pr-1 tabular-nums text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed ${INPUT_WIDTH[size]}`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
            inputRef.current?.focus();
          }}
          className="flex h-full w-7 shrink-0 items-center justify-center text-text-faint"
        >
          <IconClock size={14} />
        </button>
      </div>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open && !disabled}
        onDismiss={() => {
          commitText();
          close();
        }}
        placement="bottom-start"
        matchAnchorWidth
        closeOnEscape={false}
        id={listId}
        role="listbox"
        aria-label={aria['aria-label']}
        className="max-h-56 rounded-card border border-border bg-surface-overlay p-1 shadow-overlay"
      >
        {options.map((option, index) => (
          <div
            key={option}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={option === minute}
            onPointerMove={() => setActive(index)}
            onClick={() => {
              commit(option);
              close();
              inputRef.current?.focus();
            }}
            className={`cursor-pointer rounded-control px-2 py-1 text-label tabular-nums ${
              index === active ? 'bg-surface-hover text-text' : 'text-text'
            } ${option === minute ? 'font-semibold' : ''}`}
          >
            {label(option)}
          </div>
        ))}
      </FloatingSurface>
    </>
  );
}
