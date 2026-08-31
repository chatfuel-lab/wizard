import { useId, type MouseEvent as ReactMouseEvent } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { IconCheck, IconCopy } from '../icons';
import { Button } from '../primitives/Button';
import { Label } from './Label';

export interface CopyFieldProps {
  value: string;
  /** Visible label above the box. Without one, pass `aria-label`. */
  label?: string;
  'aria-label'?: string;
  size?: 'sm' | 'md';
  /** Codes, ids, keys, URLs — anything a human compares glyph by glyph. */
  mono?: boolean;
  onCopied?: () => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CopyFieldProps['size']>, string> = {
  sm: 'h-field-sm pl-2.5 pr-8 text-xs',
  md: 'h-field pl-3 pr-10 text-sm',
};

/**
 * A value to be taken away: an API key, an invite link, a recovery code.
 *
 * Read-only input rather than a span, so it is focusable, selectable and
 * copies with ⌘C like any text — the button is the shortcut, not the only
 * way. Clicking anywhere in the box selects the whole value; the trailing
 * button writes it to the clipboard and swaps to a check for 1.5s while a
 * polite live region says "Copied" for anyone who cannot see the swap.
 */
export function CopyField({
  value,
  label,
  size = 'md',
  mono = false,
  onCopied,
  className = '',
  ...aria
}: CopyFieldProps) {
  const id = useId();
  const { copy, copied } = useCopyToClipboard();

  const selectAll = (event: ReactMouseEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  const onCopy = () => {
    copy(value);
    onCopied?.();
  };

  return (
    <span className={`block ${className}`}>
      {label !== undefined ? <Label htmlFor={id}>{label}</Label> : null}
      <span className={`relative block ${label !== undefined ? 'mt-1' : ''}`}>
        <input
          id={id}
          type="text"
          readOnly
          value={value}
          aria-label={label === undefined ? aria['aria-label'] : undefined}
          onClick={selectAll}
          onFocus={(event) => event.currentTarget.select()}
          className={`w-full truncate rounded-control border border-border bg-surface-sunken text-text focus-visible:focus-ring ${
            SIZE_CLASSES[size]
          } ${mono ? 'font-mono' : ''}`}
        />
        <Button
          iconOnly
          variant="ghost"
          size={size === 'sm' ? 'xs' : 'sm'}
          aria-label={copied ? 'Copied' : 'Copy'}
          onClick={() => void onCopy()}
          className={`absolute right-1 top-1/2 -translate-y-1/2 ${copied ? 'text-success hover:text-success' : ''}`}
        >
          {copied ? <IconCheck /> : <IconCopy />}
        </Button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? 'Copied' : ''}
        </span>
      </span>
    </span>
  );
}
