import { describe, expect, it, vi } from 'vitest';
import {
  buildCommandGroups,
  createLabelFor,
  ownerLabelFor,
  sourceDescription,
  transferLabelFor,
  type KnowledgeCommandContext,
  type KnowledgeCommandHandlers,
} from './commands';
import { SOURCES } from './sources';

const handlers: KnowledgeCommandHandlers = {
  goSource: vi.fn(),
  create: vi.fn(),
  openImport: vi.fn(),
  exportSource: vi.fn(),
  undo: vi.fn(),
  saveAll: vi.fn(),
  focusSearch: vi.fn(),
  refresh: vi.fn(),
  openShortcuts: vi.fn(),
  scanGaps: vi.fn(),
};

const context = (over: Partial<KnowledgeCommandContext> = {}): KnowledgeCommandContext => ({
  source: 'faq',
  createLabel: 'Add an FAQ',
  transferLabel: 'FAQs',
  undoLabel: null,
  dirtyCount: 0,
  canEdit: true,
  canReadInbox: true,
  sources: [],
  ...over,
});

const ids = (ctx: KnowledgeCommandContext) =>
  buildCommandGroups(ctx, handlers).flatMap((group) => group.items.map((item) => item.id));

describe('buildCommandGroups', () => {
  it('always offers search, refresh and the shortcut sheet', () => {
    const out = ids(context({ canEdit: false, canReadInbox: false, transferLabel: null, createLabel: null }));
    expect(out).toEqual(expect.arrayContaining(['search', 'refresh', 'shortcuts']));
  });

  it('hides create and import from a reader', () => {
    const out = ids(context({ canEdit: false }));
    expect(out).not.toContain('new');
    expect(out).not.toContain('import');
    // Export is a read — a reader may still take their data out.
    expect(out).toContain('export');
  });

  it('hides create and transfer on a source that has neither', () => {
    const out = ids(context({ createLabel: null, transferLabel: null }));
    expect(out).not.toContain('new');
    expect(out).not.toContain('import');
    expect(out).not.toContain('export');
  });

  it('offers undo only when something is undoable', () => {
    expect(ids(context())).not.toContain('undo');
    expect(ids(context({ undoLabel: 'Restore FAQ' }))).toContain('undo');
  });

  it('offers save only when a draft is dirty, and counts them', () => {
    expect(ids(context())).not.toContain('save');
    const groups = buildCommandGroups(context({ dirtyCount: 3 }), handlers);
    const save = groups[0]!.items.find((item) => item.id === 'save');
    expect(save?.label).toBe('Save 3 unsaved changes');
  });

  it('hides the gap scan without Inbox: View', () => {
    expect(ids(context({ canReadInbox: false }))).not.toContain('scan');
  });

  it('never offers the source you are already on', () => {
    expect(ids(context({ source: 'products' }))).not.toContain('source.products');
    expect(ids(context({ source: 'products' }))).toContain('source.faq');
  });

  it('hides the inbox-backed source from someone who cannot read the inbox', () => {
    expect(ids(context({ source: 'faq', canReadInbox: false }))).not.toContain('source.gaps');
  });

  it('offers every other source to someone with full access', () => {
    const out = ids(context({ source: 'overview' }));
    for (const meta of SOURCES) {
      if (meta.id === 'overview') continue;
      expect(out).toContain(`source.${meta.id}`);
    }
  });

  it('runs the handler it advertises', () => {
    const groups = buildCommandGroups(context(), handlers);
    groups
      .flatMap((group) => group.items)
      .find((item) => item.id === 'source.products')
      ?.onSelect();
    expect(handlers.goSource).toHaveBeenCalledWith('products');
  });
});

describe('sourceDescription', () => {
  it('reads as a sentence of parts, and never prints a character count', () => {
    expect(sourceDescription({ id: 'faq', count: 12, chars: 840, issues: 2 })).toBe('12 entries · 2 to fix');
  });

  it('is singular at one', () => {
    expect(sourceDescription({ id: 'faq', count: 1, chars: 0, issues: 1 })).toBe('1 entry · 1 to fix');
  });

  it('is undefined when there is nothing to say', () => {
    expect(sourceDescription({ id: 'overview', count: null, chars: null, issues: 0 })).toBeUndefined();
  });
});

describe('labels', () => {
  it('knows what n creates on each source', () => {
    expect(createLabelFor('faq', true)).toBe('Add an FAQ');
    expect(createLabelFor('overview', true)).toBeNull();
    expect(createLabelFor('faq', false)).toBeNull();
  });

  it('knows what import and export move', () => {
    expect(transferLabelFor('faq')).toBe('FAQs');
    expect(transferLabelFor('products')).toBe('products');
    expect(transferLabelFor('team')).toBeNull();
  });

  it('names the owning module on a mirror only', () => {
    expect(ownerLabelFor('services')).toBe('Edit services in Bookings');
    expect(ownerLabelFor('faq')).toBeNull();
  });
});
