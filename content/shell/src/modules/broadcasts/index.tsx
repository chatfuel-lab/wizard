import { lazy } from 'react';
import { IconMegaphone } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'broadcasts',
  title: 'Broadcasts',
  icon: <IconMegaphone />,
  Component: lazy(() => import('./BroadcastsApp').then((m) => ({ default: m.BroadcastsApp }))),
};
