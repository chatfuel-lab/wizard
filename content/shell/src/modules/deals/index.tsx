import { lazy } from 'react';
import { IconKanban } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'deals',
  title: 'Deals',
  icon: <IconKanban />,
  Component: lazy(() => import('./DealsApp').then((m) => ({ default: m.DealsApp }))),
};
