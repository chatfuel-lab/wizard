import { AttributeType } from '~api/generated/contacts/graphql';
import { IconTrash } from '~ui';
import {
  dataTypeBadge,
  editorFor,
  invalidValueMessage,
  storedAsNote,
  toStoredValue,
  type FieldRow,
} from '../../lib/attributeValue';
import { ValueEditor } from './ValueEditor';

export interface FieldRowViewProps {
  row: FieldRow;
  canEdit: boolean;
  /** Why the last write to this field did not land, from the record hook. */
  problem?: string;
  onSave: (name: string, stored: string, label: string) => Promise<void>;
  onDelete: (name: string) => void;
  onHold: (name: string) => void;
  onRelease: (name: string) => void;
}

/**
 * One field of the Fields tab: its name, its type, its value, and the way to
 * remove it.
 *
 * Deleting is not a small action and the label says so out loud — removing the
 * last contact's value for a custom attribute removes the FIELD from the bot's
 * catalog, which is the only "delete field" this API has and
 * the only way to get one back is to write a value again.
 *
 * A system field is read-only. It is the bot's own bookkeeping, the API
 * declines most writes to it, and it declines them silently — an input that
 * fails without saying so is worse than no input.
 */
export function FieldRowView({ row, canEdit, problem, onSave, onDelete, onHold, onRelease }: FieldRowViewProps) {
  const editable = canEdit && !row.system;
  const note = storedAsNote(row.system ? AttributeType.System : AttributeType.Custom, row.dataType);

  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-label font-medium text-text" title={row.name}>
            {row.label}
          </span>
          <span className="shrink-0 text-micro text-text-faint" title={note ?? undefined}>
            {dataTypeBadge(row.dataType)}
          </span>
        </span>
        {editable ? (
          <button
            type="button"
            onClick={() => onDelete(row.name)}
            aria-label={`Clear ${row.label}`}
            title={`Clear ${row.label} on this contact`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-faint transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-danger"
          >
            <IconTrash size={14} />
          </button>
        ) : null}
      </div>

      {editable ? (
        <ValueEditor
          kind={editorFor(row.dataType)}
          value={row.raw ?? ''}
          label={row.label}
          toStored={(input) => toStoredValue(input, row.dataType)}
          invalidMessage={invalidValueMessage(row.dataType)}
          onCommit={(stored) => onSave(row.name, stored, row.label)}
          onHold={() => onHold(row.name)}
          onRelease={() => onRelease(row.name)}
        />
      ) : (
        <p className="break-words text-body text-text">
          {row.text !== '' ? row.text : <span className="text-text-faint">Not set</span>}
        </p>
      )}

      {problem ? <p className="text-micro text-danger">{problem}</p> : null}
    </li>
  );
}
