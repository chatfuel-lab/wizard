import { useMemo } from 'react';
import { Avatar, Combobox, IconClose, IconUser, type ComboboxOption } from '~ui';
import type { TeamMember } from '../../types';

export interface AssigneePickerProps {
  /** User ids (`assignees[].user.id` — written as `{ userID }`). */
  value: string[];
  onChange: (next: string[]) => void;
  team: TeamMember[];
  disabled?: boolean;
  placeholder?: string;
}

const FORMER = 'Former teammate';

const roleLabel = (member: TeamMember): string => {
  const role = String(member.role?.roleTypeV2 ?? '');
  const canEditAi = (member.role?.botPermissions ?? []).some(
    (p) => String(p.object) === 'Ai' && String(p.action) === 'Edit',
  );
  return canEditAi ? role : role ? `${role} · view only` : 'Teammate';
};

/**
 * Multi-select over the team roster for a switch-to-human rule: the chosen
 * as removable chips (`Avatar` + name), a `Combobox` (`~ui`) to add more,
 * "Any teammate" when nobody is chosen. Unknown users (`isUnknown` — someone
 * who left) stay VISIBLE — a rule may still name them, and hiding them would
 * make the rule lie about who it hands to — but they are not selectable: they
 * are listed as a disabled row and, when already chosen, as a muted chip.
 */
export function AssigneePicker({
  value,
  onChange,
  team,
  disabled = false,
  placeholder = 'Add a teammate…',
}: AssigneePickerProps) {
  const byId = useMemo(() => new Map(team.map((m) => [m.user.id, m] as const)), [team]);

  const options = useMemo<ComboboxOption[]>(() => {
    const chosen = new Set(value);
    const active = team.filter((m) => !m.user.isUnknown && !chosen.has(m.user.id));
    const gone = team.filter((m) => m.user.isUnknown && !chosen.has(m.user.id));
    return [
      ...active.map((m) => ({
        value: m.user.id,
        label: m.user.name || 'Unnamed teammate',
        description: roleLabel(m),
        icon: <Avatar src={m.user.profilePicture?.url} name={m.user.name || '?'} size={20} />,
      })),
      // Disabled rows stay in the list, greyed, so the picker can SAY why they cannot be chosen.
      ...gone.map((m) => ({
        value: m.user.id,
        label: FORMER,
        description: 'No longer on the team',
        icon: <IconUser size={16} />,
        disabled: true,
      })),
    ];
  }, [team, value]);

  const add = (id: string | null) => {
    if (!id || value.includes(id)) return;
    onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
        {value.length === 0 ? (
          <span className="text-xs text-text-muted">Any teammate</span>
        ) : (
          value.map((id) => {
            const member = byId.get(id);
            const unknown = !member || member.user.isUnknown;
            const name = unknown ? FORMER : member.user.name || 'Unnamed teammate';
            return (
              <span
                key={id}
                className={`inline-flex h-6 items-center gap-1 rounded-chip pl-0.5 pr-0.5 text-xs ${unknown ? 'bg-surface-sunken text-text-faint' : 'bg-accent-soft text-accent'}`}
                title={unknown ? `${FORMER} (${id})` : name}
              >
                {unknown ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised text-text-faint">
                    <IconUser size={12} />
                  </span>
                ) : (
                  <Avatar src={member.user.profilePicture?.url} name={name} size={20} />
                )}
                <span className="max-w-40 truncate px-0.5">{name}</span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`Remove ${name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-surface-hover focus-visible:focus-ring"
                  >
                    <IconClose size={12} />
                  </button>
                ) : null}
              </span>
            );
          })
        )}
      </div>
      {!disabled ? (
        <Combobox
          value={null}
          onChange={add}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          empty={team.length === 0 ? 'The team roster has not loaded' : 'Everyone is already assigned'}
          aria-label="Add an assignee"
        />
      ) : null}
    </div>
  );
}
