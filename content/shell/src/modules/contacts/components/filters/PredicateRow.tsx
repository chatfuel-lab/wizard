import type { ReactNode } from 'react';
import { AttrFilterDefaultOperator, AttributeDataType } from '~api/generated/contacts/graphql';
import { Button, ChipInput, DateField, IconTrash, IconWarning, Input, Select, Tag, Tooltip } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import { OPERATORS, OPERATOR_LABELS, isNullary, isSingleValued, type AttrPredicate } from '../../lib/contactsFilter';
import { dateInputToValue, dateValueToInput } from '../../lib/filterLabels';
import { RANGE_NOTE, isApproximate, type FilterIssue } from '../../lib/filterValidation';

export interface PredicateRowProps {
  predicate: AttrPredicate;
  onChange: (patch: Partial<AttrPredicate>) => void;
  onRemove: () => void;
  catalog: AttributeCatalog;
  /** Only the issues belonging to this row. */
  issues: readonly FilterIssue[];
  /** The field picker, rendered by the group so it owns the catalog wiring. */
  children: ReactNode;
}

/**
 * One condition: field, operator, value.
 *
 * The value editor is chosen by the operator and the field's type, and each of
 * the three shapes is there for a reason the API forced:
 *
 * - **A chip list IS the OR.** Multi-value `comparableValues` behaves in
 *   practice exactly like the same predicate repeated under OR, so `city is
 *   Berlin, Munich` needs no second row. Chips make that visible instead of
 *   asking someone to trust a comma.
 * - **A `datetime` field gets a date picker that sends milliseconds.**
 *   `dateStrategy` fails on every attribute this API has, including genuine
 *   datetime ones, so the value goes through `defaultStrategy` as a timestamp
 *   string like everything else.
 * - **A range takes exactly one value**, and it is badged approximate, because
 *   the server compares every typed reading of it at once.
 *
 * A nullary operator renders NO editor at all: `IS_EMPTY` with a value is
 * `attr_filter_comparable_values_not_allowed`, and an input nobody may use is
 * worse than none.
 */
export function PredicateRow({ predicate, onChange, onRemove, catalog, issues, children }: PredicateRowProps) {
  const dataType = catalog.dataTypeOf(predicate.name);
  const nullary = isNullary(predicate.operator);
  const single = isSingleValued(predicate.operator);
  const isDate = dataType === AttributeDataType.Datetime;
  const errored = issues.some((issue) => issue.level === 'error');
  const [first = ''] = predicate.values;

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-start gap-1.5">
        <div className="min-w-40 flex-1">{children}</div>

        <Select
          aria-label="Operator"
          className="w-40 shrink-0"
          value={predicate.operator}
          onChange={(next) => {
            const operator = next as AttrFilterDefaultOperator;
            /* The value list is re-cut to what the new operator accepts: a
               nullary one keeps none, a range keeps one. Sending values an
               operator ignores is an error on this API, not a no-op. */
            const values = isNullary(operator)
              ? []
              : isSingleValued(operator)
                ? predicate.values.slice(0, 1)
                : predicate.values;
            onChange({ operator, values });
          }}
          options={OPERATORS.map((operator) => ({
            value: operator,
            label: OPERATOR_LABELS[operator],
          }))}
        />

        {nullary ? (
          <span className="flex h-field w-48 shrink-0 items-center text-meta text-text-faint">No value needed</span>
        ) : isDate ? (
          <div className="w-48 shrink-0">
            <DateField
              aria-label="Date"
              /* No presets: DateField's are close-date presets (Today, End of
                 quarter) and a filter wants the past — "30 days ago" is not on
                 that menu. The bar's last-message control is where the rolling
                 windows live. */
              presets={false}
              value={dateValueToInput(first) || null}
              onChange={(next) => onChange({ values: [dateInputToValue(next)].filter((v) => v !== '') })}
            />
          </div>
        ) : single ? (
          <Input
            aria-label="Value"
            className={`w-48 shrink-0 ${errored ? 'border-danger' : ''}`}
            /* Uncontrolled: a controlled box would re-derive its text from
               `values` on every keystroke and normalise under the caret. The
               value is in the key so a write from OUTSIDE the box — applying a
               saved view, a rolling window recomputed on apply — remounts it
               instead of leaving the old text sitting in a row that no longer
               says that. Typing cannot trigger it: the value only moves on
               blur, by which point there is no caret to lose. */
            key={`${predicate.id}:${predicate.operator}:${first}`}
            defaultValue={first}
            placeholder="1000"
            aria-invalid={errored || undefined}
            onBlur={(event) => onChange({ values: [event.target.value.trim()].filter((v) => v !== '') })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        ) : (
          <div className="w-48 shrink-0">
            <ChipInput
              aria-label="Values — any one of them matches"
              value={predicate.values.filter((value) => value.trim() !== '')}
              onChange={(values) => onChange({ values })}
              placeholder="Add a value…"
              invalid={errored}
              maxItems={20}
              size="md"
            />
          </div>
        )}

        {isApproximate(predicate) ? (
          <Tooltip label={RANGE_NOTE}>
            <span className="flex h-field items-center">
              <Tag tone="warning">approx</Tag>
            </span>
          </Tooltip>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Remove the condition on ${predicate.name || 'this field'}`}
          onClick={onRemove}
        >
          <IconTrash size={14} />
        </Button>
      </div>

      {issues.map((issue) => (
        <p
          key={issue.id}
          className={`flex items-start gap-1 pl-1 text-meta ${
            issue.level === 'error' ? 'text-danger' : 'text-text-muted'
          }`}
        >
          <IconWarning size={12} aria-hidden className="mt-0.5 shrink-0" />
          {issue.message}
        </p>
      ))}
    </li>
  );
}
