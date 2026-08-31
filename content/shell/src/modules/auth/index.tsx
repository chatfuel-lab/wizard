import { lazy } from 'react';
import { IconUsers } from '~ui';
import type { ModuleDescriptor } from '../types';
import { authRoutes, createAuthRuntime } from './runtime';

/**
 * The auth module is a HIDDEN module: no rail item, no '/auth' route. It
 * contributes a host integration instead — the shell wraps itself in its Gate,
 * shows its user menu in the Topbar and renders its Team page for '/team'.
 * The Component below exists for the embed story (a standalone Team page) and
 * for the module contract; the shell never mounts it as a module.
 */
export const moduleDescriptor: ModuleDescriptor = {
  id: 'auth',
  title: 'Team',
  icon: <IconUsers />,
  hidden: true,
  Component: lazy(() => import('./team/TeamStandalone').then((m) => ({ default: m.TeamStandalone }))),
  host: { routes: authRoutes, create: createAuthRuntime },
};
