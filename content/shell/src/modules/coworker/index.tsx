import { lazy } from 'react';
import { IconAssistant } from '~ui';
import type { ModuleDescriptor } from '../types';

/**
 * `IconAssistant`, not `IconSparkles`: the sparkle already stands for the AI
 * Agent section of the nav AND for the automations module inside it, and a
 * third meaning in the same rail is one too many.
 */
export const moduleDescriptor: ModuleDescriptor = {
  id: 'coworker',
  title: 'Coworker',
  icon: <IconAssistant />,
  Component: lazy(() => import('./CoworkerApp').then((m) => ({ default: m.CoworkerApp }))),
};
