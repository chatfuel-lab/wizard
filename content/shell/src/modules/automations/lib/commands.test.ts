import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { buildCommandGroups, type AutomationsCommandContext, type AutomationsCommandHandlers } from './commands';
import { SCOPES } from './scopes';

const handlers = (): AutomationsCommandHandlers & { calls: string[] } => {
  const calls: string[] = [];
  const h =
    (name: string) =>
    (...args: unknown[]) =>
      void calls.push([name, ...args.map(String)].join(':'));
  return {
    calls,
    goScope: h('goScope'),
    newRule: h('newRule'),
    undo: h('undo'),
    saveAll: h('saveAll'),
    focusSearch: h('focusSearch'),
    setAi: h('setAi'),
    refresh: h('refresh'),
    openShortcuts: h('openShortcuts'),
    restartPreview: h('restartPreview'),
  };
};

const context = (over: Partial<AutomationsCommandContext> = {}): AutomationsCommandContext => ({
  scope: FuelyAutomationScope.All,
  previewActive: false,
  aiOn: true,
  undoLabel: null,
  dirtyCount: 0,
  canEdit: true,
  scopes: SCOPES.map((scope) => ({
    scope,
    status: 'on',
    rules: scope === 'InstagramPostComments' ? 2 : 0,
    connected: scope !== 'FacebookPostComments',
  })),
  ...over,
});

const ids = (ctx: AutomationsCommandContext) =>
  buildCommandGroups(ctx, handlers()).flatMap((g) => g.items.map((i) => i.id));

describe('buildCommandGroups', () => {
  it('offers the actions that make sense in the state', () => {
    expect(ids(context())).toEqual(expect.arrayContaining(['new', 'ai.off', 'refresh', 'shortcuts', 'search']));
    expect(ids(context({ canEdit: false }))).not.toContain('new');
    expect(ids(context({ aiOn: false }))).toContain('ai.on');
    expect(ids(context({ undoLabel: 'Undo change' }))).toContain('undo');
    expect(ids(context({ dirtyCount: 2 }))).toContain('save');
    expect(ids(context({ previewActive: true }))).toContain('preview.restart');
    expect(ids(context({ previewActive: false }))).not.toContain('preview.restart');
    expect(ids(context({ previewActive: true, canEdit: false }))).not.toContain('preview.restart');
  });
  it('lists every source but the current one, with state in the description', () => {
    const groups = buildCommandGroups(context({ scope: FuelyAutomationScope.InstagramPostComments }), handlers());
    const scopes = groups.find((g) => g.id === 'scopes')!;
    expect(scopes.items.length).toBe(SCOPES.length - 1);
    expect(scopes.items.some((i) => i.id === 'scope.InstagramPostComments')).toBe(false);
    const fb = scopes.items.find((i) => i.id === 'scope.FacebookPostComments')!;
    expect(fb.description).toMatch(/not connected/);
  });
  it('gives every source item its platform glyph and the All scope the fallback', () => {
    const glyphs = { instagram: 'IG', whatsapp: 'WA', facebook: 'FB', tiktok: 'TT', widget: 'WW' };
    const groups = buildCommandGroups(context({ scope: FuelyAutomationScope.InstagramPostComments }), handlers(), {
      scope: 'ARROW',
      platforms: glyphs,
    });
    const scopes = groups.find((g) => g.id === 'scopes')!;
    expect(scopes.items.find((i) => i.id === 'scope.All')!.icon).toBe('ARROW');
    expect(scopes.items.find((i) => i.id === 'scope.InstagramStoryReplies')!.icon).toBe('IG');
    expect(scopes.items.find((i) => i.id === 'scope.WhatsAppDirectMessages')!.icon).toBe('WA');
    expect(scopes.items.find((i) => i.id === 'scope.WebWidgetDirectMessage')!.icon).toBe('WW');
    // Without the map every item falls back to the one scope icon.
    const plain = buildCommandGroups(context(), handlers(), { scope: 'ARROW' }).find((g) => g.id === 'scopes')!;
    expect(plain.items.every((i) => i.icon === 'ARROW')).toBe(true);
    // The platform key is searchable, and so is the state.
    const ig = plain.items.find((i) => i.id === 'scope.InstagramPostComments')!;
    expect(ig.keywords).toEqual(expect.arrayContaining(['instagram', 'Instagram', 'on']));
  });
  it('wires handlers', () => {
    const h = handlers();
    const groups = buildCommandGroups(context({ dirtyCount: 1, undoLabel: 'Undo', previewActive: true }), h);
    const run = (id: string) =>
      groups
        .flatMap((g) => g.items)
        .find((i) => i.id === id)!
        .onSelect();
    run('scope.WhatsAppDirectMessages');
    run('ai.off');
    run('save');
    run('preview.restart');
    run('undo');
    run('search');
    expect(h.calls).toEqual([
      'goScope:WhatsAppDirectMessages',
      'setAi:false',
      'saveAll',
      'restartPreview',
      'undo',
      'focusSearch',
    ]);
  });
});
