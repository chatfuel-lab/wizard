/**
 * `/sign-in[?returnTo=&reason=expired|signout-failed&invited=1&email=]`
 *
 * The screen does not decide where to go afterwards: on success the provider
 * hears SIGNED_IN, fetches the membership and AuthRouter sends the person to
 * `returnTo` (or to no-access if they turn out not to be a member). Which is
 * why `busy` is never cleared on the happy path — the form stays disabled with
 * its spinner until the tree is replaced, instead of flashing an enabled
 * button at somebody who is already on their way in.
 */
import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input, PasswordInput } from '~ui';
import { useAuth } from '../AuthContext';
import { SIGN_OUT_UNCONFIRMED, messageForError } from '../lib/copy';
import { validateEmail, validatePassword } from '../lib/validation';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, FormStack, TextLink, type ScreenProps } from './parts';

export function SignInPage({ route }: ScreenProps) {
  const { actions, navigate } = useAuth();

  const [initialEmail] = useState(() => route.params.get('email') ?? '');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reason = route.params.get('reason');
  const invited = route.params.get('invited') === '1';
  const returnTo = route.params.get('returnTo');
  const carry = returnTo === null ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = validateEmail(email);
    const nextPassword = validatePassword(password);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    if (nextEmail !== null || nextPassword !== null) return;

    setFailure(null);
    setBusy(true);
    void (async () => {
      try {
        await actions.signIn(email.trim(), password);
      } catch (error) {
        setFailure(messageForError(error));
        setBusy(false);
      }
    })();
  };

  const footer = (
    <>
      <span>No account?</span>
      <TextLink onClick={() => navigate(`/sign-up${carry}`)}>Create one</TextLink>
    </>
  );

  return (
    <AuthFrame title="Sign in" footer={footer}>
      <FormStack onSubmit={submit}>
        {reason === 'expired' ? <Alert tone="info">Your session expired. Sign in again to continue.</Alert> : null}
        {reason === 'signout-failed' ? <Alert tone="warning">{SIGN_OUT_UNCONFIRMED}</Alert> : null}
        {invited ? <Alert tone="info">Sign in to accept your invitation.</Alert> : null}
        {failure !== null ? <ErrorAlert message={failure} /> : null}

        <FormField label="Email" error={emailError} required>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@company.com"
              spellCheck={false}
              autoCapitalize="off"
              autoFocus={initialEmail === ''}
              disabled={busy}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError !== null) setEmailError(null);
              }}
            />
          )}
        </FormField>

        <FormField label="Password" error={passwordError} required>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="password"
              autoComplete="current-password"
              autoFocus={initialEmail !== ''}
              disabled={busy}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError !== null) setPasswordError(null);
              }}
            />
          )}
        </FormField>

        <div className="-mt-1 flex justify-end">
          <TextLink
            className="text-meta"
            onClick={() =>
              navigate(`/forgot-password${email.trim() === '' ? '' : `?email=${encodeURIComponent(email.trim())}`}`)
            }
          >
            Forgot password?
          </TextLink>
        </div>

        <Button type="submit" loading={busy} className="w-full">
          Sign in
        </Button>
      </FormStack>
    </AuthFrame>
  );
}
