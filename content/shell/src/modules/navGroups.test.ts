import { describe, expect, it } from 'vitest';
import { MODULES } from './index';
import { NAV_GROUPS, buildNavGroups, railModules, type NavGroupDef } from './navGroups';
import type { ModuleDescriptor } from './types';

const module = (id: string, title = id): ModuleDescriptor => ({
  id,
  title,
  icon: null,
  Component: () => null,
});

const DEFS: NavGroupDef[] = [
  { id: 'a', title: 'A', icon: null, items: ['one', 'two'] },
  { id: 'b', title: 'B', icon: null, items: ['three'] },
];

const shape = (groups: ReturnType<typeof buildNavGroups>) => groups.map((g) => [g.id, g.items.map((i) => i.id)]);

describe('buildNavGroups', () => {
  it('groups and orders by the table, not by the order modules arrive in', () => {
    // The registry is generated in readdirSync order, so this is the realistic
    // input: alphabetical, and nothing like the order the menu should read in.
    const groups = buildNavGroups([module('three'), module('two'), module('one')], DEFS);
    expect(shape(groups)).toEqual([
      ['a', ['one', 'two']],
      ['b', ['three']],
    ]);
  });

  it('skips ids that were never installed and drops the groups they emptied', () => {
    const groups = buildNavGroups([module('one'), module('three')], DEFS);
    expect(shape(groups)).toEqual([
      ['a', ['one']],
      ['b', ['three']],
    ]);
    expect(shape(buildNavGroups([module('one'), module('two')], DEFS))).toEqual([['a', ['one', 'two']]]);
  });

  it('puts a module nobody placed in the fallback group, last', () => {
    const groups = buildNavGroups([module('one'), module('two'), module('stray')], DEFS);
    expect(shape(groups)).toEqual([
      ['a', ['one', 'two']],
      ['more', ['stray']],
    ]);
  });

  it('gives an id listed in two groups to the first one', () => {
    const defs: NavGroupDef[] = [
      { id: 'a', title: 'A', icon: null, items: ['one'] },
      { id: 'b', title: 'B', icon: null, items: ['one', 'two'] },
    ];
    expect(shape(buildNavGroups([module('one'), module('two')], defs))).toEqual([
      ['a', ['one']],
      ['b', ['two']],
    ]);
  });

  it('renders no nav at all for a single-module scaffold', () => {
    expect(buildNavGroups([module('one')], DEFS)).toEqual([]);
    expect(buildNavGroups([], DEFS)).toEqual([]);
  });

  it('carries the module title and icon through untouched', () => {
    const [group] = buildNavGroups([module('one', 'Automations'), module('two')], DEFS);
    expect(group.items[0]).toEqual({ id: 'one', title: 'Automations', icon: null });
  });
});

describe('NAV_GROUPS', () => {
  it('names only modules that exist', () => {
    const installed = new Set(MODULES.map((m) => m.id));
    const unknown = NAV_GROUPS.flatMap((g) => g.items).filter((id) => !installed.has(id));
    expect(unknown).toEqual([]);
  });

  it('names each module at most once', () => {
    const ids = NAV_GROUPS.flatMap((g) => g.items);
    expect(ids).toEqual([...new Set(ids)]);
  });
});

describe('railModules', () => {
  it('drops a module that wraps the shell and one that is routed but never listed', () => {
    const listed = railModules([
      module('one'),
      { ...module('wrapper'), hidden: true },
      { ...module('by-address'), railHidden: true },
    ]);
    expect(listed.map((m) => m.id)).toEqual(['one']);
  });

  it('keeps the admin panel off the menu, and keeps it routable', () => {
    /* The rule, pinned rather than trusted to a comment: the panel administers
       the whole Chatfuel account, and the rail is the list of places a
       product's USERS go. It is reached by typing '/admin'. */
    const admin = MODULES.find((m) => m.id === 'admin');
    if (!admin) return;
    expect(admin.railHidden).toBe(true);
    /* `hidden` would take the route away too, and then nobody could reach the
       password form at all. */
    expect(admin.hidden).toBeFalsy();
    expect(railModules(MODULES).map((m) => m.id)).not.toContain('admin');
    expect(buildNavGroups(railModules(MODULES)).flatMap((g) => g.items.map((i) => i.id))).not.toContain('admin');
  });
});
