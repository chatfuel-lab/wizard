import { useState, type FormEvent } from 'react';
import { Alert, AuthLayout, Button, FormField, IconShield, PasswordInput } from '~ui';
import { errorMessage } from '../lib/adminErrors';
import type { AdminSession } from '../lib/adminApi';

export interface LockScreenProps {
  session: AdminSession;
  onUnlock: (password: string) => Promise<void>;
}

/**
 * The door.
 *
 * `AuthLayout` on purpose: this is the same kind of screen as signing in, and a
 * panel that invented its own frame for it would read as a different product
 * inside the same app.
 *
 * The three states below the form are not decoration — they are the difference
 * between "type the password" and "there is nothing to type it into", and a
 * deployment that never set ADMIN_PASSWORD has to be told so at the moment
 * somebody looks for the panel rather than left guessing at a form that can
 * never be right.
 */
export function LockScreen({ session, onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
      setPassword('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (session === 'absent' || session === 'misconfigured') {
    return (
      <AuthLayout title="Admin" brand={<IconShield />} fill={false}>
        <Alert tone="warning" title={session === 'absent' ? 'No admin panel here' : 'Admin password too short'}>
          {session === 'absent'
            ? 'Set ADMIN_PASSWORD in this deployment’s environment and restart it.'
            : 'ADMIN_PASSWORD must be at least 16 characters. Set a longer one and restart.'}
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Admin" brand={<IconShield />} fill={false}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <FormField label="Password" error={error}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" loading={busy} disabled={!password}>
          Unlock
        </Button>
      </form>
    </AuthLayout>
  );
}
