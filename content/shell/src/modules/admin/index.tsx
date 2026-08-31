import { lazy } from 'react';
import { IconShield } from '~ui';
import type { ModuleDescriptor } from '../types';

/**
 * Routed like any other module, and in the rail like no other: never.
 *
 * `/admin` is the whole way in, before and after unlocking. The rail is the
 * app's list of places its USERS go, and on a deployment with customers the
 * operator's door does not belong on it — an item that appeared once the
 * password was accepted would still be an item anybody could see the moment
 * they borrowed the machine.
 *
 * The icon and the title stay because the module contract asks for them and an
 * embed host may want them; nothing in this shell draws either.
 */
export const moduleDescriptor: ModuleDescriptor = {
  id: 'admin',
  title: 'Admin',
  icon: <IconShield />,
  railHidden: true,
  Component: lazy(() => import('./AdminApp').then((m) => ({ default: m.AdminApp }))),
};
