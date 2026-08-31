import { useEffect, useMemo, useState } from 'react';
import { Button, IconPlus, IconTrash, Input, Select, Tag } from '~ui';
import type { DashboardLocale } from '~api/generated/livechat/graphql';
import {
  addableAttributes,
  attributeRows,
  toStoredValue,
  type AttributeRow,
  type BotAttribute,
  type ContactAttribute,
} from '../lib/contactAttributes';

export interface ContactAttributesProps {
  attributes: readonly ContactAttribute[];
  catalog: ReadonlyMap<string, BotAttribute>;
  custom: readonly BotAttribute[];
  locale: DashboardLocale;
  canEdit: boolean;
  /** Attribute name → why the last write to it did not land. */
  problems: Record<string, string>;
  onSave: (name: string, value: string, label: string) => void;
  onDelete: (name: string) => void;
}

/** What the operator typed is not always what the mutation takes. */
const INVALID: Record<string, string> = {
  boolean: 'Type yes or no.',
  datetime: 'Type a date, or the milliseconds the API stores.',
  long: 'Type a number.',
  double: 'Type a number.',
};

function Row({
  row,
  canEdit,
  problem,
  onSave,
  onDelete,
}: {
  row: AttributeRow;
  canEdit: boolean;
  problem?: string;
  onSave: (value: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(row.raw ?? '');
  const [invalid, setInvalid] = useState<string | null>(null);

  /* Adopt what the server confirmed. `raw` only ever changes because a response
     said so — nothing here is optimistic — so a change means the field is out
     of date, including when the change came from another tab. */
  useEffect(() => {
    setDraft(row.raw ?? '');
    setInvalid(null);
  }, [row.raw]);

  const commit = () => {
    const value = draft.trim();
    if (value === (row.raw ?? '')) return;
    const stored = toStoredValue(value, row.dataType);
    if (stored === null) {
      setInvalid(INVALID[row.dataType] ?? 'That value cannot be stored.');
      return;
    }
    setInvalid(null);
    onSave(stored);
  };

  return (
    <li className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-micro font-medium text-text-muted" title={row.name}>
          {row.label}
        </span>
        {row.system ? <Tag>System</Tag> : null}
      </div>
      {canEdit ? (
        <div className="mt-1 flex items-center gap-1">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label={row.label}
            placeholder="Not set"
          />
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${row.label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-faint transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-danger"
          >
            <IconTrash size={14} />
          </button>
        </div>
      ) : (
        <p className="mt-0.5 break-words text-meta text-text">{row.text || '—'}</p>
      )}
      {/* The typed-value complaint outranks the server's: it is about the
          keystrokes still in the box, and the server's is about a value that
          has since been replaced. */}
      {(invalid ?? problem) ? <p className="mt-1 text-nano text-danger">{invalid ?? problem}</p> : null}
    </li>
  );
}

/**
 * The contact's custom attributes, with the catalog's labels on them.
 *
 * Editing is per row and saves on blur, and nothing here is optimistic: the
 * value on screen is the value the last response carried. That is not caution
 * for its own sake — `contactAttributeUpdate` answers 200 with a contact that
 * simply does not have the attribute when the server declines the name, so an
 * optimistic field is never contradicted and goes on showing a value that
 * exists nowhere but in this browser. `useContactStore` checks the response and
 * `problems` is what it found.
 *
 * System attributes are read-only. They are the bot's own bookkeeping and the
 * API will not take a write to most of them; offering an input that fails
 * silently is worse than offering none.
 */
export function ContactAttributes({
  attributes,
  catalog,
  custom,
  locale,
  canEdit,
  problems,
  onSave,
  onDelete,
}: ContactAttributesProps) {
  const rows = useMemo(() => attributeRows(attributes, catalog, locale), [attributes, catalog, locale]);
  const addable = useMemo(() => addableAttributes(custom, attributes, locale), [custom, attributes, locale]);
  const [adding, setAdding] = useState('');
  const [value, setValue] = useState('');

  const chosen = addable.find((entry) => entry.name === adding);

  const add = () => {
    if (!chosen) return;
    const stored = toStoredValue(value, chosen.dataType);
    if (stored === null) return;
    onSave(chosen.name, stored, chosen.label);
    setAdding('');
    setValue('');
  };

  return (
    <section>
      <h3 className="mb-1 text-micro font-medium uppercase tracking-wide text-text-faint">Attributes</h3>
      {rows.length === 0 ? (
        <p className="text-meta text-text-muted">This contact has no attributes yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <Row
              key={row.name}
              row={row}
              canEdit={canEdit && !row.system}
              problem={problems[row.name]}
              onSave={(stored) => onSave(row.name, stored, row.label)}
              onDelete={() => onDelete(row.name)}
            />
          ))}
        </ul>
      )}

      {canEdit && addable.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          <Select
            value={adding}
            onChange={setAdding}
            options={addable.map((entry) => ({ value: entry.name, label: entry.label }))}
            placeholder="Add an attribute…"
            aria-label="Add an attribute"
            className="w-full"
          />
          {chosen ? (
            <div className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-label={`Value for ${chosen.label}`}
                placeholder="Value"
              />
              <Button size="sm" onClick={add} disabled={value.trim() === ''}>
                <IconPlus size={14} />
                Add
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
