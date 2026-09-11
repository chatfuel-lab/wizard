import { lazy } from 'react';
import { IconAssistant } from '~ui';
import type { ModuleDescriptor } from '../types';

/**
 * `IconAssistant`, not `IconSparkles`: the sparkle already stands for the AI
 * section of the nav, and a second meaning in the same rail is one too many.
 */
export const moduleDescriptor: ModuleDescriptor = {
  id: 'coworker',
  title: 'Copilot',
  icon: <IconAssistant />,
  Component: lazy(() => import('./CoworkerApp').then((m) => ({ default: m.CoworkerApp }))),
};
