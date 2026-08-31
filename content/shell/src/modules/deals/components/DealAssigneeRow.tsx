import { Avatar, Combobox, IconSparkles, type ComboboxOption } from '~ui';
import type { DealRecord, DealTeamMember } from '../types';

export interface DealAssigneeRowProps {
  deal: DealRecord;
  members: DealTeamMember[];
  canEdit: boolean;
  onAssign: (userAccountId: string) => Promise<void>;
  onAssignAI: () => Promise<void>;
  onUnassign: () => Promise<void>;
}

/**
 * The owner: one control for all three outcomes.
 *
 * AI is an option in the same list rather than a button beside it — it is one
 * of the things an owner can be, and splitting it out made the row look like
 * two unrelated controls and left the AI state with no way back except a second
 * button. `contactSetAssignee` takes `member.user.id`, a UserAccountID, and
 * rejects `member.id`, which is a BotTeamMemberID.
 */

/** Not a UserAccountID — the sentinel that routes to contactSetFuelyAIAssignee. */
export const AI_OPTION = '__ai__';

export function DealAssigneeRow({ deal, members, canEdit, onAssign, onAssignAI, onUnassign }: DealAssigneeRowProps) {
  const assignee = deal.assignee;
  const current =
    assignee?.__typename === 'FuelyAIAssignee'
      ? AI_OPTION
      : assignee?.__typename === 'PublicUserAccount'
        ? assignee.id
        : null;

  const options: ComboboxOption[] = [
    {
      value: AI_OPTION,
      label: 'AI',
      description: 'Fuely AI handles this deal',
      icon: <IconSparkles size={18} />,
    },
    ...members.map((member) => ({
      value: member.user.id,
      label: member.user.name,
      description: member.role.roleTypeV2,
      icon: <Avatar src={member.user.profilePicture?.url} name={member.user.name} size={18} />,
    })),
  ];

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-text-muted">Owner</span>
      <Combobox
        aria-label="Owner"
        value={current}
        onChange={(value) => {
          if (value === null) return void onUnassign();
          if (value === AI_OPTION) return void onAssignAI();
          return void onAssign(value);
        }}
        options={options}
        clearable
        disabled={!canEdit}
        placeholder="Unassigned"
        empty="No team members"
      />
    </div>
  );
}
