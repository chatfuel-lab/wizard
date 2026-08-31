import { useMemo } from 'react';
import { Combobox, IconWarning, type ComboboxOption } from '~ui';
import type { AttributeNode } from '../../types';

export interface AttributePickerProps {
  /** The attribute name (`captures[].attribute.name` — written as `name`). Empty = none chosen. */
  value: string;
  onChange: (next: string) => void;
  /** `useCatalog().attributes` — the bot's custom attributes with `usersCount`. */
  attributes: AttributeNode[];
  /** Typing a name that is not in the catalog offers "Create «x»"; the API creates it on write. */
  allowCreate: boolean;
  disabled?: boolean;
}

/** Live: `SystemAttributeIsNotAllowed` comes back as a soft validation error for these. */
export const SYSTEM_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set([
  'name',
  'first name',
  'last name',
  'phone',
  'email',
]);

export const isSystemAttributeName = (name: string): boolean =>
  SYSTEM_ATTRIBUTE_NAMES.has(name.trim().toLocaleLowerCase());

const contacts = (n: number): string => `${n} ${n === 1 ? 'contact' : 'contacts'}`;

/**
 * Single-select over the attribute catalog for a lead-qualification capture:
 * name + "42 contacts". A name that is not in the catalog (created on write,
 * or a catalog that has not loaded) still shows as the value; system property
 * names get the warning the API would give.
 */
export function AttributePicker({ value, onChange, attributes, allowCreate, disabled = false }: AttributePickerProps) {
  const options = useMemo<ComboboxOption[]>(() => {
    const out: ComboboxOption[] = attributes.map((a) => ({
      value: a.botAttribute.name,
      label: a.botAttribute.name,
      description: contacts(a.usersCount ?? 0),
    }));
    const current = value.trim();
    if (current && !attributes.some((a) => a.botAttribute.name === current)) {
      out.unshift({
        value: current,
        label: current,
        description: isSystemAttributeName(current) ? 'System property' : 'New attribute — created on save',
      });
    }
    return out;
  }, [attributes, value]);

  const system = isSystemAttributeName(value);

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        value={value.trim() === '' ? null : value.trim()}
        onChange={(next) => onChange(next ?? '')}
        options={options}
        placeholder="Attribute…"
        onCreate={allowCreate && !disabled ? (label) => onChange(label.trim()) : undefined}
        createLabel={(query) => `Create “${query}”`}
        clearable={!disabled}
        disabled={disabled}
        empty={allowCreate ? 'Type a name to create it' : 'No attribute matches'}
        aria-label="Attribute"
      />
      {system ? (
        <span className="flex items-center gap-1 text-xs text-warning" role="alert">
          <IconWarning size={12} /> System properties are not allowed — pick or create a custom attribute.
        </span>
      ) : null}
    </div>
  );
}
