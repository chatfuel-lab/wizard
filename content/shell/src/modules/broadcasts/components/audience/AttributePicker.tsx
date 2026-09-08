import { useMemo } from 'react';
import { AttributeType } from '~api/generated/broadcasts/graphql';
import { Combobox, type ComboboxOption } from '~ui';
import type { AttributeCatalog, CatalogEntry } from '../../hooks/useAttributeCatalog';

export interface AttributePickerProps {
  value: string;
  onChange: (name: string) => void;
  catalog: AttributeCatalog;
  disabled?: boolean;
  className?: string;
}

/**
 * Which field a condition asks about. A copy of the contacts module's
 * `components/filters/AttributePicker.tsx` over this module's catalog.
 *
 * - **Free text is allowed.** A name the bot does not have selects nobody
 *   and creates nothing when it sits in a FILTER (confirmed live) — the
 *   parameter setter is the one that creates attributes, and that picker is
 *   another step's. So a field an import or a flow is about to start writing
 *   can be filtered on before the catalog knows it.
 * - **The count is on every row.** `usersCount` is how many contacts carry a
 *   value: the difference between a field that describes the audience and one
 *   three contacts ever had.
 * - **Custom fields come first.** A bot's own fields are what people filter
 *   on; the system ones are mostly plumbing. Within each the most-used field
 *   is first, which is the order the catalog query already asks for.
 */
function describeEntry(entry: CatalogEntry): string | undefined {
  if (entry.usersCount === null || entry.usersCount === 0) return undefined;
  return `${entry.usersCount.toLocaleString()} ${entry.usersCount === 1 ? 'contact' : 'contacts'}`;
}

export function AttributePicker({ value, onChange, catalog, disabled = false, className }: AttributePickerProps) {
  const options = useMemo<ComboboxOption[]>(() => {
    const rank = (entry: CatalogEntry) => (entry.type === AttributeType.Custom ? 0 : 1);
    const sorted = [...catalog.entries].sort(
      (a, b) => rank(a) - rank(b) || (b.usersCount ?? 0) - (a.usersCount ?? 0) || a.name.localeCompare(b.name),
    );
    const known: ComboboxOption[] = sorted.map((entry) => ({
      value: entry.name,
      label: entry.name,
      description: describeEntry(entry),
      group: entry.type === AttributeType.Custom ? 'Custom fields' : 'System fields',
    }));
    /* A name typed before the catalog knew it — or one this bot does not
       have — still has to show as the selected value rather than blank. */
    if (value !== '' && !catalog.byName.has(value)) known.unshift({ value, label: value });
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
      disabled={disabled}
      placeholder="Pick a field…"
      empty="No field by that name"
    />
  );
}
