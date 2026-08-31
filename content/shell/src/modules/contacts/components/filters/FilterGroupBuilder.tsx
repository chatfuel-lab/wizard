import { BoolOperator } from '~api/generated/contacts/graphql';
import { Alert, Button, IconPlus, IconTrash, IconWarning, Select } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import {
  addGroup,
  addPredicate,
  removeGroup,
  removePredicate,
  updateGroup,
  updatePredicate,
  type ContactsFilter,
} from '../../lib/contactsFilter';
import {
  MAX_GROUPS,
  MAX_PREDICATES,
  filterLevelIssues,
  issuesFor,
  predicateCount,
  type FilterIssue,
} from '../../lib/filterValidation';
import { AttributePicker } from './AttributePicker';
import { PredicateRow } from './PredicateRow';

export interface FilterGroupBuilderProps {
  filter: ContactsFilter;
  onFilterChange: (next: ContactsFilter) => void;
  catalog: AttributeCatalog;
  issues: readonly FilterIssue[];
}

const MATCH_OPTIONS = [
  { value: BoolOperator.And, label: 'all' },
  { value: BoolOperator.Or, label: 'any' },
];

/**
 * The nested AND/OR builder — the one control the whole filtering story is
 * judged on.
 *
 * **Two levels, and exactly two.** `SegmentInput` has a single
 * `resultOperator`; the second level exists only because `FilterInput` has a
 * `byInFlightSegment` slot that nests a segment inside a filter. Depth 3
 * answered live, so a third level is *possible* — it is not offered because
 * there is no question a third level asks that two cannot, and every level
 * costs a reader something. One group flattens to the outer segment; two or
 * more nest (`lib/contactsSegment.ts`).
 *
 * **It applies as you type, and that is safe.** `usableGroups` drops a
 * nameless or valueless condition before `buildSegment` ever sees it, so a
 * half-built row narrows nothing and cannot produce an invalid segment. What it
 * *can* do is make someone believe a row is working when it is not — which is
 * what the red line under it is for.
 *
 * **The cap is enforced here, not apologised for later.** The server's answer
 * to a segment it dislikes is a generic error with no
 * field named, so the only place a size limit can be explained is before the
 * request.
 */
export function FilterGroupBuilder({ filter, onFilterChange, catalog, issues }: FilterGroupBuilderProps) {
  const total = predicateCount(filter);
  const atCap = total >= MAX_PREDICATES;
  const groupsFull = filter.groups.length >= MAX_GROUPS;
  const topIssues = filterLevelIssues(issues).filter((issue) => issue.id !== 'window-ignored');

  return (
    <div className="flex w-[36rem] max-w-[80vw] flex-col gap-3">
      {filter.groups.length > 1 ? (
        <p className="flex items-center gap-2 text-meta text-text-muted">
          Match
          <Select
            aria-label="Match all or any of the groups"
            className="w-24"
            value={filter.groupOperator}
            onChange={(next) => onFilterChange({ ...filter, groupOperator: next as BoolOperator })}
            options={MATCH_OPTIONS}
          />
          of these groups:
        </p>
      ) : null}

      {filter.groups.length === 0 ? (
        <p className="rounded-control border border-dashed border-border px-3 py-6 text-center text-meta text-text-faint">
          No field conditions. The list is showing every contact the channel and conversation filters allow.
        </p>
      ) : null}

      {filter.groups.map((group, index) => (
        <section key={group.id} className="rounded-card border border-border bg-surface-raised p-2">
          <header className="mb-2 flex items-center gap-2">
            {/* "Group 1" is noise while there is only one of them. */}
            <span className="text-meta text-text-muted">
              {filter.groups.length > 1 ? `Group ${index + 1} — match` : 'Match'}
            </span>
            <Select
              aria-label={`Match all or any inside group ${index + 1}`}
              className="w-24"
              value={group.operator}
              onChange={(next) => onFilterChange(updateGroup(filter, group.id, { operator: next as BoolOperator }))}
              options={MATCH_OPTIONS}
            />
            <span className="text-meta text-text-muted">of:</span>
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
          </header>

          <ul className="flex flex-col gap-2">
            {group.predicates.map((predicate) => (
              <PredicateRow
                key={predicate.id}
                predicate={predicate}
                catalog={catalog}
                issues={issuesFor(issues, group.id, predicate.id)}
                onChange={(patch) => onFilterChange(updatePredicate(filter, group.id, predicate.id, patch))}
                onRemove={() => onFilterChange(removePredicate(filter, group.id, predicate.id))}
              >
                <AttributePicker
                  value={predicate.name}
                  catalog={catalog}
                  onChange={(name) => onFilterChange(updatePredicate(filter, group.id, predicate.id, { name }))}
                />
              </PredicateRow>
            ))}
          </ul>

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
        </section>
      ))}

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={atCap || groupsFull}
          onClick={() => onFilterChange(addGroup(filter))}
        >
          <IconPlus size={14} />
          {filter.groups.length === 0 ? 'Add a condition' : 'Add a group'}
        </Button>
        {atCap ? (
          <span className="flex items-center gap-1 text-meta text-text-muted">
            <IconWarning size={12} aria-hidden />
            {MAX_PREDICATES} conditions is the ceiling.
          </span>
        ) : null}
      </div>

      {topIssues.map((issue) => (
        <Alert key={issue.id} tone={issue.level === 'error' ? 'danger' : 'warning'}>
          {issue.message}
        </Alert>
      ))}
    </div>
  );
}
