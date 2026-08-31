import { lazy } from 'react';
import { IconInstagram } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'publishing',
  title: 'Publishing',
  icon: <IconInstagram />,
  Component: lazy(() => import('./PublishingApp').then((m) => ({ default: m.PublishingApp }))),
};
