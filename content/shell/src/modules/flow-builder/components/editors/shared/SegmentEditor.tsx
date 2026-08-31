import { useMemo, useState } from 'react';
import { errorMessageFor } from '~api';
import { Button, IconPlus, IconTrash, Select, Tag } from '~ui';
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  type Platform,
  type SegmentInput,
  type SegmentPartsFragment,
} from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../../hooks/useAttributeSuggestions';
import {
  buildSegmentInput,
  newAttributeRow,
  toSegmentModel,
  VALUELESS_OPERATORS,
  type AttributeRow,
} from '../../../lib/segmentInput';

const OPERATOR_LABELS: Record<AttrFilterDefaultOperator, string> = {
  [AttrFilterDefaultOperator.Is]: 'is',
  [AttrFilterDefaultOperator.IsNot]: 'is not',
  [AttrFilterDefaultOperator.StartsWith]: 'starts with',
  [AttrFilterDefaultOperator.Contains]: 'contains',
  [AttrFilterDefaultOperator.Lt]: '<',
  [AttrFilterDefaultOperator.Gt]: '>',
  [AttrFilterDefaultOperator.IsEmpty]: 'is empty',
  [AttrFilterDefaultOperator.IsNotEmpty]: 'is not empty',
};

export interface SegmentEditorProps {
  segment: SegmentPartsFragment;
  platform: Platform;
  /** Whole-segment save — segments are written wholesale (SegmentInput). */
  onSave: (input: SegmentInput) => Promise<void>;
  /** filterIDs carrying segmentErrors — their rows get the error tone. */
  errorFilterIds?: ReadonlySet<string>;
}

/**
 * Attribute-condition rows (attribute / operator / value) + AND/OR, over the
 * segmentInput round-trip: rows this form cannot represent (tags, stored
 * segments, date strategies, nested segments, multi-value filters) are shown
 * as read-only chips and preserved verbatim on save — never destroyed by the
 * wholesale write. Edits stage locally; one Save fires the segment setter.
 */
export function SegmentEditor({ segment, platform, onSave, errorFilterIds }: SegmentEditorProps) {
  const model = useMemo(() => toSegmentModel(segment), [segment]);
  const [rows, setRows] = useState<AttributeRow[] | null>(null);
  const [resultOperator, setResultOperator] = useState<BoolOperator | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestions = useAttributeSuggestions(platform);

  const draftRows = rows ?? model.rows;
  const draftOperator = resultOperator ?? model.resultOperator;
  const dirty = rows !== null || resultOperator !== null;

  const patchRow = (filterId: string, patch: Partial<AttributeRow>) =>
    setRows(draftRows.map((row) => (row.filterId === filterId ? { ...row, ...patch } : row)));

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      await onSave(buildSegmentInput(segment, draftRows, draftOperator));
      setRows(null);
      setResultOperator(null);
    } catch (err) {
      setError(errorMessageFor(err, {}));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-text-muted">Conditions</div>
        {draftRows.length > 1 ? (
          <Select
            aria-label="Combine conditions with"
            value={draftOperator}
            options={[
              { value: BoolOperator.And, label: 'ALL match (AND)' },
              { value: BoolOperator.Or, label: 'ANY matches (OR)' },
            ]}
            onChange={(op) => setResultOperator(op as BoolOperator)}
          />
        ) : null}
      </div>
      {draftRows.map((row) => {
        const valueless = VALUELESS_OPERATORS.includes(row.operator);
        const hasError = errorFilterIds?.has(row.filterId);
        return (
          <div
            key={row.filterId}
            className={`space-y-1.5 rounded-lg border p-2 ${hasError ? 'border-danger' : 'border-border'}`}
          >
            <div className="flex items-center gap-1.5">
              <input
                value={row.attributeName}
                placeholder="attribute"
                list="segment-editor-attrs"
                onChange={(e) => patchRow(row.filterId, { attributeName: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete condition"
                onClick={() => setRows(draftRows.filter((r) => r.filterId !== row.filterId))}
              >
                <IconTrash size={13} />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Select
                aria-label="Operator"
                value={row.operator}
                options={Object.values(AttrFilterDefaultOperator).map((op) => ({
                  value: op,
                  label: OPERATOR_LABELS[op] ?? op,
                }))}
                onChange={(op) => patchRow(row.filterId, { operator: op as AttrFilterDefaultOperator })}
              />
              {!valueless ? (
                <input
                  value={row.value}
                  placeholder="value"
                  onChange={(e) => patchRow(row.filterId, { value: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              ) : null}
            </div>
          </div>
        );
      })}
      <datalist id="segment-editor-attrs">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {model.passthroughLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {model.passthroughLabels.map((label, i) => (
            <Tag key={i}>{label} — kept as is</Tag>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setRows([...draftRows, newAttributeRow()])}>
          <IconPlus size={13} /> Add condition
        </Button>
        {dirty ? (
          <Button size="sm" disabled={pending} onClick={() => void save()}>
            {pending ? 'Saving…' : 'Save conditions'}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
