import { lazy } from 'react';
import { IconInbox } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'livechat',
  title: 'Inbox',
  icon: <IconInbox />,
  Component: lazy(() => import('./LivechatApp').then((m) => ({ default: m.LivechatApp }))),
};
