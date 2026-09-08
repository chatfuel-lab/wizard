import type { ReactNode } from 'react';
import { AttrFilterDefaultOperator, AttributeDataType } from '~api/generated/broadcasts/graphql';
import { Button, ChipInput, DateField, IconTrash, IconWarning, Input, Select, Tag } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import {
  OPERATORS,
  OPERATOR_LABELS,
  dateInputToValue,
  dateValueToInput,
  isNullary,
  isSingleValued,
  type AttrPredicate,
} from '../../lib/audienceFilter';
import type { AudienceIssue } from '../../lib/audienceValidation';

export interface PredicateRowProps {
  predicate: AttrPredicate;
  onChange: (patch: Partial<AttrPredicate>) => void;
  onRemove: () => void;
  catalog: AttributeCatalog;
  /** Only the issues belonging to this row. */
  issues: readonly AudienceIssue[];
  /** The zone a date pick is resolved in — the bot's. */
  zone: string;
  readOnly?: boolean;
  /** The field picker, rendered by the group so it owns the catalog wiring. */
  children: ReactNode;
}

/**
 * One condition: field, operator, value. A copy of the contacts module's
 * `components/filters/PredicateRow.tsx` over this module's model.
 *
 * The value editor is chosen by the operator and the field's type:
 *
 * - **A chip list IS the OR.** Multi-value `comparableValues` behaves like
 *   the same predicate repeated under OR, so `city is Berlin, Munich` needs
 *   no second row.
 * - **A `datetime` field gets a date picker that sends milliseconds** — the
 *   day's midnight in the bot zone — because `dateStrategy` fails live and
 *   `defaultStrategy` is all there is.
 * - **A range takes exactly one value**, and carries the approximate note as
 *   a tag: the server compares every typed reading of it at once.
 *
 * A nullary operator renders NO editor at all: `IS_EMPTY` with a value is
 * `attr_filter_comparable_values_not_allowed`, and a box nobody may use is
 * worse than none.
 */
export function PredicateRow({
  predicate,
  onChange,
  onRemove,
  catalog,
  issues,
  zone,
  readOnly = false,
  children,
}: PredicateRowProps) {
  const dataType = catalog.dataTypeOf(predicate.name);
  const nullary = isNullary(predicate.operator);
  const single = isSingleValued(predicate.operator);
  const isDate = dataType === AttributeDataType.Datetime;
  const errored = issues.some((issue) => issue.level === 'error');
  const notes = issues.filter((issue) => issue.level === 'note');
  const lines = issues.filter((issue) => issue.level !== 'note');
  const [first = ''] = predicate.values;

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-start gap-1.5">
        <div className="min-w-40 flex-1">{children}</div>

        <Select
          aria-label="Operator"
          className="w-44 shrink-0"
          value={predicate.operator}
          disabled={readOnly}
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
          options={OPERATORS.map((operator) => ({ value: operator, label: OPERATOR_LABELS[operator] }))}
        />

        {nullary ? null : isDate ? (
          <div className="w-48 shrink-0">
            <DateField
              aria-label="Date"
              presets={false}
              disabled={readOnly}
              value={dateValueToInput(first, zone) || null}
              onChange={(next) => onChange({ values: [dateInputToValue(next, zone)].filter((v) => v !== '') })}
            />
          </div>
        ) : single ? (
          <Input
            aria-label="Value"
            className="w-48 shrink-0"
            /* Uncontrolled: a controlled box would re-derive its text from
               `values` on every keystroke and normalise under the caret. The
               value is in the key so a write from outside the box remounts it. */
            key={`${predicate.id}:${predicate.operator}:${first}`}
            defaultValue={first}
            invalid={errored}
            disabled={readOnly}
            onBlur={(event) => onChange({ values: [event.target.value.trim()].filter((v) => v !== '') })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        ) : (
          <div className="w-48 shrink-0">
            <ChipInput
              aria-label="Values"
              value={predicate.values.filter((value) => value.trim() !== '')}
              onChange={(values) => onChange({ values })}
              placeholder="Add a value…"
              invalid={errored}
              readOnly={readOnly}
              maxItems={20}
              size="md"
            />
          </div>
        )}

        {notes.map((note) => (
          <span key={note.id} className="flex h-field items-center">
            <Tag tone="warning">{note.message}</Tag>
          </span>
        ))}

        {readOnly ? null : (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Remove the condition on ${predicate.name || 'this field'}`}
            onClick={onRemove}
          >
            <IconTrash size={14} />
          </Button>
        )}
      </div>

      {lines.map((issue) => (
        <p
          key={issue.id}
          className={`flex items-center gap-1 pl-1 text-meta ${issue.level === 'error' ? 'text-danger' : 'text-text-muted'}`}
        >
          <IconWarning size={12} aria-hidden className="shrink-0" />
          {issue.message}
        </p>
      ))}
    </li>
  );
}
