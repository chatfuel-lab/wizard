import { useMemo } from 'react';
import { Select, type SelectOption } from '~ui';
import { useInboxTeam } from '../hooks/useInboxTeam';
import { assigneeLabel, assigneeState, assigneeValue, type ContactDetail } from '../lib/contactPanel';

export interface AssigneeControlProps {
  contact: ContactDetail;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Who is answering this contact: nobody, Fuely AI, or a person.
 *
 * Three mutations behind one control, and one trap. `assigneeID` wants
 * `member.user.id` — a UserAccountID — and NOT `member.id`, which is a
 * BotTeamMemberID. Both are opaque strings on the same object, so the wrong one
 * is accepted by the type system and rejected by the server.
 *
 * The current assignee is always an option even when the roster does not
 * contain them. `useInboxTeam` drops members the API marks `isUnknown`, and a
 * conversation can be assigned to one of those — a select whose value matches
 * no option renders as blank, which reads as unassigned and invites an operator
 * to take a conversation that already has an owner.
 */
export function AssigneeControl({ contact, disabled, onChange }: AssigneeControlProps) {
  const { members } = useInboxTeam();
  const state = assigneeState(contact);
  const current = assigneeValue(state);

  const options = useMemo<SelectOption[]>(() => {
    const roster: SelectOption[] = [
      { value: 'none', label: 'Unassigned' },
      { value: 'ai', label: 'Fuely AI' },
      ...members.map((member) => ({
        value: assigneeValue({ kind: 'user', id: member.user.id, name: member.user.name, unknown: false }),
        label: member.user.name,
      })),
    ];
    return roster.some((option) => option.value === current)
      ? roster
      : [...roster, { value: current, label: assigneeLabel(state) }];
  }, [members, current, state]);

  return (
    <Select
      value={current}
      onChange={onChange}
      options={options}
      disabled={disabled}
      aria-label="Assignee"
      className="w-full"
    />
  );
}
