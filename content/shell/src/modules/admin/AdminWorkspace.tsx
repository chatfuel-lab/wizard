import { ModuleRoot, useBand } from '~ui';
import { useAdmin } from './AdminContext';
import { AdminHeader } from './components/AdminHeader';
import { LockScreen } from './components/LockScreen';
import { DEFAULT_VIEW, parseAddress, viewSegment, writeAddress, type AdminAddress } from './lib/adminParams';
import { AccessView } from './views/AccessView';
import { BotsView } from './views/BotsView';
import { HealthView } from './views/HealthView';
import type { AdminViewProps } from './views/types';

const VIEW_COMPONENTS = {
  bots: BotsView,
  access: AccessView,
  health: HealthView,
} satisfies Record<string, (props: AdminViewProps) => React.ReactElement>;

export interface AdminWorkspaceProps {
  view: string;
  setView: (view: string, params?: URLSearchParams, options?: { replace?: boolean }) => void;
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}

/**
 * The panel's frame: the lock in front of it, the address behind it, and the
 * three views it switches between.
 *
 * The lock is answered HERE and not per view, because all three views are the
 * same nothing without a session — and because the header's own controls
 * (refresh, lock) belong to somebody who is already in.
 *
 * Nothing in this component may render the providers it reads; `AdminApp` owns
 * those, and a hook that needs one called above it throws at runtime where
 * neither the type checker nor a node-only test suite can see it.
 */
export function AdminWorkspace({ view, setView, params, setParams }: AdminWorkspaceProps) {
  const { store } = useAdmin();
  const band = useBand();
  const address = parseAddress(view, params);

  const patch = (next: Partial<AdminAddress>) => {
    const merged = { ...address, ...next };
    setParams(writeAddress(params, merged));
  };

  const goToView = (nextView: AdminAddress['view']) => {
    /* A view change is a place, so it pushes — and it drops the open bot with
       it: a panel over the health tab would be a drawer nothing on screen is
       about. */
    setView(viewSegment(nextView), writeAddress(params, { ...address, view: nextView, bot: null }));
  };

  if (store.state.session !== 'unlocked') {
    return (
      <ModuleRoot>
        {store.state.session === 'unknown' ? null : (
          <LockScreen session={store.state.session} onUnlock={store.unlock} />
        )}
      </ModuleRoot>
    );
  }

  const showAccess = store.state.overview?.capabilities.access ?? false;
  /* An address pointing at a tab this deployment does not have opens the
     default one rather than a blank pane. */
  const active = address.view === 'access' && !showAccess ? DEFAULT_VIEW : address.view;
  const View = VIEW_COMPONENTS[active];

  return (
    <>
      <AdminHeader
        view={active}
        onView={goToView}
        accountName={store.state.overview?.account.name ?? null}
        showAccess={showAccess}
        loading={store.state.loading}
        onRefresh={store.refresh}
        onLock={() => void store.lock()}
      />
      <View band={band} address={{ ...address, view: active }} patch={patch} />
    </>
  );
}
