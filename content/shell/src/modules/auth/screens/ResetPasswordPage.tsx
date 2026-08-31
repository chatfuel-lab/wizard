/**
 * `/reset-password[?token_hash=&type=recovery]`
 *
 * Two ways in, one form:
 *
 *   * `token_hash` — the recovery email template and the admin-issued link
 *     both carry one. `verifyOtp` trades it for a session, and because the
 *     exchange needs nothing that was stored in the requesting browser, the
 *     link works wherever it is opened.
 *   * no token — a PKCE `?code=` was already exchanged by supabase-js during
 *     client construction and arrives as a PASSWORD_RECOVERY session. There is
 *     nothing to do but wait for it, briefly.
 *
 * A recovery token is single-use, and React StrictMode mounts every effect
 * twice — so the second verify would spend a token the first one already
 * consumed and turn a good link into "invalid". The in-flight promise is
 * therefore cached per token hash: two mounts, one exchange.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, FormField, PasswordInput, Spinner } from '~ui';
import { useAuth } from '../AuthContext';
import { messageForError } from '../lib/copy';
import { passwordsMatch, validatePassword } from '../lib/validation';
import type { AuthAdapter, AuthSession } from '../types';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, FormStack, ScreenNotice, type ScreenProps } from './parts';

/** How long a PKCE session gets to appear before the link is declared dead. */
const SESSION_WAIT_MS = 5000;
const POLL_MS = 250;
/** After a successful change, long enough to read "Password updated". */
const DONE_DELAY_MS = 1000;

/* Keyed by adapter AND token: one exchange per link, however many times the
   component mounts. */
const VERIFYING = new WeakMap<AuthAdapter, Map<string, Promise<AuthSession>>>();

function verifyOnce(adapter: AuthAdapter, tokenHash: string): Promise<AuthSession> {
  let perAdapter = VERIFYING.get(adapter);
  if (!perAdapter) {
    perAdapter = new Map();
    VERIFYING.set(adapter, perAdapter);
  }
  const existing = perAdapter.get(tokenHash);
  if (existing) return existing;
  const pending = adapter.verifyRecoveryToken(tokenHash);
  perAdapter.set(tokenHash, pending);
  /* A failure is not cached forever — a retry after a network blip deserves a
     real second attempt; a spent token will simply fail again. */
  void pending.catch(() => perAdapter.delete(tokenHash));
  return pending;
}

/**
 * Take the spent token out of the address bar.
 *
 * `verifyOtp` consumes it on the first mount, so what is left in the query is a
 * credential that no longer works - but it is still written into the history
 * entry, into whatever the browser syncs between the user's devices, and into
 * the access log of anything that later serves this URL. None of that is a
 * place for one, and there is nothing on this screen that needs it back.
 *
 * `replaceState` rather than a navigation: no popstate is dispatched, so the
 * app's own route is untouched and this screen is not re-entered mid-exchange.
 */
function dropTokenFromUrl(): void {
  window.history.replaceState(null, '', window.location.pathname);
}

type Phase = 'checking' | 'form' | 'saving' | 'done' | 'invalid';

export function ResetPasswordPage({ route }: ScreenProps) {
  const { state, adapter, navigate } = useAuth();
  const tokenHash = route.params.get('token_hash');

  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /** Which of the two dead ends we hit — the copy differs and it matters. */
  const [deadEnd, setDeadEnd] = useState<'link' | 'session'>('link');

  const signedIn = state.kind === 'signedIn';

  useEffect(() => {
    let alive = true;

    if (tokenHash !== null) {
      dropTokenFromUrl();
      void verifyOnce(adapter, tokenHash).then(
        () => {
          if (alive) setPhase('form');
        },
        (error) => {
          if (!alive) return;
          setFailure(messageForError(error));
          setDeadEnd('link');
          setPhase('invalid');
        },
      );
      return () => {
        alive = false;
      };
    }

    /* No token: the session (if any) is already on its way from
       detectSessionInUrl. Poll the adapter rather than the reducer so a
       recovery session that arrives before this screen mounted still counts. */
    const deadline = Date.now() + SESSION_WAIT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      void adapter.getSession().then((session) => {
        if (!alive) return;
        if (session) {
          setPhase('form');
          return;
        }
        if (Date.now() >= deadline) {
          setDeadEnd('session');
          setPhase('invalid');
          return;
        }
        timer = setTimeout(tick, POLL_MS);
      });
    };
    timer = setTimeout(tick, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [adapter, tokenHash]);

  /* The success state is a beat, not a destination — but only while it is on
     screen, so the timer dies with the component rather than navigating out
     from under whatever replaced it. */
  useEffect(() => {
    if (phase !== 'done') return undefined;
    const id = setTimeout(() => navigate('/', { replace: true }), DONE_DELAY_MS);
    return () => clearTimeout(id);
  }, [phase, navigate]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPassword = validatePassword(password);
    const nextConfirm = passwordsMatch(password, confirm);
    setPasswordError(nextPassword);
    setConfirmError(nextConfirm);
    if (nextPassword !== null || nextConfirm !== null) return;

    setFailure(null);
    setPhase('saving');
    void (async () => {
      try {
        await adapter.updatePassword(password);
        setPhase('done');
      } catch (error) {
        setFailure(messageForError(error));
        setPhase('form');
      }
    })();
  };

  if (phase === 'checking') {
    return (
      <AuthFrame title="Checking your link">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <Spinner />
          <span role="status">One moment…</span>
        </div>
      </AuthFrame>
    );
  }

  if (phase === 'invalid') {
    return (
      <AuthFrame title="This link no longer works">
        <div className="flex flex-col gap-4">
          <Alert tone="danger">
            {deadEnd === 'link'
              ? 'This link is invalid or has expired.'
              : 'This link is invalid, or it was opened in a different browser than the one that requested it.'}
          </Alert>
          <ScreenNotice
            actions={
              <>
                <Button onClick={() => navigate('/forgot-password')}>Request a new link</Button>
                <Button variant="ghost" onClick={() => navigate('/sign-in')}>
                  Back to sign in
                </Button>
              </>
            }
          >
            Reset links are single-use and time-limited. Asking for a new one takes a moment.
          </ScreenNotice>
        </div>
      </AuthFrame>
    );
  }

  if (phase === 'done') {
    return (
      <AuthFrame title="Password updated">
        <div className="flex flex-col gap-4">
          <Alert tone="success">Password updated. Taking you to the app…</Alert>
          <div className="flex">
            <Button variant="secondary" onClick={() => navigate('/', { replace: true })}>
              Continue now
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  const saving = phase === 'saving';
  return (
    <AuthFrame
      title="Choose a new password"
      subtitle={signedIn ? 'You are signed in from the link — pick a password and you are done.' : undefined}
    >
      <FormStack onSubmit={submit}>
        {failure !== null ? <ErrorAlert message={failure} /> : null}

        <FormField label="New password" required error={passwordError} hint="At least 8 characters.">
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="new-password"
              autoComplete="new-password"
              showStrength
              autoFocus
              disabled={saving}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError !== null) setPasswordError(null);
              }}
            />
          )}
        </FormField>

        <FormField label="Repeat password" required error={confirmError}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="confirm-password"
              autoComplete="new-password"
              disabled={saving}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                if (confirmError !== null) setConfirmError(null);
              }}
            />
          )}
        </FormField>

        <Button type="submit" loading={saving} className="w-full">
          Update password
        </Button>
      </FormStack>
    </AuthFrame>
  );
}
