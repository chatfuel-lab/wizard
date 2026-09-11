import { lazy } from 'react';
import { IconBolt } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'automations',
  title: 'AI Agent',
  icon: <IconBolt />,
  Component: lazy(() => import('./AutomationsApp').then((m) => ({ default: m.AutomationsApp }))),
};
