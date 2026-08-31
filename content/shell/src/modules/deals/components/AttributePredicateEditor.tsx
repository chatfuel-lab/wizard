import { Button, Combobox, IconPlus, IconTrash, Input, Select, Tooltip } from '~ui';
import { AttrFilterDefaultOperator } from '~api/generated/deals/graphql';
import { isNullary, type AttrPredicate } from '../lib/dealsFilter';
import {
  OPERATORS,
  OPERATOR_LABELS,
  formatValues,
  isRangeOperator,
  isSingleValued,
  parseValues,
} from '../lib/dealsSegment';
import { addPredicate, removePredicate, updatePredicate } from '../lib/dealsTableStore';

export interface AttributePredicateEditorProps {
  predicates: AttrPredicate[];
  onChange: (next: AttrPredicate[]) => void;
  /** Deal-field names first; any attribute name can still be typed in. */
  attributeNames: readonly string[];
}

/**
 * The attribute filters, and the whole reason engine C exists.
 *
 * Two deliberate details:
 *
 * - The value input is **uncontrolled and commits on blur or Enter**. A
 *   controlled input would have to re-derive its text from `values` on every
 *   keystroke, so typing `Referral, ` would be normalized to `Referral` under
 *   the caret — and every keystroke would also be a new segment query.
 * - The attribute Combobox accepts a name that is not in the list. The deal
 *   fields are only a convention; a bot's own attribute is just as valid a
 *   thing to filter on, and `contactAttributeUpdate` is what defines one.
 *
 * Every list edit goes through a pure function in `dealsTableStore.ts`, so
 * predicate ids stay deterministic — an id that changed per render would make
 * the `FilterID` change with it and refetch forever.
 */
export function AttributePredicateEditor({ predicates, onChange, attributeNames }: AttributePredicateEditorProps) {
  const options = attributeNames.map((name) => ({ value: name, label: name }));

  const add = () =>
    onChange(
      addPredicate(predicates, {
        name: attributeNames[0] ?? '',
        operator: AttrFilterDefaultOperator.Is,
        values: [],
      }),
    );

  return (
    <div className="w-[30rem] max-w-[80vw] space-y-2">
      <p className="text-xs text-text-muted">
        Attribute filters run over every contact, not only deals — the table says so while one is on.
      </p>

      {predicates.length === 0 ? (
        <p className="rounded-control border border-dashed border-border px-3 py-4 text-center text-xs text-text-faint">
          No attribute filters. The list is live and deal-isolated.
        </p>
      ) : null}

      {predicates.map((predicate) => (
        <div key={predicate.id} className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <Combobox
              aria-label="Attribute"
              value={predicate.name === '' ? null : predicate.name}
              onChange={(value) => onChange(updatePredicate(predicates, predicate.id, { name: value ?? '' }))}
              onCreate={(label) => onChange(updatePredicate(predicates, predicate.id, { name: label }))}
              createLabel={(query) => `Filter on “${query}”`}
              options={options}
              placeholder="Attribute…"
            />
          </div>

          <Select
            aria-label="Operator"
            className="w-36 shrink-0"
            value={predicate.operator}
            onChange={(value) =>
              onChange(
                updatePredicate(predicates, predicate.id, {
                  operator: value as AttrFilterDefaultOperator,
                  /* IS_EMPTY keeps no operand, and a range takes exactly one —
                     dropping the rest here beats sending values the operator
                     silently ignores. */
                  values: parseValues(formatValues(predicate.values), value as AttrFilterDefaultOperator),
                }),
              )
            }
            options={OPERATORS.map((operator) => ({
              value: operator,
              label: OPERATOR_LABELS[operator],
            }))}
          />

          {isNullary(predicate.operator) ? (
            <div className="w-32 shrink-0" />
          ) : (
            <div className="w-32 shrink-0">
              <Input
                aria-label="Value"
                /* Remounts when the operator changes, so the default value
                   follows the new parsing rule. */
                key={`${predicate.id}:${predicate.operator}`}
                defaultValue={formatValues(predicate.values)}
                placeholder={isSingleValued(predicate.operator) ? '1000' : 'a, b'}
                title={
                  isRangeOperator(predicate.operator)
                    ? 'Compared as text, number and date at once — approximate by design.'
                    : undefined
                }
                onBlur={(event) =>
                  onChange(
                    updatePredicate(predicates, predicate.id, {
                      values: parseValues(event.target.value, predicate.operator),
                    }),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            </div>
          )}

          <Tooltip label="Remove filter">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove filter on ${predicate.name || 'attribute'}`}
              onClick={() => onChange(removePredicate(predicates, predicate.id))}
            >
              <IconTrash size={14} />
            </Button>
          </Tooltip>
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={add}>
        <IconPlus size={14} />
        Add filter
      </Button>
    </div>
  );
}
