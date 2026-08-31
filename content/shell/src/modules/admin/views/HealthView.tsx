import { useEffect } from 'react';
import { PageBody, Spinner } from '~ui';
import { useAdmin } from '../AdminContext';
import { HealthGrid } from '../components/HealthGrid';
import { SchedulerCard } from '../components/SchedulerCard';

/**
 * The deployment's own state, asked for when this tab is opened rather than on
 * every load: the token check is a real round trip to Chatfuel, and the two
 * tabs beside this one have no use for it.
 */
export function HealthView() {
  const { store } = useAdmin();
  const { health } = store.state;
  const { loadHealth } = store;

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  return (
    <PageBody padded measure="app">
      {health ? (
        <div className="flex flex-col gap-4">
          <HealthGrid health={health} />
          <SchedulerCard health={health} />
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
    </PageBody>
  );
}
