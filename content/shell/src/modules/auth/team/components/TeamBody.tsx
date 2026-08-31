import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ConfirmDialog, Dialog, PageBody, Spinner, useToast } from '~ui';
import { useTeam } from '../TeamContext';
import { messageForError } from '../../lib/copy';
import { BotAccessDialog } from './BotAccessDialog';
import { BotNameDialog } from './BotNameDialog';
import { BotsTable } from './BotsTable';
import { InviteDialog } from './InviteDialog';
import { DangerZoneCard } from './DangerZoneCard';
import { TeamTable, type TeamAction } from './TeamTable';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';

const personName = (name: string | null, email: string | null): string => name ?? email ?? 'This person';

/**
 * The scrolling half of the page: the roster, then the two settings cards.
 *
 * Every dialog the table can ask for lives HERE, one at a time, rather than
 * one per row: a hundred rows would otherwise carry a hundred mounted dialogs,
 * and the row menu that opened one is gone by the time it appears — so the
 * dialog has to outlive its trigger.
 */
export function TeamBody() {
  const team = useTeam();
  const toast = useToast();
  const [action, setAction] = useState<TeamAction | null>(null);
  const [recoveryState, setRecoveryState] = useState<'pending' | 'done' | null>(null);
  const dangerRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setAction(null);
    setRecoveryState(null);
  };

  /* "Leave workspace" from a row menu answers the same question the danger
   * zone does, so it brings the danger zone into view behind the dialog —
   * where the button that does it lives from now on. */
  useEffect(() => {
    if (action?.kind !== 'leave') return;
    dangerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [action]);

  /* The recovery link is fetched when the dialog opens, not when it is asked
   * for: the request is the dialog's content. */
  useEffect(() => {
    if (action?.kind !== 'recovery' || !team.recoveryLink) return;
    let cancelled = false;
    const email = action.member.email;
    if (!email) return;
    setRecoveryState('pending');
    team
      .recoveryLink(email)
      .then(() => {
        if (!cancelled) setRecoveryState('done');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.show({ tone: 'danger', title: 'Could not create a reset link', description: messageForError(err) });
        setAction(null);
      });
    return () => {
      cancelled = true;
    };
    // `team.recoveryLink` and `toast` are stable for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const failed = team.state.status === 'error';

  return (
    /* `app` and not the full width: a roster of five people stretched across a
       27-inch monitor is one row of five words and a lot of nothing. */
    <PageBody measure="app">
      <div className="flex flex-col gap-4">
        {failed ? (
          <Alert
            tone="danger"
            title="Could not load the team"
            action={
              <Button variant="secondary" size="sm" onClick={team.refresh}>
                Retry
              </Button>
            }
          >
            {team.state.error}
          </Alert>
        ) : null}

        <TeamTable onAction={setAction} />
        <BotsTable onAction={setAction} />
        <div ref={dangerRef}>
          <DangerZoneCard onAction={setAction} />
        </div>
      </div>

      <ConfirmDialog
        open={action?.kind === 'remove'}
        onClose={close}
        title="Remove from workspace?"
        confirmLabel="Remove"
        errorMessage={messageForError}
        onConfirm={async () => {
          if (action?.kind !== 'remove') return;
          const name = personName(action.member.name, action.member.email);
          await team.removeMember(action.member.userId);
          toast.show({
            tone: 'info',
            title: `${name} was removed`,
            description: 'Their open sessions stop working within a minute.',
          });
        }}
      >
        {action?.kind === 'remove' ? (
          <p>
            {personName(action.member.name, action.member.email)} loses access to this workspace immediately. You can
            invite them again later — this does not delete their account.
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={action?.kind === 'revoke'}
        onClose={close}
        title="Revoke this invite?"
        confirmLabel="Revoke"
        errorMessage={messageForError}
        onConfirm={async () => {
          if (action?.kind !== 'revoke') return;
          await team.revokeInvite(action.invite.id);
          toast.show({ tone: 'info', title: 'Invite revoked', description: 'The link stops working right away.' });
        }}
      >
        {action?.kind === 'revoke' ? (
          <p>
            The link for {action.invite.email ?? 'anyone with the link'} stops working immediately. Create a new invite
            if you change your mind.
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={action?.kind === 'leave'}
        onClose={close}
        title="Leave this workspace?"
        confirmLabel="Leave workspace"
        errorMessage={messageForError}
        onConfirm={async () => {
          await team.leaveTenant();
          /* The provider's membership refetch is what turns the shell into the
           * no-access screen; the navigation is only where it happens. */
          team.refetchMembership();
          team.navigate('/no-access', { replace: true });
        }}
      >
        <p>You lose access to this workspace right away. Your account stays — an admin can invite you back.</p>
      </ConfirmDialog>

      <InviteDialog open={action?.kind === 'invite'} onClose={close} />

      <BotNameDialog
        open={action?.kind === 'newBot' || action?.kind === 'renameBot'}
        onClose={close}
        bot={action?.kind === 'renameBot' ? action.bot : null}
      />

      <BotAccessDialog
        open={action?.kind === 'botAccess'}
        onClose={close}
        member={action?.kind === 'botAccess' ? action.member : null}
      />

      <ConfirmDialog
        open={action?.kind === 'deleteBot'}
        onClose={close}
        title="Delete this bot?"
        confirmLabel="Delete bot"
        errorMessage={messageForError}
        onConfirm={async () => {
          if (action?.kind !== 'deleteBot') return;
          const name = action.bot.name;
          await team.deleteBot(action.bot.id);
          toast.show({ tone: 'info', title: `${name} was deleted` });
        }}
      >
        {action?.kind === 'deleteBot' ? (
          <p>
            {action.bot.name} is deleted in Chatfuel too, with its flows, contacts and conversations. This cannot be
            undone.
          </p>
        ) : null}
      </ConfirmDialog>

      <TransferOwnershipDialog
        open={action?.kind === 'transfer'}
        onClose={close}
        preselect={action?.kind === 'transfer' ? action.userId : null}
      />

      <Dialog
        open={action?.kind === 'recovery'}
        onClose={close}
        title="Password reset link"
        size="sm"
        footer={
          <Button variant="secondary" size="sm" onClick={close}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-text">
          {action?.kind === 'recovery' ? (
            <p className="text-text-muted">
              A one-time reset link for {personName(action.member.name, action.member.email)} is written to the server
              logs, never shown here. Copy it from the deployment logs (e.g. Vercel) and hand it over yourself — it
              works once and expires.
            </p>
          ) : null}
          {recoveryState === 'pending' ? (
            <span className="flex items-center gap-2 text-text-muted">
              <Spinner size={14} /> Writing the link to the server logs…
            </span>
          ) : recoveryState === 'done' ? (
            <span className="text-text-muted">Done — check the server logs for the link.</span>
          ) : null}
        </div>
      </Dialog>
    </PageBody>
  );
}
