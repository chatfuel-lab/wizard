import { Fragment } from 'react';
import { BoolOperator } from '~api/generated/broadcasts/graphql';
import { Alert, Button, IconPlus, IconTrash, SegmentedControl, Tag } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import {
  GROUP_OPERATOR_LABELS,
  addGroup,
  addPredicate,
  predicateCount,
  removeGroup,
  removePredicate,
  updateGroup,
  updatePredicate,
  type AudienceFilter,
} from '../../lib/audienceFilter';
import type { PassthroughFilter } from '../../lib/audienceSegment';
import {
  MAX_GROUPS,
  MAX_PREDICATES,
  filterLevelIssues,
  issuesFor,
  type AudienceIssue,
} from '../../lib/audienceValidation';
import { AttributePicker } from './AttributePicker';
import { PredicateRow } from './PredicateRow';

export interface FilterGroupBuilderProps {
  filter: AudienceFilter;
  onFilterChange: (next: AudienceFilter) => void;
  catalog: AttributeCatalog;
  issues: readonly AudienceIssue[];
  /** The zone a date pick is resolved in — the bot's. */
  zone: string;
  /** Filters the campaign carries that the builder has no row for: shown as they read, removable, never edited. */
  passthrough?: readonly PassthroughFilter[];
  onRemovePassthrough?: (id: string) => void;
  readOnly?: boolean;
}

const JOIN_OPTIONS = [
  { value: BoolOperator.And, label: GROUP_OPERATOR_LABELS[BoolOperator.And] },
  { value: BoolOperator.Or, label: GROUP_OPERATOR_LABELS[BoolOperator.Or] },
];

const MATCH_OPTIONS = [
  { value: BoolOperator.And, label: 'all' },
  { value: BoolOperator.Or, label: 'any' },
];

/**
 * The nested AND/OR builder. A copy of the contacts module's
 * `components/filters/FilterGroupBuilder.tsx` over this module's model.
 *
 * **Two levels, and exactly two.** `SegmentInput` has a single
 * `resultOperator`; the second level exists only because `FilterInput` has a
 * `byInFlightSegment` slot that nests a segment inside a filter. One group
 * flattens to the outer segment; two or more nest (`lib/audienceSegment.ts`).
 * Groups are joined by one operator — the control between them is the same
 * value drawn as many times as there are joins.
 *
 * **It applies as you type, and that is safe.** `usableGroups` drops a
 * nameless or valueless condition before `buildSegment` sees it, and the hook
 * writes and counts only while no error stands, so a half-built row narrows
 * nothing and the figure never describes one. What it *can* do is make
 * someone believe a row is working when it is not — which is what the red
 * line under it is for.
 *
 * **The caps are enforced by the controls.** The server's answer to a segment
 * it dislikes is a generic error with no field named, so the add buttons stop
 * before the request rather than a sentence apologising after it.
 */
export function FilterGroupBuilder({
  filter,
  onFilterChange,
  catalog,
  issues,
  zone,
  passthrough = [],
  onRemovePassthrough,
  readOnly = false,
}: FilterGroupBuilderProps) {
  const total = predicateCount(filter);
  const atCap = total >= MAX_PREDICATES;
  const groupsFull = filter.groups.length >= MAX_GROUPS;
  const topIssues = filterLevelIssues(issues);
  const topPassthrough = passthrough.filter(
    (entry) => entry.groupId === null || !filter.groups.some((group) => group.id === entry.groupId),
  );
  const joins = filter.groups.length + (topPassthrough.length > 0 ? 1 : 0);

  const passthroughRow = (entry: PassthroughFilter) => (
    <li key={entry.id} className="flex items-center gap-1.5">
      <span className="flex h-field min-w-0 flex-1 items-center truncate text-label text-text">{entry.text}</span>
      {readOnly || !onRemovePassthrough ? null : (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Remove ${entry.text}`}
          onClick={() => onRemovePassthrough(entry.id)}
        >
          <IconTrash size={14} />
        </Button>
      )}
    </li>
  );

  /* Read-only draws the value, not a control that looks live and is not. */
  const joiner = (key: string) => (
    <div key={key} className="flex items-center justify-center py-1">
      {readOnly ? (
        <Tag>{GROUP_OPERATOR_LABELS[filter.groupOperator]}</Tag>
      ) : (
        <SegmentedControl
          aria-label="Join the groups with all or any"
          size="sm"
          value={filter.groupOperator}
          onChange={(next) => onFilterChange({ ...filter, groupOperator: next })}
          options={JOIN_OPTIONS}
        />
      )}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {filter.groups.map((group, index) => {
        const inGroup = passthrough.filter((entry) => entry.groupId === group.id);
        /* The last row's removal takes the group with it — unless the group
           still holds a filter read from the campaign, which stays on screen
           until it is removed on its own. */
        const onRemoveRow = (predicateId: string) =>
          inGroup.length > 0
            ? updateGroup(filter, group.id, {
                predicates: group.predicates.filter((predicate) => predicate.id !== predicateId),
              })
            : removePredicate(filter, group.id, predicateId);
        return (
          <Fragment key={group.id}>
            {index > 0 ? joiner(`join-${group.id}`) : null}
            <section className="rounded-card border border-border bg-surface-raised p-2">
              <header className="mb-2 flex items-center gap-2">
                <span className="text-meta text-text-muted">Match</span>
                {readOnly ? (
                  <Tag>{group.operator === BoolOperator.And ? 'all' : 'any'}</Tag>
                ) : (
                  <SegmentedControl
                    aria-label={`Match all or any inside group ${index + 1}`}
                    size="sm"
                    value={group.operator}
                    onChange={(next) => onFilterChange(updateGroup(filter, group.id, { operator: next }))}
                    options={MATCH_OPTIONS}
                  />
                )}
                {readOnly ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className="ml-auto"
                    aria-label={filter.groups.length > 1 ? `Remove group ${index + 1}` : 'Remove these conditions'}
                    onClick={() => onFilterChange(removeGroup(filter, group.id))}
                  >
                    <IconTrash size={14} />
                  </Button>
                )}
              </header>

              <ul className="flex flex-col gap-2">
                {group.predicates.map((predicate) => (
                  <PredicateRow
                    key={predicate.id}
                    predicate={predicate}
                    catalog={catalog}
                    issues={issuesFor(issues, group.id, predicate.id)}
                    zone={zone}
                    readOnly={readOnly}
                    onChange={(patch) => onFilterChange(updatePredicate(filter, group.id, predicate.id, patch))}
                    onRemove={() => onFilterChange(onRemoveRow(predicate.id))}
                  >
                    <AttributePicker
                      value={predicate.name}
                      catalog={catalog}
                      disabled={readOnly}
                      onChange={(name) => onFilterChange(updatePredicate(filter, group.id, predicate.id, { name }))}
                    />
                  </PredicateRow>
                ))}
                {inGroup.map(passthroughRow)}
              </ul>

              {readOnly ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={atCap}
                  onClick={() => onFilterChange(addPredicate(filter, group.id))}
                >
                  <IconPlus size={14} />
                  Condition
                </Button>
              )}
            </section>
          </Fragment>
        );
      })}

      {topPassthrough.length > 0 ? (
        <>
          {joins > 1 ? joiner('join-passthrough') : null}
          <section className="rounded-card border border-border bg-surface-raised p-2">
            <ul className="flex flex-col gap-2">{topPassthrough.map(passthroughRow)}</ul>
          </section>
        </>
      ) : null}

      {readOnly ? null : (
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={atCap || groupsFull}
            onClick={() => onFilterChange(addGroup(filter))}
          >
            <IconPlus size={14} />
            {filter.groups.length === 0 ? 'Add a condition' : 'Add a group'}
          </Button>
        </div>
      )}

      {topIssues.map((issue) => (
        <Alert key={issue.id} tone={issue.level === 'error' ? 'danger' : 'warning'}>
          {issue.message}
        </Alert>
      ))}
    </div>
  );
}
