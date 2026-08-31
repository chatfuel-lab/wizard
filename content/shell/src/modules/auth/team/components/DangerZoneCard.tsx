import { Button, Card, IconLogOut, IconShield } from '~ui';
import { canTransfer } from '../../lib/roles';
import { useTeam } from '../TeamContext';
import type { TeamAction } from './TeamTable';

export interface DangerZoneCardProps {
  onAction: (action: TeamAction) => void;
}

/**
 * Leaving, and the one thing that has to happen before an owner can leave.
 *
 * The owner's button is disabled rather than hidden: "why can't I leave?" is
 * the question, and an absent control does not answer it. `cf_leave_tenant`
 * refuses the last owner anyway — this is the same rule, said earlier.
 */
export function DangerZoneCard({ onAction }: DangerZoneCardProps) {
  const team = useTeam();
  const isOwner = canTransfer(team.actorRole);

  return (
    <Card tone="danger" title="Danger zone">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-text">Leave workspace</div>
            {/* The one line that stays: it says why the button is dead. A
                disabled button swallows pointer events, so a tooltip on one is
                a hint nobody reads. What leaving costs is in the dialog. */}
            {isOwner ? <div className="text-xs text-text-muted">Transfer ownership first.</div> : null}
          </div>
          <Button
            variant="danger"
            size="sm"
            disabled={isOwner}
            title={isOwner ? 'Transfer ownership first' : undefined}
            onClick={() => onAction({ kind: 'leave' })}
          >
            <IconLogOut size={14} /> Leave workspace
          </Button>
        </div>

        {isOwner ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-danger/40 pt-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-text">Transfer ownership</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'transfer', userId: null })}>
              <IconShield size={14} /> Transfer ownership
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
