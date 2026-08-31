import { lazy } from 'react';
import { IconFlow } from '~ui';
import { registerDeviceCache } from '../shellApi';
import { browserStorage, evictSnapshots } from './lib/flowSnapshot';
import type { ModuleDescriptor } from '../types';

/* Registered here rather than in the screen: a snapshot is a whole flow held on
   the device, and it has to be dropped when the person signs out or moves to
   another bot whether or not the flow builder was ever opened in this tab. */
registerDeviceCache(() => {
  const storage = browserStorage();
  if (storage) evictSnapshots(storage);
});

export const moduleDescriptor: ModuleDescriptor = {
  id: 'flow-builder',
  title: 'Flow Builder',
  icon: <IconFlow />,
  Component: lazy(() => import('./FlowBuilderApp').then((m) => ({ default: m.FlowBuilderApp }))),
};
