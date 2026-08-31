import { useCallback, useLayoutEffect, useRef, type Ref, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** Grow with the content instead of scrolling. */
  autoGrow?: boolean;
  /** Starting height in rows. Also the floor when autoGrow is on. */
  rows?: number;
  /** Ceiling for autoGrow, in rows. Past this it scrolls. */
  maxRows?: number;
  /** Shows "n / maxLength" beneath. Requires maxLength. */
  showCount?: boolean;
  /** Danger border and ring; sets `aria-invalid` unless the caller already did. Same contract as Input. */
  invalid?: boolean;
  /**
   * Drop the frame — no border, no background, no focus outline of its own.
   *
   * For a box that is already inside one: a bordered field inside a bordered
   * card is two frames around one thing. The caller's frame then owns the
   * focus signal too, with `focus-within:border-accent`, so there is one ring
   * rather than a ring inside a ring.
   */
  bare?: boolean;
  /**
   * Stretch to the height the caller gives it instead of sizing to its rows.
   *
   * The opposite question from `autoGrow`, which asks the content how tall the
   * box should be. This asks the layout, and is what a box filling a column
   * wants: the spare height goes into the writing area rather than being left
   * blank under it. `rows` becomes the floor only; the two are mutually
   * exclusive and `fill` wins.
   */
  fill?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

const LINE_HEIGHT_FALLBACK = 20;

export function Textarea({
  autoGrow = false,
  rows = 3,
  maxRows,
  showCount = false,
  invalid,
  bare = false,
  fill = false,
  className = '',
  value,
  maxLength,
  ref,
  ...props
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  /* Merged, not replaced. The layout effect below reads `innerRef.current`, so
     a caller-supplied `ref` cannot simply take the `<textarea>` for itself —
     under React 19 `ref` is an ordinary prop, and spreading `...props` after
     it would otherwise overwrite the one autoGrow depends on. */
  const attach = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /* Layout effect, not effect: the height is written before paint, so a pasted
   * paragraph never flashes at the old size.
   *
   * Skipped entirely while filling: the height is then the layout's answer, and
   * writing a measured pixel height would overrule the flex box that was asked
   * for it. */
  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!autoGrow || fill || !node) return;

    const styles = window.getComputedStyle(node);
    const lineHeight = Number.parseFloat(styles.lineHeight) || LINE_HEIGHT_FALLBACK;
    const chrome =
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom) +
      Number.parseFloat(styles.borderTopWidth) +
      Number.parseFloat(styles.borderBottomWidth);

    /* Collapse first: scrollHeight can only ever grow while a height is set,
     * so without this the box ratchets up and never shrinks again. */
    node.style.height = 'auto';
    const content = node.scrollHeight;
    const ceiling = maxRows === undefined ? Infinity : maxRows * lineHeight + chrome;
    const floor = rows * lineHeight + chrome;

    node.style.height = `${Math.min(Math.max(content, floor), ceiling)}px`;
    node.style.overflowY = content > ceiling ? 'auto' : 'hidden';
  }, [autoGrow, fill, rows, maxRows, value]);

  const length = typeof value === 'string' ? value.length : 0;
  const ariaInvalid = props['aria-invalid'];
  const isInvalid = invalid ?? (ariaInvalid === true || ariaInvalid === 'true');

  /* The frame and the plain box are two different strings rather than one with
     overrides bolted on: `border-transparent` after `border-border` relies on
     which utility the stylesheet happens to emit last, and that is not a thing
     to build a component on. */
  const frame = bare
    ? 'bg-transparent text-text placeholder:text-text-faint focus:outline-none disabled:cursor-not-allowed disabled:text-text-faint'
    : `w-full rounded-control border bg-surface-sunken px-3 py-2 text-sm text-text placeholder:text-text-faint focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint ${
        isInvalid ? 'border-danger focus-visible:outline-danger' : 'border-border hover:border-border-strong'
      }`;

  return (
    <span className={fill ? 'flex min-h-0 flex-1 flex-col' : 'block'}>
      <textarea
        ref={attach}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={`${frame} ${fill ? 'min-h-0 w-full flex-1 resize-none' : autoGrow ? 'resize-none' : 'resize-y'} ${className}`}
        {...props}
      />
      {showCount && maxLength !== undefined ? (
        <span
          className={`mt-1 block text-right text-xs tabular-nums ${
            length >= maxLength ? 'text-danger' : 'text-text-faint'
          }`}
        >
          {length} / {maxLength}
        </span>
      ) : null}
    </span>
  );
}
