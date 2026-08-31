import { useState } from 'react';
import { Alert, Button, Card } from '~ui';
import { useAdmin } from '../AdminContext';
import { SCHEDULER_BUSY_ID } from '../hooks/useAdminStore';
import { errorMessage } from '../lib/adminErrors';
import type { AdminHealth } from '../types';

export interface SchedulerCardProps {
  health: AdminHealth;
}

/**
 * The one thing about this deployment that cannot be set before it is deployed.
 *
 * A scheduled post fires from a timer beside the database, which has to be told
 * an address to call — and that address is not known while the app is being
 * scaffolded, because the app has no name yet. It is known here, once
 * `PUBLIC_URL` is set, and this is the button that writes it down.
 *
 * There is no field to type an address into, and that is the point rather than
 * an omission: registering records where a credential gets posted every minute
 * from then on, so the address is the deployment's own configuration and never
 * something a request carries. A deployment that has not been told its own name
 * is refused, in the server's own words.
 */
export function SchedulerCard({ health }: SchedulerCardProps) {
  const { store } = useAdmin();
  const [error, setError] = useState<string | null>(null);
  const busy = store.state.busy.includes(SCHEDULER_BUSY_ID);

  if (!health.publishingQueue) return null;

  const register = async (): Promise<void> => {
    setError(null);
    try {
      await store.registerScheduler();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const on = health.scheduling === true;
  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-label text-text-muted">Scheduled posts</div>
          <div className="text-body text-text">{health.scheduling === null ? 'Unknown' : on ? 'On' : 'Off'}</div>
        </div>
        <p className="text-body text-text-muted">
          {on
            ? 'A timer beside the database calls this deployment when a post comes due. Register again after the address in PUBLIC_URL changes.'
            : 'Posts can be queued, but nothing will publish them while nobody is looking until this deployment tells the timer where to call.'}
        </p>
        {error ? <Alert tone="danger" title={error} /> : null}
        <div>
          <Button variant={on ? 'secondary' : 'primary'} loading={busy} onClick={() => void register()}>
            {on ? 'Register again' : 'Enable scheduled posts'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
