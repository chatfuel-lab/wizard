import { useEffect, useMemo, useRef } from 'react';
import { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import {
  Button,
  Checkbox,
  DateField,
  IconFilter,
  IconSearch,
  IconWarning,
  Input,
  Popover,
  Select,
  Tag,
  Tooltip,
} from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import {
  ALL_STAGES,
  ASSIGNEE_PRESETS,
  ASSIGNEE_PRESET_LABELS,
  EMPTY_FILTER,
  activeFilterCount,
  isFilterEmpty,
  userAssigneeKey,
  type AssigneeFilterKey,
  type ContactsFilter,
} from '../../lib/contactsFilter';
import { toggleStage } from '../../lib/contactsParams';
import {
  STAGE_LABELS,
  WINDOW_PRESETS,
  dateInputToValue,
  dateValueToInput,
  describeChannels,
  describeConditions,
  describeFilterCount,
  describeStages,
  describeWindow,
  matchWindowPreset,
  windowSince,
} from '../../lib/filterLabels';
import { predicateCount, summarizeIssues, validateFilter, type CatalogFacts } from '../../lib/filterValidation';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '../../lib/platforms';
import type { TeamMember } from '../../types';
import { FilterGroupBuilder } from './FilterGroupBuilder';

export interface FilterBarProps {
  filter: ContactsFilter;
  onFilterChange: (filter: ContactsFilter) => void;
  catalog: AttributeCatalog;
  team: TeamMember[];
  /** Debounced text, held by the list so a keystroke is not a request. */
  search: string;
  onSearchChange: (value: string) => void;
}

/** An ISO instant from a `YYYY-MM-DD`, or null. */
const instantFromDate = (input: string | null): string | null => {
  const ms = dateInputToValue(input);
  return ms === '' ? null : new Date(Number(ms)).toISOString();
};

/**
 * Everything that narrows the list, in one row.
 *
 * The controls are ordinary; the two honest bits are not.
 *
 * **The problem chip.** An invalid segment comes back as a generic API
 * error naming no field, so every "this condition is not being applied" and
 * every "this matches nobody" has to be said here, before the request. It is
 * one chip rather than a wall of alerts because most of the messages belong to
 * a row and are already printed against it.
 *
 * Nothing here is disabled by the engine. Every control works on both; what
 * changes is the route, and the tag says so.
 */
export function FilterBar({ filter, onFilterChange, catalog, team, search, onSearchChange }: FilterBarProps) {
  const facts = useMemo<CatalogFacts>(
    () => ({
      ready: !catalog.loading && catalog.error === null,
      has: (name) => catalog.byName.has(name),
      dataTypeOf: catalog.dataTypeOf,
      defaultValueOf: (name) => catalog.byName.get(name)?.defaultValue ?? null,
    }),
    [catalog],
  );

  const issues = useMemo(() => validateFilter(filter, facts), [filter, facts]);
  const problems = summarizeIssues(issues);
  const conditions = predicateCount(filter);
  const filterCount = describeFilterCount(activeFilterCount(filter));
  const preset = matchWindowPreset(filter);
  /* The one warning that makes a control look broken rather than surprising:
     under the live engine the window narrows nothing, so it is said ON the
     window rather than only in the problem chip. */
  const windowIgnored = issues.find((issue) => issue.id === 'window-ignored') ?? null;

  const ownerOptions = [
    ...ASSIGNEE_PRESETS.map((key) => ({ value: key, label: ASSIGNEE_PRESET_LABELS[key] })),
    ...team.map((member) => ({
      value: userAssigneeKey(member.user.id),
      label: member.user.name,
    })),
  ];
  /* A link or a saved view can name someone who has since left the bot. Without
     this the Select would show the first option and quietly lie about what the
     list is filtered by. */
  if (!ownerOptions.some((option) => option.value === filter.assignee)) {
    ownerOptions.push({ value: filter.assignee, label: 'Someone who has left' });
  }

  /* The box is the list's debounced DRAFT; `filter.q` is what was committed.
     They part company for 300 ms while someone types, which is the point — but
     they also part company when the filter is rewritten from somewhere else
     entirely: a saved view, ⌘K's "Clear all filters", a deep link. Left alone,
     the stale draft would be written straight back on the next tick and the
     saved view would appear to bring its own search term with it.

     Adopting only on a CHANGE to `filter.q` is what makes that safe: while a
     keystroke is in flight `filter.q` has not moved, so this stands down; when
     the debounce lands, the two are already equal and it does nothing. */
  const committed = useRef(filter.q);
  useEffect(() => {
    if (filter.q === committed.current) return;
    committed.current = filter.q;
    if (filter.q !== search) onSearchChange(filter.q);
  }, [filter.q, search, onSearchChange]);

  const setWindow = (since: string | null, until: string | null) => onFilterChange({ ...filter, since, until });

  /* Clear empties the box directly rather than leaning on the effect above:
     clearing a filter whose `q` is already empty does not change `filter.q` at
     all, so nothing would adopt, and the half-typed draft would survive the
     button that says it clears everything. */
  const clearAll = () => {
    onSearchChange('');
    onFilterChange(EMPTY_FILTER);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-40 flex-1 @wide:max-w-72">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          /* The `/` shortcut and the palette's "Search contacts" both reach the
             box through the DOM: ContactsViewProps is frozen, and a prop for one
             focus call would unfreeze a contract six tracks build on. */
          data-contacts-search
          aria-label="Search contacts by name or phone"
          placeholder="Search name or phone…"
          className="pl-8"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <Popover
        aria-label="Channels"
        trigger={(props) => (
          <Button {...props} variant="ghost" size="md">
            <span className="max-w-40 truncate">{describeChannels(filter.platforms)}</span>
          </Button>
        )}
      >
        <div className="flex w-56 flex-col items-start gap-1.5">
          {ALL_PLATFORMS.map((platform: Platform) => (
            <Checkbox
              key={platform}
              checked={filter.platforms.includes(platform)}
              onChange={() => {
                const next = filter.platforms.includes(platform)
                  ? filter.platforms.filter((entry) => entry !== platform)
                  : [...filter.platforms, platform];
                /* Nothing ticked would ask the API for no channels at all, and
                   `contactsConnection` takes the list as a positive argument —
                   so the last tick falls back to everything. */
                onFilterChange({ ...filter, platforms: next.length === 0 ? [...ALL_PLATFORMS] : next });
              }}
              label={PLATFORM_LABELS[platform]}
            />
          ))}
        </div>
      </Popover>

      <Popover
        aria-label="Stages"
        trigger={(props) => (
          <Button {...props} variant="ghost" size="md">
            <span className="max-w-40 truncate">{describeStages(filter.stages)}</span>
          </Button>
        )}
      >
        <div className="flex w-56 flex-col items-start gap-1.5">
          {ALL_STAGES.map((stage: SalesStageV2) => (
            <Checkbox
              key={stage}
              /* An empty list means every stage — the same thing the API means
                 by `[]` — so it renders as all six ticked, and unticking one has
                 to mean "all but this". */
              checked={filter.stages.length === 0 || filter.stages.includes(stage)}
              onChange={() =>
                onFilterChange({
                  ...filter,
                  stages: toggleStage(filter.stages.length === 0 ? ALL_STAGES : filter.stages, stage),
                })
              }
              label={STAGE_LABELS[stage]}
            />
          ))}
          {filter.stages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onFilterChange({ ...filter, stages: [] })}
            >
              All stages
            </Button>
          ) : null}
        </div>
      </Popover>

      <Select
        aria-label="Owner"
        className="w-40"
        value={filter.assignee}
        onChange={(next) => onFilterChange({ ...filter, assignee: next as AssigneeFilterKey })}
        options={ownerOptions}
      />

      <Checkbox
        checked={filter.unreadOnly}
        onChange={(checked) => onFilterChange({ ...filter, unreadOnly: checked })}
        label="Unread"
      />

      <Popover
        aria-label="Last message"
        trigger={(props) => (
          <Button {...props} variant="ghost" size="md">
            <span className="max-w-40 truncate">{describeWindow(filter)}</span>
            {windowIgnored ? (
              <IconWarning size={12} aria-label="not narrowing this list" className="text-warning" />
            ) : null}
          </Button>
        )}
      >
        <div className="flex w-64 flex-col gap-2">
          <p className="text-micro text-text-faint">Last message</p>
          {windowIgnored ? <p className="text-meta text-warning">{windowIgnored.message}</p> : null}
          {WINDOW_PRESETS.map((entry) => (
            <Button
              key={entry.id}
              variant={preset?.id === entry.id ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setWindow(windowSince(entry), null)}
            >
              {entry.label}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <DateField
              aria-label="From"
              presets={false}
              value={filter.since === null ? null : dateValueToInput(filter.since)}
              onChange={(next) => setWindow(instantFromDate(next), filter.until)}
            />
            <span className="text-meta text-text-faint">to</span>
            <DateField
              aria-label="To"
              presets={false}
              value={filter.until === null ? null : dateValueToInput(filter.until)}
              onChange={(next) => setWindow(filter.since, instantFromDate(next))}
            />
          </div>
          {filter.since !== null || filter.until !== null ? (
            <Button variant="ghost" size="sm" onClick={() => setWindow(null, null)}>
              Any time
            </Button>
          ) : null}
        </div>
      </Popover>

      <Popover
        aria-label="Field conditions"
        placement="bottom-start"
        trigger={(props) => (
          <Button {...props} variant={conditions > 0 ? 'secondary' : 'ghost'} size="md">
            <IconFilter size={14} />
            {describeConditions(conditions)}
          </Button>
        )}
      >
        <FilterGroupBuilder filter={filter} onFilterChange={onFilterChange} catalog={catalog} issues={issues} />
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        {problems ? (
          <Tooltip
            label={issues
              .slice(0, 3)
              .map((issue) => issue.message)
              .join(' ')}
          >
            <span className="flex items-center gap-1 text-meta text-text-muted">
              <IconWarning size={12} aria-hidden />
              {problems}
            </span>
          </Tooltip>
        ) : null}

        {filterCount ? <Tag tone="accent">{filterCount}</Tag> : null}

        {!isFilterEmpty(filter) || search !== '' ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
