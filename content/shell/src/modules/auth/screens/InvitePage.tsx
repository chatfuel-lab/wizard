/**
 * `/invite/<token>` — the only entrance a normal member ever uses.
 *
 * The token is previewed anonymously first (`cf_invite_preview`), so a dead
 * link says so before anyone types a password into it, and a live one can name
 * the workspace, the role and who sent it. The preview deliberately returns
 * the invited address MASKED, so this screen can say "this invite is for
 * p***@example.com" and compare it to whoever is signed in without ever
 * disclosing the address to a stranger holding the URL.
 *
 * The accept itself is one atomic RPC and it, not the preview, is the
 * authority: a link that expired between the two comes back InviteExpired.
 *
 * The flow is a small state machine rather than a set of booleans because
 * signing in CHANGES the branch — the "sign in to accept" form would be
 * replaced by the "join as" panel the instant the session lands, half a second
 * before the accept it started resolves. `accepting` is a phase, so the screen
 * stays still while it works.
 */
import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Button,
  FormField,
  IconMail,
  Input,
  PasswordInput,
  SegmentedControl,
  Skeleton,
  Spinner,
  Tag,
} from '~ui';
import { useAuth } from '../AuthContext';
import { absoluteUrl } from '../lib/authRoutes';
import { SIGN_OUT_UNCONFIRMED, messageForError } from '../lib/copy';
import { signOutConfirmed } from '../lib/signOut';
import { matchesMaskedEmail, passwordsMatch, validateEmail, validateName, validatePassword } from '../lib/validation';
import type { InvitePreview } from '../types';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, FormStack, ScreenNotice, TextLink, type ScreenProps } from './parts';

type Phase = { kind: 'loading' } | { kind: 'ready' } | { kind: 'accepting' } | { kind: 'confirmEmail'; email: string };

type Tab = 'sign-in' | 'sign-up';

const DEAD_INVITE: Record<Exclude<InvitePreview['status'], 'valid'>, { title: string; body: string }> = {
  expired: {
    title: 'This invite has expired',
    body: 'Invite links are time-limited. Ask an admin of the workspace to send you a new one.',
  },
  revoked: {
    title: 'This invite was revoked',
    body: 'An admin cancelled this link. Ask them for a new one.',
  },
  accepted: {
    title: 'This invite was already used',
    body: 'Each invite link works once. If it was you, sign in with the account you created.',
  },
  not_found: {
    title: 'This invite link is not valid',
    body: 'Check that you copied the whole link — the token at the end is easy to cut short.',
  },
};

/**
 * Take the invite token out of the address bar.
 *
 * The token is a bearer secret — the database keeps only its sha256 — and it
 * rides in the path, so it is written into the history entry, into whatever
 * the browser syncs between the user's devices, and into the `Referer` of
 * every same-origin navigation that follows. Once the link is spent or dead
 * there is nothing left that needs it, and the same call is what
 * `ResetPasswordPage` makes for the recovery token.
 *
 * `replaceState` rather than a navigation: no popstate is dispatched, so the
 * app's own route object is untouched and this screen is not re-entered
 * mid-exchange — which also means the `token` already read out of the path
 * stays usable for the accept that is in flight.
 */
function dropTokenFromUrl(): void {
  window.history.replaceState(null, '', absoluteUrl('/invite'));
}

export function InvitePage({ route }: ScreenProps) {
  const { state, adapter, actions, navigate } = useAuth();

  /* '/invite/<token>' — the token is everything after the first segment, so a
     token containing a slash survives the round trip. */
  const token = decodeURIComponent(route.path.split('/').slice(1).join('/'));

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [failure, setFailure] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => route.params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPhase({ kind: 'loading' });
    void adapter.invitePreview(token).then(
      (value) => {
        if (!alive) return;
        // Expired, revoked, used, unknown: a token that opens nothing.
        if (value.status !== 'valid') dropTokenFromUrl();
        setPreview(value);
        setPhase({ kind: 'ready' });
      },
      (error) => {
        if (!alive) return;
        /* The token stays. A preview that did not answer says nothing about
           the invite — a connection that dropped, or the deployment-wide rate
           limit on `cf_invite_preview` — and erasing it would turn a live link
           into "not valid" on the next reload, with nothing left to retry
           with. Only a preview that CAME BACK dead spends it, above. */
        setFailure(messageForError(error));
        setPhase({ kind: 'ready' });
      },
    );
    return () => {
      alive = false;
    };
  }, [adapter, token]);

  const signedInUser = state.kind === 'signedIn' ? state.user : null;
  const membership = state.kind === 'signedIn' ? state.membership : null;

  /* Already a member: the link is spent for this person, and the screen below
     offers nothing that uses it. */
  useEffect(() => {
    if (membership !== null) dropTokenFromUrl();
  }, [membership]);

  const accept = () => {
    setFailure(null);
    setPhase({ kind: 'accepting' });
    void (async () => {
      try {
        await actions.acceptInvite(token);
        dropTokenFromUrl();
        navigate('/', { replace: true });
      } catch (error) {
        setFailure(messageForError(error));
        setPhase({ kind: 'ready' });
      }
    })();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePassword(password);
    const nextConfirm = tab === 'sign-up' ? passwordsMatch(password, confirm) : null;
    const nextName = tab === 'sign-up' ? validateName(name) : null;
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setConfirmError(nextConfirm);
    setNameError(nextName);
    if (nextEmail !== null || nextPassword !== null || nextConfirm !== null || nextName !== null) return;

    setFailure(null);
    setPhase({ kind: 'accepting' });
    void (async () => {
      try {
        if (tab === 'sign-up') {
          const result = await actions.signUp({
            email: email.trim(),
            password,
            name: name.trim() || undefined,
          });
          if (result.needsEmailConfirmation) {
            setPhase({ kind: 'confirmEmail', email: email.trim() });
            return;
          }
        } else {
          await actions.signIn(email.trim(), password);
        }
        await actions.acceptInvite(token);
        dropTokenFromUrl();
        navigate('/', { replace: true });
      } catch (error) {
        setFailure(messageForError(error));
        setPhase({ kind: 'ready' });
      }
    })();
  };

  const signOutAndStay = () => {
    setFailure(null);
    void (async () => {
      if (!(await signOutConfirmed(actions.signOut))) setFailure(SIGN_OUT_UNCONFIRMED);
    })();
  };

  const workspace = preview?.tenantName ?? 'this workspace';

  // ---------------------------------------------------------------- phases

  if (phase.kind === 'loading') {
    return (
      <AuthFrame title="Invitation">
        <div className="flex flex-col gap-3">
          <Skeleton variant="text" lines={2} />
          <Skeleton variant="block" height="5rem" />
        </div>
        <span role="status" className="sr-only">
          Checking the invite link…
        </span>
      </AuthFrame>
    );
  }

  if (phase.kind === 'confirmEmail') {
    return (
      <AuthFrame title="Confirm your email">
        <ScreenNotice
          icon={<IconMail />}
          actions={
            <Button
              variant="secondary"
              onClick={() => navigate(`/sign-in?invited=1&email=${encodeURIComponent(phase.email)}`)}
            >
              Back to sign in
            </Button>
          }
        >
          <p aria-live="polite">
            We sent a confirmation link to <span className="font-medium text-text">{phase.email}</span>. Open it, sign
            in, then open this invite link again to join {workspace}.
          </p>
        </ScreenNotice>
      </AuthFrame>
    );
  }

  if (phase.kind === 'accepting') {
    return (
      <AuthFrame title="Joining…">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <Spinner />
          <span role="status">Adding you to {workspace}…</span>
        </div>
      </AuthFrame>
    );
  }

  const deadEnd = (dead: { title: string; body: string }) => (
    <AuthFrame title={dead.title}>
      <div className="flex flex-col gap-4">
        {failure !== null ? <ErrorAlert message={failure} /> : null}
        <ScreenNotice actions={<Button onClick={() => navigate('/sign-in')}>Sign in</Button>}>{dead.body}</ScreenNotice>
      </div>
    </AuthFrame>
  );

  /* A preview that never arrived reads the same as one that found nothing —
     the person is holding a link that does not work either way. */
  if (preview === null) return deadEnd(DEAD_INVITE.not_found);
  if (preview.status !== 'valid') return deadEnd(DEAD_INVITE[preview.status]);

  const roleLabel = preview.role === 'admin' ? 'an admin' : 'a member';
  const invitedBy = preview.inviterName === null ? null : ` by ${preview.inviterName}`;

  /* Already in. The link is spent as far as this person is concerned. */
  if (membership !== null) {
    return (
      <AuthFrame title="You are already a member">
        <ScreenNotice actions={<Button onClick={() => navigate('/', { replace: true })}>Open the app</Button>}>
          You are signed in as <span className="font-medium text-text">{signedInUser?.email}</span> and already a{' '}
          {membership.role} of {membership.tenant.name}.
        </ScreenNotice>
      </AuthFrame>
    );
  }

  if (signedInUser !== null) {
    const mismatch = !matchesMaskedEmail(signedInUser.email, preview.emailRestricted ? preview.emailHint : null);
    return (
      <AuthFrame title={`Join ${workspace}`} subtitle={`You were invited as ${roleLabel}${invitedBy ?? ''}.`}>
        <div className="flex flex-col gap-4">
          {failure !== null ? <ErrorAlert message={failure} /> : null}
          <div className="flex items-center gap-3 rounded-card border border-border bg-surface-sunken px-3 py-2.5">
            <Avatar src={signedInUser.avatarUrl} name={signedInUser.name ?? signedInUser.email} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">{signedInUser.name ?? signedInUser.email}</div>
              <div className="truncate text-xs text-text-muted">{signedInUser.email}</div>
            </div>
            <Tag tone={preview.role === 'admin' ? 'accent' : 'neutral'}>{preview.role}</Tag>
          </div>

          {mismatch ? (
            <Alert tone="warning" title="This invite is for a different address">
              It was sent to <span className="font-medium">{preview.emailHint}</span>. Accepting it with this account
              will be refused.
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button onClick={accept}>Accept invitation</Button>
            <Button variant="ghost" onClick={signOutAndStay}>
              Sign in with a different account
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  // Signed out: accept and authenticate in one screen.
  const signingUp = tab === 'sign-up';
  return (
    <AuthFrame
      title={`You are invited to ${workspace}`}
      subtitle={`As ${roleLabel}${invitedBy ?? ''}.`}
      width="md"
      footer={<span>Signing in accepts the invitation.</span>}
    >
      <div className="flex flex-col gap-4">
        {failure !== null ? <ErrorAlert message={failure} /> : null}
        {preview.emailRestricted ? (
          <Alert tone="info">
            This invite is addressed to <span className="font-medium">{preview.emailHint}</span> — sign in as that
            address, or create an account with it.
          </Alert>
        ) : null}

        <SegmentedControl
          aria-label="How to continue"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sign-in', label: 'I have an account' },
            { value: 'sign-up', label: 'Create an account' },
          ]}
          className="w-full"
        />

        <FormStack onSubmit={submit}>
          {signingUp ? (
            <FormField label="Name" error={nameError}>
              {(a11y) => (
                <Input
                  {...a11y}
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (nameError !== null) setNameError(null);
                  }}
                />
              )}
            </FormField>
          ) : null}

          <FormField label="Email" required error={emailError}>
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                name="email"
                autoComplete="username"
                placeholder={preview.emailHint ?? 'you@company.com'}
                spellCheck={false}
                autoCapitalize="off"
                autoFocus
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError !== null) setEmailError(null);
                }}
              />
            )}
          </FormField>

          <FormField
            label="Password"
            required
            error={passwordError}
            hint={signingUp ? 'At least 8 characters.' : undefined}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                name={signingUp ? 'new-password' : 'password'}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                showStrength={signingUp}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError !== null) setPasswordError(null);
                }}
              />
            )}
          </FormField>

          {signingUp ? (
            <FormField label="Repeat password" required error={confirmError}>
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    if (confirmError !== null) setConfirmError(null);
                  }}
                />
              )}
            </FormField>
          ) : null}

          <Button type="submit" className="w-full">
            {signingUp ? 'Create account and join' : 'Sign in and join'}
          </Button>
        </FormStack>

        {signingUp ? null : (
          <div className="text-center text-meta text-text-muted">
            <TextLink
              onClick={() =>
                navigate(`/forgot-password${email.trim() === '' ? '' : `?email=${encodeURIComponent(email.trim())}`}`)
              }
            >
              Forgot password?
            </TextLink>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
