import { lazy } from 'react';
import { IconBook } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'knowledge-base',
  title: 'Knowledge Base',
  icon: <IconBook />,
  Component: lazy(() => import('./KnowledgeBaseApp').then((m) => ({ default: m.KnowledgeBaseApp }))),
};
