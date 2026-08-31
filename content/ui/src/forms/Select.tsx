import { IconChevronDown } from '../icons';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** So a <Label htmlFor> or a FormField can own the naming instead of aria-label. */
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  /** Sizing for the control: goes on the wrapper, so `w-40` still means 40. */
  className?: string;
}

/**
 * A native select wearing the design system's clothes.
 *
 * Native on purpose — keyboard, touch, the platform's own long-list behaviour
 * and a screen reader's select semantics all come free, and none of them are
 * worth reimplementing for a list of six stages.
 *
 * What is NOT free is the look. A bare `<select>` keeps the platform's own
 * chevron, which sits hard against the right edge with no padding of ours, in
 * the platform's own colour, at the platform's own size — next to an `Input`
 * or a `Button` it reads as a control from a different product. So:
 * `appearance-none` removes it, `pr-8` reserves the space, and the chevron is
 * drawn here from the same icon set every other control uses, in a token
 * colour, `pointer-events-none` so it never eats the click that opens the list.
 *
 * `className` lands on the WRAPPER, because every caller passes sizing (`w-40`,
 * `w-full`, `shrink-0`) and sizing belongs to the box, not to the input inside
 * it.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  id,
  name,
  required,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        id={id}
        name={name}
        required={required}
        aria-label={rest['aria-label']}
        aria-labelledby={rest['aria-labelledby']}
        aria-describedby={rest['aria-describedby']}
        aria-invalid={rest['aria-invalid']}
        className="h-field w-full appearance-none rounded-control border border-border bg-surface-sunken pl-2.5 pr-8 text-sm text-text hover:border-border-strong focus-visible:focus-ring disabled:cursor-not-allowed disabled:border-border disabled:text-text-faint"
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={14}
        aria-hidden
        className={`pointer-events-none absolute right-2.5 ${disabled ? 'text-text-faint' : 'text-text-muted'}`}
      />
    </span>
  );
}
