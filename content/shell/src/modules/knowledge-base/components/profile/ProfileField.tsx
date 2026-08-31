import { useId, type ReactNode } from 'react';
import { IconExternal, IconWarning, Input, Label, Textarea } from '~ui';
import { FIELD_META, websiteHref, type BusinessField } from '../../lib/profileFields';

export interface ProfileFieldProps {
  field: BusinessField;
  value: string;
  onChange: (next: string) => void;
  /** Read-only: the role cannot write to this bot's AI configuration. */
  disabled: boolean;
  /** Advisory, from `warnFor`. Shown, never enforced — see below. */
  warning: string | null;
  /** The row's own footer, when it has something to say (a conflict, an error). */
  footer?: ReactNode;
}

/**
 * One profile field: label, control, advisory warning.
 *
 * No explanatory caption under the label. The `hint` on `FIELD_META` is still
 * the wording the lint uses when the field is empty, where it is an answer to
 * a question somebody asked; printed under every input forever it is noise a
 * reader learns to skip past.
 *
 * `~ui`'s `Field` is the save-on-blur primitive and this page is not
 * save-on-blur — it is a draft with one Save button for the whole page, and it
 * has a warning line `Field` has no slot for. So the same arrangement bookings'
 * `FormField` settled on: `~ui` primitives, framed here.
 *
 * The warning is ADVISORY and the wording has to stay that way. The server
 * takes any string, and a business really may have "ring the bell, no phone"
 * where a phone number goes. Telling someone their input looks unusable is
 * helpful; refusing to save it is us being wrong about their business.
 */
export function ProfileField({ field, value, onChange, disabled, warning, footer }: ProfileFieldProps) {
  const meta = FIELD_META[field];
  const id = useId();
  const warningId = `${id}-warning`;
  const link = field === 'website' ? websiteHref(value) : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{meta.label}</Label>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-1 rounded-chip text-xs text-text-muted transition-colors duration-fast ease-standard hover:text-accent focus-visible:focus-ring"
          >
            Open
            <IconExternal size={12} />
          </a>
        ) : null}
      </div>

      {meta.multiline ? (
        /* One row and grow, not a fixed three. An address is one line on most
           bots; anything taller is a box the field has not earned, and next to
           six single-line inputs it reads as a hole in the form. */
        <Textarea
          id={id}
          autoGrow
          rows={1}
          maxRows={8}
          value={value}
          placeholder={meta.placeholder}
          disabled={disabled}
          aria-describedby={warning ? warningId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={meta.placeholder}
          disabled={disabled}
          aria-describedby={warning ? warningId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-faint"
        />
      )}

      {warning ? (
        <p id={warningId} role="status" className="flex items-start gap-1.5 text-xs text-warning">
          <IconWarning size={13} className="mt-px shrink-0" />
          <span>
            {warning} <span className="text-text-muted">Saved as typed either way.</span>
          </span>
        </p>
      ) : null}

      {footer}
    </div>
  );
}
