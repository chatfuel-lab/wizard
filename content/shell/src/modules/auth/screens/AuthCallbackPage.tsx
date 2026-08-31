/**
 * `/auth/callback`, and every `#error=…` fragment Supabase can bounce back.
 *
 * Two arrivals land here. A GOOD one is a `?code=` in the query string, which
 * supabase-js has already exchanged by the time this renders — there is
 * nothing to do but wait for the session and leave. A BAD one is a fragment
 * like `#error=access_denied&error_code=otp_expired&error_description=…`,
 * which never reaches the client library at all: it is not a route, it is an
 * apology, and `parseHash` maps it here so somebody explains it.
 *
 * `error_description` is not printed. It is GoTrue's wording, in GoTrue's
 * vocabulary, and it is the string most likely to say something like "Email
 * link is invalid or has expired" twice in a row.
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Spinner } from '~ui';
import { useAuth } from '../AuthContext';
import { decodeReturnTo } from '../lib/authRoutes';
import { AuthFrame } from './AuthFrame';
import { ScreenNotice, type ScreenProps } from './parts';

/** How long a session may take to appear before we stop claiming to be working. */
const EXCHANGE_TIMEOUT_MS = 10000;

const ERROR_TITLES: Readonly<Record<string, string>> = {
  otp_expired: 'This link has expired',
  access_denied: 'That link could not be used',
  bad_code_verifier: 'This link was opened in a different browser',
  flow_state_expired: 'This link has expired',
  flow_state_not_found: 'This link was opened in a different browser',
};

const ERROR_BODIES: Readonly<Record<string, string>> = {
  otp_expired: 'Sign-in and reset links are time-limited. Ask for a new one and open it as soon as it arrives.',
  bad_code_verifier: 'A sign-in link has to finish in the browser that started it. Request a new one and open it here.',
  flow_state_expired: 'Sign-in and reset links are time-limited. Ask for a new one and open it as soon as it arrives.',
  flow_state_not_found:
    'A sign-in link has to finish in the browser that started it. Request a new one and open it here.',
};

export function AuthCallbackPage({ route }: ScreenProps) {
  const { state, navigate } = useAuth();

  const errorCode = route.params.get('error_code');
  const error = route.params.get('error');
  const returnTo = route.params.get('returnTo');
  const failed = errorCode !== null || error !== null;

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (failed) return undefined;
    if (state.kind === 'signedIn') {
      navigate(decodeReturnTo(returnTo) ?? '/', { replace: true });
      return undefined;
    }
    const id = setTimeout(() => setTimedOut(true), EXCHANGE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [failed, navigate, returnTo, state.kind]);

  if (failed) {
    const key = errorCode ?? error ?? '';
    return (
      <AuthFrame title={ERROR_TITLES[key] ?? 'That link could not be used'}>
        <div className="flex flex-col gap-4">
          <Alert tone="danger">We could not complete the sign-in from that link.</Alert>
          <ScreenNotice
            actions={
              <>
                <Button onClick={() => navigate('/forgot-password')}>Request a new link</Button>
                <Button variant="ghost" onClick={() => navigate('/sign-in')}>
                  Sign in
                </Button>
              </>
            }
          >
            {ERROR_BODIES[key] ?? 'Ask for a new link, or sign in with your email and password instead.'}
          </ScreenNotice>
        </div>
      </AuthFrame>
    );
  }

  if (timedOut) {
    return (
      <AuthFrame title="We could not sign you in">
        <ScreenNotice
          actions={
            <>
              <Button onClick={() => navigate('/sign-in')}>Sign in</Button>
              <Button variant="ghost" onClick={() => navigate('/forgot-password')}>
                Request a new link
              </Button>
            </>
          }
        >
          The link did not produce a session. It may have already been used, or opened in a different browser than the
          one that requested it.
        </ScreenNotice>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Signing you in…">
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <Spinner />
        <span role="status">Finishing up…</span>
      </div>
    </AuthFrame>
  );
}
