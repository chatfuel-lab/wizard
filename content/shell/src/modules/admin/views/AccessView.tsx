import { useEffect } from 'react';
import { PageBody, Spinner } from '~ui';
import { useAdmin } from '../AdminContext';
import { AccessTable } from '../components/AccessTable';

/**
 * Who reaches which bot. Only mounted where the deployment has a database —
 * without one there are no accounts in this app and nothing to grant.
 */
export function AccessView() {
  const { store } = useAdmin();
  const { tenants, unassigned } = store.state;
  const { loadTenants } = store;

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const grant = async (botId: string, userId: string, tenantId: string) => {
    await store.grantBot(botId, userId, tenantId);
  };
  const revoke = async (botId: string, userId: string) => {
    await store.revokeBot(botId, userId);
  };

  return (
    <PageBody padded={false}>
      {tenants ? (
        <AccessTable tenants={tenants} unassigned={unassigned} onGrant={grant} onRevoke={revoke} />
      ) : (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
    </PageBody>
  );
}
