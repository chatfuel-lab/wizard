import { lazy } from 'react';
import { IconCalendar } from '~ui';
import type { ModuleDescriptor } from '../types';

export const moduleDescriptor: ModuleDescriptor = {
  id: 'bookings',
  title: 'Bookings',
  icon: <IconCalendar />,
  Component: lazy(() => import('./BookingsApp').then((m) => ({ default: m.BookingsApp }))),
};
