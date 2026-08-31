import { forwardRef, useState, type ChangeEvent } from 'react';
import { IconEye, IconEyeOff } from '../icons';
import { scorePassword, strengthLabel, type PasswordScore } from '../lib/app/password';
import { Button } from '../primitives/Button';
import { Input, type InputProps } from '../primitives/Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /**
   * Required, not defaulted: a browser fills a password field from the
   * hint, and the wrong one on a sign-up form autofills the CURRENT password
   * into "choose a new one". The form knows which it is; the input does not.
   */
  autoComplete: 'current-password' | 'new-password';
  /** Four segments and a word under the field. For the new-password forms. */
  showStrength?: boolean;
  /** Replace the built-in heuristic (lib/app/password) with the server's, or zxcvbn's. */
  strengthOf?: (value: string) => PasswordScore;
}

/* Fill colour per score. Score 0 paints nothing; a single lit segment is
   danger, two are warning, three and four are success — the same ramp a form
   error → warning → saved uses everywhere else. */
const SEGMENT_TONE: Record<PasswordScore, string> = {
  0: '',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
};

const LABEL_TONE: Record<PasswordScore, string> = {
  0: 'text-text-muted',
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
};

const SEGMENTS: readonly PasswordScore[] = [1, 2, 3, 4];

/**
 * A password field with a show/hide toggle in its trailing slot, and an
 * optional strength meter beneath.
 *
 * The toggle is a real button — focusable, `aria-pressed`, labelled — that
 * flips the input's `type` and nothing else, so the value survives the flip
 * whether the field is controlled or not. The meter reads the value either
 * way too: from the `value` prop when the field is controlled, from its own
 * onChange echo when it is not.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { showStrength = false, strengthOf = scorePassword, className = '', value, onChange, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  /* Only read when the field is uncontrolled; a controlled field's `value` wins
     and this echo is simply never consulted. */
  const [echo, setEcho] = useState('');
  const current = typeof value === 'string' ? value : echo;
  const score = strengthOf(current);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEcho(event.target.value);
    onChange?.(event);
  };

  return (
    <span className="block">
      <span className="relative block">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          spellCheck={false}
          autoCapitalize="off"
          className={`pr-10 ${className}`}
          {...props}
        />
        <Button
          iconOnly
          variant="ghost"
          size="sm"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={props.disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </Button>
      </span>

      {showStrength ? (
        <span className="mt-2 block">
          <span className="grid grid-cols-4 gap-1" aria-hidden>
            {SEGMENTS.map((segment) => (
              <span
                key={segment}
                className={`h-1 rounded-full transition-colors duration-fast ease-standard ${
                  segment <= score ? SEGMENT_TONE[score] : 'bg-border'
                }`}
              />
            ))}
          </span>
          {/* Polite, and only when there is something to say: an empty field
              announces nothing, so tabbing through the form stays quiet. */}
          <span aria-live="polite" className={`mt-1 block text-xs ${LABEL_TONE[score]}`}>
            {current.length > 0 ? `Password strength: ${strengthLabel(score)}` : ''}
          </span>
        </span>
      ) : null}
    </span>
  );
});
