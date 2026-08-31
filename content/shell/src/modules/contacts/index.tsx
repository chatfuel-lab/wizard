import { lazy } from 'react';
import { IconContacts } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'contacts',
  title: 'Contacts',
  icon: <IconContacts />,
  Component: lazy(() => import('./ContactsApp').then((m) => ({ default: m.ContactsApp }))),
};
