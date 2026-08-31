import { Select } from '~ui';
import { useDealTeam } from '../hooks/useDealTeam';
import { ASSIGNEE_PRESETS, ASSIGNEE_PRESET_LABELS, userAssigneeKey, type AssigneeFilterKey } from '../lib/dealsFilter';

export interface AssigneeFilterProps {
  value: AssigneeFilterKey;
  onChange: (next: AssigneeFilterKey) => void;
  className?: string;
}

/**
 * All deals / Unassigned / AI, **and every person on the team**.
 *
 * The presets alone were a dead end: a board where you cannot ask "what is
 * mine" is not a sales board. `ContactAssigneeFilterType.AssigneeId` has always
 * been in the API and the member list is already fetched for the owner picker,
 * so this costs one query the module was making anyway.
 *
 * A key that names someone no longer on the team still renders — the filter is
 * honest about what it is doing rather than silently resetting to All deals.
 */
export function AssigneeFilter({ value, onChange, className }: AssigneeFilterProps) {
  const team = useDealTeam();

  const options = [
    ...ASSIGNEE_PRESETS.map((key) => ({ value: key, label: ASSIGNEE_PRESET_LABELS[key] })),
    ...team.members.map((member) => ({
      value: userAssigneeKey(member.user.id),
      label: member.user.name,
    })),
  ];

  if (!options.some((option) => option.value === value)) {
    options.push({ value, label: 'Someone no longer on the team' });
  }

  return (
    <Select
      aria-label="Filter by assignee"
      value={value}
      onChange={(next) => onChange(next as AssigneeFilterKey)}
      options={options}
      className={className}
    />
  );
}
