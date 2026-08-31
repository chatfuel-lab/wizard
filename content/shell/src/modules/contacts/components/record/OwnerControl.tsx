import { Avatar, Combobox, IconSparkles, useToast, type ComboboxOption } from '~ui';
import { useContactsUndo } from '../../ContactsUndoContext';
import { AI_OPTION, assigneeLabel, assigneeValue, type AssigneeLike } from '../../lib/contactFields';
import type { TeamMember } from '../../types';

export interface OwnerControlProps {
  assignee: AssigneeLike;
  team: TeamMember[];
  disabled?: boolean;
  onAssign: (userAccountId: string) => Promise<void>;
  onAssignAI: () => Promise<void>;
  onUnassign: () => Promise<void>;
  className?: string;
}

/**
 * Who owns this contact: one control for all three outcomes.
 *
 * Fuely AI is an option in the same list rather than a button beside it — it is
 * one of the things an owner can be, and splitting it out leaves the AI state
 * with no way back except a second button. Clearing the selection unassigns.
 *
 * `contactSetAssignee` takes `member.user.id`, a `UserAccountID`, and rejects
 * `member.id`, which is a `BotTeamMemberID`. That is not a naming preference;
 * the mutation errors.
 *
 * A contact assigned to someone who has since been removed from the bot keeps
 * that assignment — the API says so with `isUnknown` — and the member list no
 * longer contains them. Without an option for that id the control would show a
 * blank and look unassigned, so the current owner is always in the list, named
 * as gone.
 */
export function OwnerControl({
  assignee,
  team,
  disabled,
  onAssign,
  onAssignAI,
  onUnassign,
  className,
}: OwnerControlProps) {
  const undo = useContactsUndo();
  const toast = useToast();
  const current = assigneeValue(assignee);

  const options: ComboboxOption[] = [
    {
      value: AI_OPTION,
      label: 'Fuely AI',
      description: 'The AI handles this contact',
      icon: <IconSparkles size={18} />,
    },
    ...team.map((member) => ({
      value: member.user.id,
      label: member.user.name,
      icon: <Avatar src={member.user.profilePicture?.url} name={member.user.name} size={18} />,
    })),
  ];

  if (current !== null && current !== AI_OPTION && !options.some((option) => option.value === current)) {
    options.unshift({
      value: current,
      label: assigneeLabel(assignee),
      description: 'No longer on this bot',
      icon: <Avatar name={assigneeLabel(assignee)} size={18} />,
    });
  }

  /* Undo is a forward mutation, and all three destinations have one — which is
     why the owner offers it unconditionally and the stage does not. */
  const restore = (previous: AssigneeLike): (() => Promise<void>) => {
    const value = assigneeValue(previous);
    if (value === null) return onUnassign;
    if (value === AI_OPTION) return onAssignAI;
    return () => onAssign(value);
  };

  return (
    <Combobox
      aria-label="Owner"
      className={className}
      value={current}
      options={options}
      clearable
      disabled={disabled}
      placeholder="Unassigned"
      empty="No teammates on this bot"
      onChange={(next) => {
        if (next === current) return;
        const previous = assignee;
        const apply = next === null ? onUnassign : next === AI_OPTION ? onAssignAI : () => onAssign(next);
        const nextLabel = next === null ? 'nobody' : labelFor(next, options);
        void apply()
          .then(() => {
            undo.push({ label: `Owner is now ${nextLabel} — undo?`, run: restore(previous) });
          })
          /* Same reason as the stage: the control reads its value from the
             record, so a refused assignment reverts itself and nobody would be
             told that the contact still belongs to whoever it belonged to. */
          .catch((err: unknown) => {
            toast.show({
              tone: 'danger',
              title: `Could not assign this contact to ${nextLabel}`,
              description: err instanceof Error ? err.message : undefined,
            });
          });
      }}
    />
  );
}

function labelFor(value: string, options: readonly ComboboxOption[]): string {
  return options.find((option) => option.value === value)?.label ?? 'someone else';
}
