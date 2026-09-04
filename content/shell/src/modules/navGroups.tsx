import type { ReactNode } from 'react';
import {
  IconInbox,
  IconLayoutGrid,
  IconMegaphone,
  IconSettings,
  IconSparkles,
  IconUsers,
  type SideNavGroup,
} from '~ui';
import type { ModuleDescriptor } from './types';

/**
 * The menu's information architecture — the ONE place it lives.
 *
 * Not a field on `ModuleDescriptor`, and not the order of `MODULES`. The
 * registry beside this file is generated: the wizard rewrites it from the
 * modules the user picked, in `readdirSync` order, so its array order is
 * alphabetical in a scaffolded app and curated only here in the repo. A menu
 * built from that order would read differently in every deployment. This table
 * names both the grouping and the order, and answers the same way everywhere.
 *
 * Ids, not imports: a shell file may not reach into a module's subtree
 * (by the module boundaries), and it does not need to — `buildNavGroups` is handed
 * the descriptors the registry already exported.
 *
 * Adding a module: put its id in a group here. Forget to, and it still appears,
 * under `FALLBACK` — a menu that silently drops a page would be worse than one
 * with an extra heading in it.
 */
export interface NavGroupDef {
  id: string;
  title: string;
  icon: ReactNode;
  /** Module ids, in the order they should read. Ids not installed are skipped. */
  items: readonly string[];
}

/* @chatfuel:nav-groups (the wizard filters this table to the modules this app installed) */
export const NAV_GROUPS: readonly NavGroupDef[] = [
  {
    id: 'ai',
    title: 'AI Agent',
    icon: <IconSparkles />,
    items: ['automations', 'flow-builder', 'knowledge-base'],
  },
  {
    id: 'chat',
    title: 'Live Chat',
    icon: <IconInbox />,
    items: ['livechat'],
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: <IconUsers />,
    items: ['contacts', 'deals', 'bookings'],
  },
  {
    id: 'growth',
    title: 'Growth',
    icon: <IconMegaphone />,
    items: ['coworker', 'publishing', 'ads-optimization'],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <IconSettings />,
    items: ['channels'],
  },
];
/* @chatfuel:end-nav-groups */

/**
 * The modules the MENU may show, out of everything the registry holds.
 *
 * Two different exclusions, and they are not the same thing. `hidden` is not a
 * destination at all — no rail item and no '/<id>' route (auth wraps the shell
 * instead). `railHidden` is routed like any module and simply never listed: the
 * admin panel is reached by typing its address, which is the point of it.
 *
 * It lives here rather than in `App` because this file is where "what the menu
 * is" already lives, and because a rule with a test on it is a rule that
 * survives somebody tidying the filter away.
 */
export const railModules = (modules: ModuleDescriptor[]): ModuleDescriptor[] =>
  modules.filter((module) => !module.hidden && !module.railHidden);

/** Where a module nobody placed ends up. Rendered only when it has something in it. */
export const FALLBACK_GROUP: Omit<NavGroupDef, 'items'> = {
  id: 'more',
  title: 'More',
  icon: <IconLayoutGrid />,
};

/**
 * Lay the installed modules out over the group table.
 *
 * Every rule here exists because a scaffolded app gets a SUBSET: ids that were
 * never installed vanish, groups that end up empty do not render, and a single
 * remaining module gets no nav at all — which is what the shell did before
 * there were groups, and the reason `AppShell.nav` is optional.
 */
export function buildNavGroups(
  modules: ModuleDescriptor[],
  defs: readonly NavGroupDef[] = NAV_GROUPS,
  fallback: Omit<NavGroupDef, 'items'> = FALLBACK_GROUP,
): SideNavGroup[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const placed = new Set<string>();
  const groups: SideNavGroup[] = [];

  for (const def of defs) {
    const items = [];
    for (const id of def.items) {
      const module = byId.get(id);
      // `placed` also settles an id listed in two groups: the first wins.
      if (!module || placed.has(id)) continue;
      placed.add(id);
      items.push({ id: module.id, title: module.title, icon: module.icon });
    }
    if (items.length > 0) groups.push({ id: def.id, title: def.title, icon: def.icon, items });
  }

  const rest = modules.filter((m) => !placed.has(m.id));
  if (rest.length > 0) {
    groups.push({
      ...fallback,
      items: rest.map((m) => ({ id: m.id, title: m.title, icon: m.icon })),
    });
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return total > 1 ? groups : [];
}
