/**
 * `/no-access` — signed in, and nobody here.
 *
 * This is not an error page: the account is real and the credentials worked;
 * it simply is not a member of THIS tenant. Which is the ordinary outcome of
 * one Supabase project serving several deployments — the same person can hold
 * one account and belong to one of them.
 *
 * Two ways out: ask an admin for an invite link (nothing to click, so it is
 * prose), or sign out and come back as somebody else. Signing up again is not
 * one of them — the account already exists, and an account that is not a
 * member has either been removed or belongs to another deployment. Retry is
 * there because "an admin just added me" is the other common case, and
 * reloading the whole app to find out is a poor answer.
 */
import { useState } from 'react';
import { Alert, Avatar, Button, IconRefresh, Tag } from '~ui';
import { useAuth } from '../AuthContext';
import { signOutConfirmed } from '../lib/signOut';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, ScreenNotice, type ScreenProps } from './parts';

/* Takes the route it does not read, so every screen has one shape. */
export function NoAccessPage(_props: ScreenProps) {
  const { state, actions, navigate } = useAuth();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* The router only routes here when signed in; this keeps the type honest. */
  if (state.kind !== 'signedIn') return null;

  const user = state.user;

  const retry = () => {
    setFailure(null);
    // The one place a refresh is allowed to create a workspace: somebody
    // standing on the screen that says they have none, asking for one.
    actions.refetchMembership({ provision: true });
  };

  const signOut = () => {
    setBusy(true);
    void (async () => {
      const confirmed = await signOutConfirmed(actions.signOut);
      navigate(confirmed ? '/sign-in' : '/sign-in?reason=signout-failed', { replace: true });
    })();
  };

  return (
    <AuthFrame title="Your workspace is not ready" width="md">
      <div className="flex flex-col gap-4">
        {failure !== null ? <ErrorAlert message={failure} /> : null}
        {state.membershipStatus === 'error' ? (
          <Alert tone="danger" title="Could not set up your workspace">
            {state.membershipError ?? 'The server could not finish creating it. Try again in a moment.'}
          </Alert>
        ) : null}

        <div className="flex items-center gap-3 rounded-card border border-border bg-surface-sunken px-3 py-2.5">
          <Avatar src={user.avatarUrl} name={user.name ?? user.email} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{user.name ?? user.email}</div>
            <div className="truncate text-xs text-text-muted">{user.email}</div>
          </div>
          <Tag>Signed in</Tag>
        </div>

        <ScreenNotice>
          Your account exists, but it has no workspace yet. Try again — and if it keeps failing, whoever installed this
          app has to look at the server log.
        </ScreenNotice>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            loading={state.membershipStatus === 'loading' || state.membershipStatus === 'provisioning'}
            disabled={busy}
            onClick={retry}
          >
            <IconRefresh />
            Try again
          </Button>
          <Button variant="ghost" disabled={busy} onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    </AuthFrame>
  );
}
