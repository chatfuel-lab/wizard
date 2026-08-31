/**
 * `/sign-up[?returnTo=]` — one form, the way any SaaS does it.
 *
 * Sign-up is TWO steps against the server — GoTrue creates the user, then the
 * provision route gives them a workspace and its first Chatfuel bot
 * (`cf_claim_workspace`, then `cf_new_bot` and the mutation) — and the second
 * one can fail on its own. So the screen stays mounted and signed in and says
 * which half went wrong, rather than treating "account created" as done. The
 * same screen therefore also handles "already signed in, not in yet".
 *
 * `actions.provision()` below and the provider's own fetch (SIGNED_IN lands at
 * about the same moment) are ONE request: they share an in-flight promise, so
 * whichever arrives second is told the same thing rather than asking for a
 * second first bot. Nothing here needs to know which of them won.
 */
import { useState, type FormEvent } from 'react';
import { Button, FormField, IconMail, Input, PasswordInput } from '~ui';
import { useAuth } from '../AuthContext';
import { SIGN_OUT_UNCONFIRMED, codeOfError, messageForError } from '../lib/copy';
import { signOutConfirmed } from '../lib/signOut';
import { passwordsMatch, validateEmail, validateName, validatePassword } from '../lib/validation';
import { AuthFrame } from './AuthFrame';
import { ErrorAlert, FormStack, ScreenNotice, TextLink, type ScreenProps } from './parts';

interface FieldErrors {
  name: string | null;
  email: string | null;
  password: string | null;
  confirm: string | null;
}
const NO_FIELD_ERRORS: FieldErrors = { name: null, email: null, password: null, confirm: null };

export function SignUpPage({ route }: ScreenProps) {
  const { state, actions, navigate } = useAuth();

  const returnTo = route.params.get('returnTo');
  const carry = returnTo === null ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState<FieldErrors>(NO_FIELD_ERRORS);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Set once the address has been submitted and there is nothing more to say
   * about it — GoTrue accepted the account and withheld the session, or the
   * address was already taken. The two are deliberately one state: see
   * `submit`.
   */
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const signedInUser = state.kind === 'signedIn' ? state.user : null;

  const fail = (error: unknown) => {
    setFailure(messageForError(error));
    setBusy(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: passwordsMatch(password, confirm),
    };
    setFields(next);
    if (Object.values(next).some((message) => message !== null)) return;

    setFailure(null);
    setBusy(true);
    void (async () => {
      try {
        const result = await actions.signUp({ email: email.trim(), password, name: name.trim() || undefined });
        if (result.needsEmailConfirmation) {
          setConfirmEmail(email.trim());
          setBusy(false);
          return;
        }
        await actions.provision();
        /* No navigate: the workspace lands and AuthRouter leaves this route. */
      } catch (error) {
        /*
         * A taken address is answered exactly like a free one. `copy.ts` states
         * the module's rule — never disclose whether an account exists — and
         * sign-in and password reset both keep it; this screen used to print
         * "An account with this email already exists" and offer a Sign in
         * button, which turns the form into a membership oracle for anyone
         * willing to submit addresses to it.
         *
         * GoTrue only returns this code when email confirmation is off in the
         * deployment. With confirmation on it obfuscates the answer itself, so
         * this branch is what makes the two configurations behave alike.
         */
        if (codeOfError(error) === 'UserExists') {
          setConfirmEmail(email.trim());
          setBusy(false);
          return;
        }
        fail(error);
      }
    })();
  };

  const continueAsCurrent = () => {
    setFailure(null);
    setBusy(true);
    void (async () => {
      try {
        await actions.provision();
      } catch (error) {
        fail(error);
      }
    })();
  };

  const useAnotherAccount = () => {
    setFailure(null);
    setBusy(true);
    void (async () => {
      if (!(await signOutConfirmed(actions.signOut))) setFailure(SIGN_OUT_UNCONFIRMED);
      setBusy(false);
    })();
  };

  const signInLink = (
    <>
      <span>Already have an account?</span>
      <TextLink onClick={() => navigate(`/sign-in${carry}`)}>Sign in</TextLink>
    </>
  );

  if (confirmEmail !== null) {
    return (
      <AuthFrame title="Confirm your email" footer={signInLink}>
        <ScreenNotice
          icon={<IconMail />}
          actions={
            <Button variant="secondary" onClick={() => navigate(`/sign-in?email=${encodeURIComponent(confirmEmail)}`)}>
              Back to sign in
            </Button>
          }
        >
          {/* Hedged on purpose: the same screen answers an address that was
              free and one that was already taken, and it must not say which. */}
          <p aria-live="polite">
            If <span className="font-medium text-text">{confirmEmail}</span> can be used for a new account, a
            confirmation link is on its way. Open it, then come back here to sign in.
          </p>
        </ScreenNotice>
      </AuthFrame>
    );
  }

  /* Signed in already — they just created the account, or came back to this
     route in the same browser. No second account, only the join step. */
  if (signedInUser !== null) {
    return (
      <AuthFrame title="Finish setting up">
        <div className="flex flex-col gap-4">
          {failure !== null ? <ErrorAlert message={failure} /> : null}
          <p className="text-sm text-text-muted">
            You are signed in as <span className="font-medium text-text">{signedInUser.email}</span>.
          </p>
          <div className="flex flex-col gap-2">
            <Button loading={busy} onClick={continueAsCurrent}>
              Continue as {signedInUser.email}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={useAnotherAccount}>
              Use a different account
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create your account" width="md" footer={signInLink}>
      <FormStack onSubmit={submit}>
        {failure !== null ? <ErrorAlert message={failure} /> : null}

        <FormField label="Name" error={fields.name}>
          {(a11y) => (
            <Input
              {...a11y}
              name="name"
              autoComplete="name"
              maxLength={80}
              autoFocus
              disabled={busy}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fields.name !== null) setFields((f) => ({ ...f, name: null }));
              }}
            />
          )}
        </FormField>

        <FormField label="Email" required error={fields.email}>
          {(a11y) => (
            <Input
              {...a11y}
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@company.com"
              spellCheck={false}
              autoCapitalize="off"
              disabled={busy}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fields.email !== null) setFields((f) => ({ ...f, email: null }));
              }}
            />
          )}
        </FormField>

        <FormField label="Password" required error={fields.password} hint="At least 8 characters.">
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="new-password"
              autoComplete="new-password"
              showStrength
              disabled={busy}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fields.password !== null) setFields((f) => ({ ...f, password: null }));
              }}
            />
          )}
        </FormField>

        <FormField label="Repeat password" required error={fields.confirm}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="confirm-password"
              autoComplete="new-password"
              disabled={busy}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                if (fields.confirm !== null) setFields((f) => ({ ...f, confirm: null }));
              }}
            />
          )}
        </FormField>

        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </FormStack>
    </AuthFrame>
  );
}
