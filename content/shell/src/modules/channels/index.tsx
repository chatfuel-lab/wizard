import { lazy } from 'react';
import { IconLink } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'channels',
  title: 'Channels',
  icon: <IconLink />,
  Component: lazy(() => import('./ChannelsApp').then((m) => ({ default: m.ChannelsApp }))),
};
