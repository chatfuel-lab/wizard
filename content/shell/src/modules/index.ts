// @chatfuel:module-registry — the wizard regenerates this file with the
// selected modules at scaffold time. In-repo it lists every ready module.
import type { ModuleDescriptor } from './types';
import { moduleDescriptor as livechat } from './livechat';
import { moduleDescriptor as coworker } from './coworker';
import { moduleDescriptor as contacts } from './contacts';
import { moduleDescriptor as deals } from './deals';
import { moduleDescriptor as knowledgeBase } from './knowledge-base';
import { moduleDescriptor as bookings } from './bookings';
import { moduleDescriptor as flowBuilder } from './flow-builder';
import { moduleDescriptor as automations } from './automations';
import { moduleDescriptor as adsOptimization } from './ads-optimization';
import { moduleDescriptor as publishing } from './publishing';
import { moduleDescriptor as channels } from './channels';
import { moduleDescriptor as admin } from './admin';
import { moduleDescriptor as auth } from './auth';

export const MODULES: ModuleDescriptor[] = [
  livechat,
  coworker,
  contacts,
  deals,
  knowledgeBase,
  bookings,
  flowBuilder,
  automations,
  adsOptimization,
  publishing,
  channels,
  admin,
  auth,
];
