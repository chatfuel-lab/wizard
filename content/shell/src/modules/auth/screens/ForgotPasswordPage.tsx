/**
 * `/forgot-password[?email=&sent=<email>]`
 *
 * The request ALWAYS reports success, and the "sent" state lives in the URL
 * rather than in a boolean, so a reload does not silently re-send. Whether an
 * account exists is not this screen's news to break: an enumeration oracle in
 * a password-reset form is the oldest one there is, and the RPC behind it is
 * anonymous.
 *
 * The link it asks GoTrue for points at `/reset-password` on THIS deployment
 * (origin + the mount point, so an app served from a sub-path keeps it). The recovery
 * email template the installer writes appends `?token_hash=…&type=recovery`,
 * which is what lets the link be opened in a different browser than the one
 * that asked — a PKCE `?code=` could not.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, FormField, IconMail, Input } from '~ui';
import { useAuth } from '../AuthContext';
import { messageForError } from '../lib/copy';
import { absoluteUrl } from '../lib/authRoutes';
import { validateEmail } from '../lib/validation';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, FormStack, ScreenNotice, TextLink, type ScreenProps } from './parts';

const RESEND_SECONDS = 60;

/** Seconds left, restarted whenever `attempt` changes. */
function useCountdown(seconds: number, attempt: number): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, attempt]);
  return left;
}

const resetRedirectUrl = (): string => absoluteUrl('/reset-password');

export function ForgotPasswordPage({ route }: ScreenProps) {
  const { adapter, navigate } = useAuth();
  const sentTo = route.params.get('sent');

  const [email, setEmail] = useState(() => route.params.get('email') ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const secondsLeft = useCountdown(RESEND_SECONDS, attempt);

  const backToSignIn = <TextLink onClick={() => navigate('/sign-in')}>Back to sign in</TextLink>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateEmail(email);
    setEmailError(next);
    if (next !== null) return;

    setFailure(null);
    setBusy(true);
    void (async () => {
      const address = email.trim();
      try {
        await adapter.resetPasswordForEmail(address, resetRedirectUrl());
        navigate(`/forgot-password?sent=${encodeURIComponent(address)}`, { replace: true });
      } catch (error) {
        /* Only transport and rate limiting can surface — "no such user" is not
           an error GoTrue returns here, by design. */
        setFailure(messageForError(error));
      } finally {
        setBusy(false);
      }
    })();
  };

  const resend = () => {
    if (sentTo === null) return;
    setFailure(null);
    setBusy(true);
    void (async () => {
      try {
        await adapter.resetPasswordForEmail(sentTo, resetRedirectUrl());
        setAttempt((value) => value + 1);
      } catch (error) {
        setFailure(messageForError(error));
      } finally {
        setBusy(false);
      }
    })();
  };

  if (sentTo !== null) {
    return (
      <AuthFrame title="Check your email" footer={backToSignIn}>
        <div className="flex flex-col gap-4">
          {failure !== null ? <ErrorAlert message={failure} /> : null}
          <ScreenNotice icon={<IconMail />}>
            <p aria-live="polite">
              If an account exists for <span className="font-medium text-text">{sentTo}</span>, a reset link is on its
              way. Open it in this browser — the link signs you in just long enough to choose a new password.
            </p>
          </ScreenNotice>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" loading={busy} disabled={secondsLeft > 0} onClick={resend}>
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend the link'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/forgot-password')}>
              Use another address
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Reset your password"
      subtitle="We will email you a link that lets you choose a new one."
      footer={backToSignIn}
    >
      <FormStack onSubmit={submit}>
        {failure !== null ? <ErrorAlert message={failure} /> : null}
        <Alert tone="info">
          Password reset needs email delivery to be configured. If nothing arrives, ask an admin to send you a reset
          link from the Team page.
        </Alert>

        <FormField label="Email" required error={emailError}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@company.com"
              spellCheck={false}
              autoCapitalize="off"
              autoFocus
              disabled={busy}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError !== null) setEmailError(null);
              }}
            />
          )}
        </FormField>

        <Button type="submit" loading={busy} className="w-full">
          Send the reset link
        </Button>
      </FormStack>
    </AuthFrame>
  );
}
