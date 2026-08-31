import type { EditorKind } from '../../lib/attributeValue';
import {
  formatContactField,
  readContactField,
  toContactFieldValue,
  type ContactFieldBindings,
  type ContactFieldKey,
  type ContactFieldKind,
  type ContactFieldSpec,
} from '../../lib/contactFields';
import { ValueEditor } from './ValueEditor';

export interface KeyFieldsProps {
  keys: readonly ContactFieldKey[];
  bindings: ContactFieldBindings;
  /** The contact's attributes as name → raw string. */
  values: Record<string, string>;
  /**
   * `WhatsappContact.phone` — a field ON the contact, not an attribute, and
   * there is no mutation that changes it. When it is there it wins the phone
   * row, read-only.
   */
  contactPhone: string | null;
  canEdit: boolean;
  onSave: (name: string, stored: string, label: string) => Promise<void>;
  onHold: (name: string) => void;
  onRelease: (name: string) => void;
}

/**
 * The handful of fields a salesperson reads first, bound to whatever this bot
 * really calls them.
 *
 * The editor is chosen from the CONVENTION's kind rather than from the
 * attribute's `dataType`, and that is deliberate: every custom attribute this
 * API creates is `dataType: string`, so the dataType would
 * make a close date a text box. The convention knows it is a date; the wire
 * still carries a string either way.
 */
const EDITORS: Record<ContactFieldKind, EditorKind> = {
  phone: 'text',
  email: 'text',
  text: 'text',
  currency: 'text',
  money: 'number',
  date: 'date',
};

/** A value this field cannot read is refused rather than stored as prose. */
function storedFor(spec: ContactFieldSpec, input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return '';
  return readContactField(spec.kind, trimmed).ok ? toContactFieldValue(spec.kind, trimmed) : null;
}

const REFUSAL: Record<ContactFieldKind, string> = {
  phone: 'That value cannot be stored.',
  email: 'That value cannot be stored.',
  text: 'That value cannot be stored.',
  currency: 'That value cannot be stored.',
  money: 'Type a number, without a currency symbol.',
  date: 'Type a date.',
};

export function KeyFields({
  keys,
  bindings,
  values,
  contactPhone,
  canEdit,
  onSave,
  onHold,
  onRelease,
}: KeyFieldsProps) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 @wide/module:grid-cols-2">
      {keys.map((key) => {
        const binding = bindings[key];
        const spec = binding.spec;
        const raw = values[binding.name] ?? '';

        /* The phone the platform itself gave us. Read-only, because the API has
           no mutation for it: `whatsappContactCreateV2` sets it once at birth
           and nothing changes it afterwards. */
        const platformPhone = key === 'phone' && contactPhone !== null;
        const readOnly = !canEdit || binding.system || platformPhone;
        const shown = platformPhone
          ? contactPhone
          : formatContactField(spec.kind, raw, { currency: values[bindings.dealCurrency.name] });

        return (
          <div key={key} className="flex min-w-0 flex-col gap-1">
            <dt className="text-micro font-medium uppercase tracking-wide text-text-faint">{spec.label}</dt>
            <dd className="min-w-0">
              {readOnly ? (
                <p className="break-words text-body text-text">
                  {shown !== null && shown !== '' ? shown : <span className="text-text-faint">Not set</span>}
                </p>
              ) : (
                <ValueEditor
                  kind={EDITORS[spec.kind]}
                  value={raw}
                  label={spec.label}
                  placeholder={spec.placeholder}
                  toStored={(input) => storedFor(spec, input)}
                  invalidMessage={REFUSAL[spec.kind]}
                  onCommit={(stored) => onSave(binding.name, stored, spec.label)}
                  onHold={() => onHold(binding.name)}
                  onRelease={() => onRelease(binding.name)}
                />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
