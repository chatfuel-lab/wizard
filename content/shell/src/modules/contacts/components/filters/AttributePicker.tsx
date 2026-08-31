import { useMemo } from 'react';
import { AttributeType } from '~api/generated/contacts/graphql';
import { Combobox, type ComboboxOption } from '~ui';
import type { AttributeCatalog, CatalogEntry } from '../../hooks/useAttributeCatalog';

export interface AttributePickerProps {
  value: string;
  onChange: (name: string) => void;
  catalog: AttributeCatalog;
  className?: string;
}

/**
 * Which field a condition asks about.
 *
 * Three decisions, all of them forced by how this API treats attributes:
 *
 * - **Free text is allowed.** Writing an attribute creates it instantly and it
 *   is filterable in the same second, so "a field that does not exist yet" is a
 *   real thing to filter on the moment an import or a flow starts writing it.
 *   `onCreate` is therefore not an escape hatch, it is a supported path.
 * - **The count is on every row.** `usersCount` is how many contacts carry a
 *   value. It is the difference between filtering on a field that describes the
 *   audience and one three contacts have ever had, and it is the only signal
 *   the API gives.
 * - **Custom fields come first.** A bot's own fields are what people filter on;
 *   the system ones are mostly plumbing. Within each group the most-used field
 *   is first, which is the order the catalog query already asks for.
 *
 * Group headers would be better than a per-row `custom · 7 contacts`, but
 * `~ui`'s Combobox has no group slot — named in the report rather than
 * hand-rolled here, because a second combobox is a second set of keyboard bugs.
 */
function describeEntry(entry: CatalogEntry): string {
  const parts = [entry.type === AttributeType.Custom ? 'custom' : 'system'];
  if (entry.defaultValue !== null && entry.defaultValue !== '') {
    /* A bot-wide default makes EVERY contact read this field as filled, which
       is what makes "is empty" match nobody. Saying it here is cheaper than
       explaining the empty result afterwards. */
    parts.push(`default “${entry.defaultValue}”`);
  }
  if (entry.usersCount === null) parts.push('count unavailable');
  else if (entry.usersCount === 0) parts.push('no contacts yet');
  else parts.push(`${entry.usersCount.toLocaleString()} contact${entry.usersCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function AttributePicker({ value, onChange, catalog, className }: AttributePickerProps) {
  const options = useMemo<ComboboxOption[]>(() => {
    const rank = (entry: CatalogEntry) => (entry.type === AttributeType.Custom ? 0 : 1);
    const sorted = [...catalog.entries].sort((a, b) => rank(a) - rank(b) || (b.usersCount ?? 0) - (a.usersCount ?? 0));
    const known = sorted.map((entry) => ({
      value: entry.name,
      label: entry.name,
      description: describeEntry(entry),
      keywords: entry.aliases.map((alias) => alias.alias),
    }));
    /* A name typed before the catalog knew it — or one this bot genuinely does
       not have — still has to show as the selected value rather than blank. */
    if (value !== '' && !catalog.byName.has(value)) {
      known.unshift({ value, label: value, description: 'not a field on this bot yet', keywords: [] });
    }
    return known;
  }, [catalog.entries, catalog.byName, value]);

  return (
    <Combobox
      aria-label="Field"
      className={className}
      value={value === '' ? null : value}
      onChange={(next) => onChange(next ?? '')}
      onCreate={(label) => onChange(label.trim())}
      createLabel={(query) => `Filter on “${query}”`}
      options={options}
      loading={catalog.loading}
      placeholder="Pick a field…"
      empty="No field by that name — type it to filter on it anyway"
    />
  );
}
