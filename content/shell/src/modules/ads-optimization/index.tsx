import { lazy } from 'react';
import { IconMegaphone } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'ads-optimization',
  title: 'Ads Optimization',
  icon: <IconMegaphone />,
  Component: lazy(() => import('./AdsOptimizationApp').then((m) => ({ default: m.AdsOptimizationApp }))),
};
