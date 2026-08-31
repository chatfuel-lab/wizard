import { Checkbox, Dialog, Button, EmptyState, IconMessage, Spinner, useToast } from '~ui';
import type { TeamMember } from '../../types';
import { messageForError } from '../../lib/copy';
import { useTeam } from '../TeamContext';
import { isBusy } from '../lib/teamStore';

export interface BotAccessDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

/**
 * Which bots one member may open.
 *
 * Each box writes on its own the moment it is ticked — there is no Save. A
 * dialog that batches access changes has to decide what to do when the third
 * of five fails, and the honest answer is "the first two happened", which is
 * what this shows anyway.
 */
export function BotAccessDialog({ open, onClose, member }: BotAccessDialogProps) {
  const team = useTeam();
  const toast = useToast();
  const bots = team.state.bots;

  const toggle = async (botId: string, granted: boolean) => {
    if (!member) return;
    try {
      await team.setBotAccess(botId, member.userId, granted);
    } catch (err) {
      toast.show({ tone: 'danger', title: 'Could not change access', description: messageForError(err) });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={member ? `Bots for ${member.name ?? member.email ?? 'this person'}` : 'Bots'}
      size="sm"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      {bots.length === 0 ? (
        <EmptyState icon={<IconMessage />} title="No bots yet" description="Create one first, then hand it out." />
      ) : (
        <ul className="flex flex-col gap-1">
          {bots.map((bot) => {
            const busy = member ? isBusy(team.state, `${bot.id}:${member.userId}`) : false;
            const checked = member ? member.bots.includes(bot.id) : false;
            return (
              <li key={bot.id} className="flex items-center justify-between gap-3 rounded-control px-1 py-1.5">
                <Checkbox
                  checked={checked}
                  disabled={busy}
                  label={bot.name}
                  onChange={(next) => void toggle(bot.id, next)}
                />
                {busy ? <Spinner size={14} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
