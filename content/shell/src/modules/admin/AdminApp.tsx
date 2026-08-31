import { useMemo } from 'react';
import { ModuleRoot, ToastProvider } from '~ui';
import type { ModuleAppProps } from '../types';
import { AdminContext } from './AdminContext';
import { AdminWorkspace } from './AdminWorkspace';
import { useAdminStore } from './hooks/useAdminStore';

/**
 * Embeddable root of the Admin module — the account behind this deployment's
 * Chatfuel token: its workspaces, its bots, who reaches them, and whether the
 * deployment itself is healthy.
 *
 * This component owns the providers and nothing else; `AdminWorkspace` owns the
 * lock, the address and the views. Every hook called HERE takes its arguments,
 * and nothing here reads a context this file provides — a context hook called
 * inside the component that renders the provider throws at runtime, and neither
 * `tsc` nor a node-only test suite can see it.
 */
export function AdminApp({ client, view, setView, params, setParams, selectBot }: ModuleAppProps) {
  const store = useAdminStore(client);
  const context = useMemo(() => ({ client, store, selectBot }), [client, store, selectBot]);

  return (
    <ToastProvider>
      <AdminContext.Provider value={context}>
        <ModuleRoot className="relative">
          <AdminWorkspace view={view} setView={setView} params={params} setParams={setParams} />
        </ModuleRoot>
      </AdminContext.Provider>
    </ToastProvider>
  );
}
