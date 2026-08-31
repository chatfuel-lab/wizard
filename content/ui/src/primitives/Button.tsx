import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

/**
 * Six variants, and the rule for choosing between them is emphasis, not
 * decoration: one `primary` per surface, `danger` only where something is
 * destroyed, and everything else quiet.
 *
 * The shape is a pill (`rounded-pill`), which is the one place this app departs
 * from its own 6px `rounded-control`: a button is the thing a page is FOR, and
 * a fully round end reads as pressable where a 6px corner reads as a field.
 * Inputs, selects and cells stay at 6px.
 *
 * - `primary` — the one thing this surface is for. Accent fill.
 * - `secondary` — a real action that is not the main one: Retry, Load older,
 *   Cancel beside a primary. Soft neutral fill, no edge.
 * - `ghost` — an action that should not compete with content it sits in:
 *   header actions, row actions, "+ Add", anything in a toolbar. Nothing until
 *   hovered. This is where most buttons in the product live, and it used to
 *   draw a border, which is why every screen looked like a form.
 * - `outline` — the old ghost, kept for the few places a borderless button
 *   would vanish into a busy background.
 * - `danger` / `dangerGhost` — destroy, filled for the confirm and quiet for the
 *   row action that leads to it.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'dangerGhost';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * A square button holding only an icon. Requires an `aria-label` — a control
   * with no words needs a name from somewhere — and the type says so.
   */
  iconOnly?: boolean;
  /** Something is in flight: a spinner takes the icon's place and the button will not fire. */
  loading?: boolean;
  children?: ReactNode;
}

type IconOnlyProps = ButtonProps & { iconOnly: true; 'aria-label': string };
type LabelledProps = ButtonProps & { iconOnly?: false };

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover',
  secondary: 'bg-translucent text-text shadow-secondary-button hover:bg-translucent-strong',
  ghost:
    'bg-transparent text-text-muted hover:bg-surface-hover hover:text-text active:bg-surface-sunken aria-pressed:bg-surface-sunken aria-pressed:text-text aria-expanded:bg-surface-hover aria-expanded:text-text',
  outline: 'border border-border bg-transparent text-text hover:bg-surface-hover active:bg-surface-sunken',
  danger: 'bg-danger text-accent-fg hover:opacity-90 active:opacity-80',
  dangerGhost: 'bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft',
};

/* Heights are the field scale, so a button lines up with the input beside it.
   Icons take their size from here too — a caller may still pass `size` on an
   icon, but does not have to. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-6 gap-1 px-2 text-micro [&_svg]:size-3',
  sm: 'h-field-sm gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
  md: 'h-field gap-2 px-3.5 text-sm [&_svg]:size-4',
};

const SPINNER_SIZE: Record<ButtonSize, number> = { xs: 12, sm: 14, md: 16 };

export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: IconOnlyProps | LabelledProps) {
  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      /* `aspect-square px-0` and the width follows the height, whatever size
         token that is — there is no width scale for fields and there should
         not be one. */
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-pill font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard focus-visible:focus-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${iconOnly ? 'aspect-square px-0' : ''} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={SPINNER_SIZE[size]} className="border-current/30 border-t-current" /> : null}
      {loading && iconOnly ? null : children}
    </button>
  );
}
