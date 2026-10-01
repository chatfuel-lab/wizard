import { describe, expect, it, vi } from 'vitest';
import { actionParams, createShellBridge, resolveDestination, resolvePathKey, type Destination } from './shellBridge';

/**
 * Ids and titles as the registry carries them — including the two modules
 * whose titles moved away from their ids, which is the case the resolver's
 * second hop exists for.
 */
const DESTINATIONS: Destination[] = [
  { id: 'livechat', title: 'Inbox' },
  { id: 'deals', title: 'Deals' },
  { id: 'flow-builder', title: 'Flows' },
  { id: 'knowledge-base', title: 'Knowledge base' },
  { id: 'automations', title: 'AI Agent' },
  { id: 'coworker', title: 'Copilot' },
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

  /**
   * The two modules this app renamed. The model was trained on Chatfuel's page
   * names and sends those — 'automations' among the list above — so a title
   * that has moved on means the old phrase lands through the id rather than
   * through the title. Both names have to work, and only one of each pair is
   * the title today.
   */
  it('lands the names these modules used to carry, and the ones they carry now', () => {
    expect(resolveDestination(DESTINATIONS, 'automations')?.id).toBe('automations');
    expect(resolveDestination(DESTINATIONS, 'AI Agent')?.id).toBe('automations');
    expect(resolveDestination(DESTINATIONS, 'Coworker')?.id).toBe('coworker');
    expect(resolveDestination(DESTINATIONS, 'Copilot')?.id).toBe('coworker');
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

const ALL_DESTINATIONS: Destination[] = [
  ...DESTINATIONS,
  { id: 'bookings', title: 'Bookings' },
  { id: 'broadcasts', title: 'Broadcasts' },
  { id: 'channels', title: 'Channels' },
];

const resolved = (pathKey: unknown, destinations: Destination[] = ALL_DESTINATIONS) => {
  const result = resolvePathKey(destinations, pathKey);
  return result ? { id: result.destination.id, params: Object.fromEntries(result.params) } : null;
};

describe('resolvePathKey', () => {
  it.each([
    ['FuelyAIAutomations', 'automations'],
    ['FuelyAIProfile', 'automations'],
    ['FuelyAITasksChats', 'automations'],
    ['FuelyAITasksOperations', 'automations'],
    ['FuelyAITasksReminders', 'automations'],
    ['FuelyAIComments', 'automations'],
    ['Keywords', 'automations'],
    ['FuelyAIBroadcasts', 'broadcasts'],
    ['KnowledgeBase', 'knowledge-base'],
    ['KnowledgeBaseGoogleCalendarSync', 'knowledge-base'],
    ['Calendar', 'bookings'],
    ['CalendarSettings', 'bookings'],
    ['CalendarReminders', 'bookings'],
    ['CalendarMessagesSource', 'bookings'],
    ['Flows', 'flow-builder'],
    ['Chats', 'livechat'],
    ['SettingsWhatsApp', 'channels'],
    ['SettingsInstagram', 'channels'],
    ['SettingsTikTok', 'channels'],
    ['SettingsFacebook', 'channels'],
    ['SettingsWebWidget', 'channels'],
    ['SettingsWhatsAppConnect', 'channels'],
    ['SettingsWebWidgetConnect', 'channels'],
  ])('lands the agent page key %s on %s', (pathKey, id) => {
    expect(resolved(pathKey)).toEqual({ id, params: {} });
  });

  it('opens the knowledge base on the source the key names', () => {
    expect(resolved('KnowledgeBaseGeneral')).toEqual({ id: 'knowledge-base', params: { source: 'profile' } });
    expect(resolved('KnowledgeBaseFAQ')).toEqual({ id: 'knowledge-base', params: { source: 'faq' } });
    expect(resolved('KnowledgeBaseCatalog')).toEqual({ id: 'knowledge-base', params: { source: 'products' } });
    expect(resolved('KnowledgeBaseSpecialists')).toEqual({ id: 'knowledge-base', params: { source: 'team' } });
  });

  it('carries the id of a parameterized key as the module deep link', () => {
    expect(resolved('FlowID/f1')).toEqual({ id: 'flow-builder', params: { flow: 'f1' } });
    expect(resolved('ConversationID/c9')).toEqual({ id: 'livechat', params: { c: 'c9' } });
    expect(resolved('AutomationID/a7')).toEqual({ id: 'automations', params: { automation: 'a7' } });
    expect(resolved('FlowID/')).toEqual({ id: 'flow-builder', params: {} });
  });

  it('reads a raw Chatfuel path by the segment that names a page', () => {
    expect(resolved('/automation/bot1/chats/c9')).toEqual({ id: 'livechat', params: { c: 'c9' } });
    expect(resolved('/automation/bot1/nowhere')).toBeNull();
  });

  it('leaves the pages this shell does not have unresolved', () => {
    for (const pathKey of ['Billing', 'SettingsTeammates', 'SettingsAPI', 'SettingsChats', 'PreviewChat']) {
      expect(resolved(pathKey)).toBeNull();
    }
  });

  it('resolves to nothing when the target module is not installed', () => {
    const without = ALL_DESTINATIONS.filter((d) => !['channels', 'flow-builder', 'livechat'].includes(d.id));
    expect(resolved('SettingsWhatsApp', without)).toBeNull();
    expect(resolved('FlowID/f1', without)).toBeNull();
    expect(resolved('/automation/bot1/chats/c9', without)).toBeNull();
  });

  it('refuses anything that is not a usable name', () => {
    expect(resolved(undefined)).toBeNull();
    expect(resolved('')).toBeNull();
    expect(resolved('/')).toBeNull();
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

  it('deep-links a parameterized key, explicit params winning', () => {
    const { api, navigate } = bridge();
    const result = api.run({ actionType: 'navigate', parameters: { pathKey: 'FlowID/f1', params: { b: 'b2' } } });
    expect(result).toMatchObject({ ok: true, label: 'Opened Flows' });
    expect(navigate).toHaveBeenCalledWith('flow-builder', new URLSearchParams('flow=f1&b=b2'));
    api.run({ actionType: 'navigate', parameters: { pathKey: 'FlowID/f1', params: { flow: 'f2' } } });
    expect(navigate).toHaveBeenLastCalledWith('flow-builder', new URLSearchParams('flow=f2'));
  });

  it('reports a known agent key whose module is not installed', () => {
    const { api, navigate } = bridge();
    const result = api.run({ actionType: 'navigate', parameters: { pathKey: 'SettingsWhatsApp' } });
    expect(result.ok).toBe(false);
    expect(result.label).toContain('SettingsWhatsApp');
    expect(navigate).not.toHaveBeenCalled();
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
