import { describe, expect, it, vi } from 'vitest';
import { actionParams, createShellBridge, resolveDestination, type Destination } from './shellBridge';

const DESTINATIONS: Destination[] = [
  { id: 'livechat', title: 'Inbox' },
  { id: 'deals', title: 'Deals' },
  { id: 'flow-builder', title: 'Flows' },
  { id: 'knowledge-base', title: 'Knowledge base' },
];

describe('resolveDestination', () => {
  it('matches the page name the model actually sends', () => {
    expect(resolveDestination(DESTINATIONS, 'Deals')?.id).toBe('deals');
    expect(resolveDestination(DESTINATIONS, 'Knowledge Base')?.id).toBe('knowledge-base');
  });

  it('matches the module id, punctuation and case ignored', () => {
    expect(resolveDestination(DESTINATIONS, 'flow-builder')?.id).toBe('flow-builder');
    expect(resolveDestination(DESTINATIONS, 'Flow Builder')?.id).toBe('flow-builder');
    expect(resolveDestination(DESTINATIONS, 'LIVECHAT')?.id).toBe('livechat');
  });

  it('prefers the title over an id that spells another module', () => {
    const shadowed: Destination[] = [
      { id: 'deals', title: 'Pipeline' },
      { id: 'pipeline', title: 'Something else' },
    ];
    expect(resolveDestination(shadowed, 'Pipeline')?.id).toBe('deals');
  });

  it('knows the page names the assistant actually uses', () => {
    // Asked of the live assistant: "Live Chat, Contacts, Leads, Calendar,
    // Flows, ... automations, catalog, FAQ".
    expect(resolveDestination(DESTINATIONS, 'Live Chat')?.id).toBe('livechat');
    expect(resolveDestination(DESTINATIONS, 'Leads')?.id).toBe('deals');
    expect(resolveDestination(DESTINATIONS, 'Flows')?.id).toBe('flow-builder');
    expect(resolveDestination(DESTINATIONS, 'catalog')?.id).toBe('knowledge-base');
    expect(resolveDestination(DESTINATIONS, 'FAQ')?.id).toBe('knowledge-base');
  });

  it('does not invent a page for the ones this shell does not have', () => {
    // Real Chatfuel destinations, absent from this dashboard.
    expect(resolveDestination(DESTINATIONS, 'Billing')).toBeNull();
    expect(resolveDestination(DESTINATIONS, 'API')).toBeNull();
    expect(resolveDestination(DESTINATIONS, 'teammates')).toBeNull();
  });

  it('refuses anything that is not a usable name', () => {
    expect(resolveDestination(DESTINATIONS, 'Billing')).toBeNull();
    expect(resolveDestination(DESTINATIONS, '')).toBeNull();
    expect(resolveDestination(DESTINATIONS, '  ')).toBeNull();
    expect(resolveDestination(DESTINATIONS, undefined)).toBeNull();
    expect(resolveDestination(DESTINATIONS, 42)).toBeNull();
    expect(resolveDestination(DESTINATIONS, '!!!')).toBeNull();
  });
});

describe('actionParams', () => {
  it('takes scalars and drops anything structural', () => {
    const params = actionParams({ params: { c: 'abc', n: 7, ok: true, deep: { a: 1 }, arr: [1], nil: null } });
    expect(Object.fromEntries(params)).toEqual({ c: 'abc', n: '7', ok: 'true' });
  });

  it('caps the count and the length', () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, 'v']));
    expect(actionParams({ params: many }).size).toBe(12);
    expect(actionParams({ params: { long: 'x'.repeat(500) } }).get('long')).toHaveLength(200);
  });

  it('is empty when there are no params at all', () => {
    expect(actionParams({}).size).toBe(0);
    expect(actionParams({ params: 'nope' }).size).toBe(0);
    expect(actionParams({ params: null }).size).toBe(0);
  });
});

function bridge(overrides: Partial<Parameters<typeof createShellBridge>[0]> = {}) {
  const navigate = vi.fn();
  const restore = vi.fn();
  return {
    navigate,
    restore,
    api: createShellBridge({
      destinations: DESTINATIONS,
      currentRoute: () => ({ moduleId: 'bookings', params: new URLSearchParams('view=calendar') }),
      currentUrl: () => '/bookings/calendar',
      readDetail: () => ({ view: 'calendar', appointments: 3 }),
      navigate,
      restore,
      ...overrides,
    }),
  };
}

describe('createShellBridge.snapshot', () => {
  it('describes the screen, including where else it could go', () => {
    const snapshot = bridge().api.snapshot();
    expect(snapshot).toMatchObject({
      moduleId: 'bookings',
      moduleTitle: null, // not in the registry stub above — reported honestly, not invented
      url: '/bookings/calendar',
      params: { view: 'calendar' },
      detail: { view: 'calendar', appointments: 3 },
    });
    expect(snapshot.destinations.map((d) => d.id)).toEqual(DESTINATIONS.map((d) => d.id));
  });
});

describe('createShellBridge.run', () => {
  it('navigates to a named page and hands back an undo', () => {
    const { api, navigate, restore } = bridge();
    const result = api.run({ actionType: 'navigate', parameters: { pathKey: 'Deals' } });
    expect(result).toMatchObject({ ok: true, label: 'Opened Deals' });
    expect(navigate).toHaveBeenCalledWith('deals', new URLSearchParams());
    result.undo?.();
    expect(restore).toHaveBeenCalledWith('/bookings/calendar');
  });

  it('carries deep-link params through', () => {
    const { api, navigate } = bridge();
    api.run({ actionType: 'navigate', parameters: { pathKey: 'Deals', params: { deal: 'c1' } } });
    expect(navigate).toHaveBeenCalledWith('deals', new URLSearchParams('deal=c1'));
  });

  it('does nothing, and says so, for a page that is not here', () => {
    const { api, navigate } = bridge();
    const result = api.run({ actionType: 'navigate', parameters: { pathKey: 'Billing' } });
    expect(result.ok).toBe(false);
    expect(result.label).toContain('Billing');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports an action type it does not know instead of guessing', () => {
    const { api, navigate } = bridge();
    const result = api.run({ actionType: 'open_modal', parameters: {} });
    expect(result).toMatchObject({ ok: false });
    expect(result.label).toContain('open_modal');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('is a no-op with no undo when it is already there', () => {
    const { api, navigate } = bridge({
      currentRoute: () => ({ moduleId: 'deals', params: new URLSearchParams() }),
      currentUrl: () => '/deals',
    });
    const result = api.run({ actionType: 'navigate', parameters: { pathKey: 'Deals' } });
    expect(result).toEqual({ ok: true, label: 'Already on Deals' });
    expect(navigate).not.toHaveBeenCalled();
  });
});
