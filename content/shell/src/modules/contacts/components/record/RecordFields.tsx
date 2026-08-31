import { useMemo, useState } from 'react';
import { AttributeDataType } from '~api/generated/contacts/graphql';
import { Alert, Button, Card, Combobox, IconPlus, Switch, useToast } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import type { ContactRecordApi } from '../../hooks/useContactRecord';
import {
  addableAttributes,
  editorFor,
  emptyRowCount,
  fieldRows,
  groupFieldRows,
  invalidValueMessage,
  toStoredValue,
  visibleRows,
  type AddableAttribute,
} from '../../lib/attributeValue';
import type { ContactRecord } from '../../types';
import { FieldRowView } from './FieldRowView';
import { ValueEditor } from './ValueEditor';

export interface RecordFieldsProps {
  contact: ContactRecord;
  catalog: AttributeCatalog;
  canEdit: boolean;
  record: ContactRecordApi;
}

/**
 * Every field this contact carries, system and custom, editable by type.
 *
 * `ContactFull` asks for `attributes` with no `names` argument, so the record
 * arrives with all of them and this tab hides nothing. That is the difference
 * between it and Overview: Overview is a convention about which eight fields
 * matter, this is the truth about what is stored.
 *
 * "Hide empty" is a reading preference, not a filter on the data, and it says
 * how many rows it is hiding — a toggle that silently removes half a page is
 * how a person concludes the data is gone.
 */
export function RecordFields({ contact, catalog, canEdit, record }: RecordFieldsProps) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const toast = useToast();

  /* Clearing a field is the one write on this tab with no box left behind to
     put the complaint in — the row simply keeps its value — so a refusal is
     said out loud instead. */
  const clearField = (name: string, label: string) => {
    void record.deleteAttribute(name).catch((err: unknown) => {
      toast.show({
        tone: 'danger',
        title: `Could not clear ${label}`,
        description: err instanceof Error ? err.message : undefined,
      });
    });
  };

  const rows = useMemo(() => fieldRows(contact.attributes, catalog.byName), [contact.attributes, catalog.byName]);
  const groups = useMemo(() => groupFieldRows(visibleRows(rows, hideEmpty)), [rows, hideEmpty]);
  const hidden = emptyRowCount(rows);

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch
          checked={hideEmpty}
          onChange={setHideEmpty}
          label={hidden > 0 ? `Hide ${hidden} empty ${hidden === 1 ? 'field' : 'fields'}` : 'Hide empty fields'}
          disabled={hidden === 0}
        />
        <span className="text-micro text-text-muted">
          {rows.length} {rows.length === 1 ? 'field' : 'fields'} on this contact
        </span>
      </div>

      {catalog.error ? (
        <Alert tone="warning" title="The attribute catalog did not load">
          Fields still read and write; only the picker below is missing its list, so a new field has to be typed by
          name.
        </Alert>
      ) : null}

      {groups.map((group) => (
        <Card key={group.key} title={group.label}>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {group.rows.map((row) => (
              <FieldRowView
                key={row.name}
                row={row}
                canEdit={canEdit}
                problem={record.problems[row.name]}
                onSave={record.setAttribute}
                onDelete={(name) => clearField(name, row.label)}
                onHold={record.holdField}
                onRelease={record.releaseField}
              />
            ))}
          </ul>
        </Card>
      ))}

      {groups.length === 0 ? (
        <Card>
          <p className="text-body text-text-muted">
            {hideEmpty && rows.length > 0
              ? 'Every field on this contact is empty.'
              : 'This contact carries no fields yet. Add one below and it exists from that moment.'}
          </p>
        </Card>
      ) : null}

      {canEdit ? <AddField contact={contact} catalog={catalog} record={record} /> : null}
    </div>
  );
}

/**
 * Adding a field, and the sentence that has to go with it.
 *
 * There is no create-field mutation in this API. Writing a value to a name the
 * bot does not have IS the create: the attribute exists from that moment, as
 * `type: custom, dataType: string`, and it is filterable immediately. Which
 * is why the picker accepts a name that is not in the
 * catalog as well as one that is — and why the catalog is refreshed afterwards,
 * since the copy this page read is out of date by exactly that field.
 */
function AddField({
  contact,
  catalog,
  record,
}: {
  contact: ContactRecord;
  catalog: AttributeCatalog;
  record: ContactRecordApi;
}) {
  const [chosen, setChosen] = useState<AddableAttribute | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => addableAttributes(catalog.entries, contact.attributes),
    [catalog.entries, contact.attributes],
  );

  const add = async (stored: string) => {
    if (!chosen) return;
    setError(null);
    try {
      await record.setAttribute(chosen.name, stored, chosen.label);
      /* Writing a name the bot did not have CREATES it, so the catalog this
         page read is out of date by exactly that attribute. */
      if (!catalog.byName.has(chosen.name)) catalog.refresh();
      setChosen(null);
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this field');
    }
  };

  return (
    <Card
      title="Add a field"
      description="Pick one the bot already has, or type a new name — writing a value is what creates it."
    >
      <div className="flex flex-col gap-3">
        <Combobox
          aria-label="Field to add"
          value={chosen?.name ?? null}
          options={options.map((option) => ({
            value: option.name,
            label: option.label,
            description: option.name === option.label ? undefined : option.name,
          }))}
          placeholder="Choose or type a field name…"
          empty="Every field this bot has is already on this contact."
          clearable
          onChange={(next) => {
            setChosen(next === null ? null : (options.find((option) => option.name === next) ?? null));
            setValue('');
            setError(null);
          }}
          onCreate={(label) => {
            const name = label.trim();
            if (name === '') return;
            setChosen({ name, label: name, dataType: AttributeDataType.String });
            setValue('');
            setError(null);
          }}
          createLabel={(query) => `Create the field “${query}”`}
        />

        {chosen ? (
          <div className="flex flex-col gap-2">
            <ValueEditor
              kind={editorFor(chosen.dataType)}
              value={value}
              label={`Value for ${chosen.label}`}
              toStored={(input) => toStoredValue(input, chosen.dataType)}
              invalidMessage={invalidValueMessage(chosen.dataType)}
              onCommit={async (stored) => setValue(stored)}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void add(value)} disabled={value.trim() === ''}>
                <IconPlus size={14} /> Add {chosen.label}
              </Button>
              {catalog.byName.has(chosen.name) ? null : (
                <span className="text-micro text-text-muted">
                  New to this bot — it will exist as a text field from the first value.
                </span>
              )}
            </div>
            {error ? <p className="text-micro text-danger">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
