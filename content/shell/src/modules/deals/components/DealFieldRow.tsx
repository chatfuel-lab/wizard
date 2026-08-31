import { DateField, Field, toISODate } from '~ui';
import type { DealFieldBinding } from '../lib/dealFieldBinding';
import { readField, toAttrValue, toDateInput } from '../lib/dealFieldValue';

export interface DealFieldRowProps {
  binding: DealFieldBinding;
  /** The raw attribute value, or undefined when the deal has none. */
  raw: string | undefined;
  canEdit: boolean;
  onSave: (attrName: string, value: string) => Promise<void>;
}

/**
 * One deal field. Everything except a date goes through `Field`, whose
 * save-on-blur already carries the pending / saved / error states — and whose
 * `validate` is where an unparseable amount is refused before it reaches the
 * API rather than after.
 *
 * Clearing is deliberate: an empty input saves `''`, and the mutation layer
 * turns that into contactAttributeDelete.
 */
export function DealFieldRow({ binding, raw, canEdit, onSave }: DealFieldRowProps) {
  const { spec } = binding;
  const value = readField(spec, raw);
  const save = (next: string) => onSave(binding.name, toAttrValue(spec, next));

  if (spec.kind === 'date') {
    return (
      <div>
        <span className="mb-1 block text-xs font-medium text-text-muted">{spec.label}</span>
        <DateField
          aria-label={spec.label}
          disabled={!canEdit}
          value={toDateInput(value)}
          onChange={(iso) => void save(iso ?? '')}
          min={toISODate(new Date(2000, 0, 1))}
        />
        {value.ok ? null : <Unreadable raw={value.raw} />}
      </div>
    );
  }

  return (
    <div>
      <Field
        label={spec.label}
        value={value.raw}
        placeholder={spec.placeholder}
        onSave={save}
        validate={(next) =>
          next.trim() === '' || readField(spec, next).ok
            ? null
            : `Not a ${spec.kind === 'money' ? 'number' : spec.kind}`
        }
      />
      {value.ok ? null : <Unreadable raw={value.raw} />}
    </div>
  );
}

/** A value something else wrote that this module cannot read. Never render NaN. */
function Unreadable({ raw }: { raw: string }) {
  return (
    <p className="mt-1 text-xs text-warning">Stored as “{raw}” — not a value this field can read. Sums skip it.</p>
  );
}
