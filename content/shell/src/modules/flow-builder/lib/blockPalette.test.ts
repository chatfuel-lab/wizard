import { describe, expect, it } from 'vitest';
import { filterItems } from '~ui';
import { paletteEntries } from './blockPalette';
import { blockPluginsForFlow } from './blockPlugins';
import type { FlowT } from '../types';

const flow = (platform: string) => ({ platform }) as unknown as Pick<FlowT, 'platform'>;

const groupsInOrder = (entries: { group: string }[]) => [...new Set(entries.map((e) => e.group))];

describe('paletteEntries', () => {
  it('offers exactly the families the flow may host, one entry each', () => {
    for (const platform of ['whatsapp', 'widget', 'instagram', 'facebook']) {
      const entries = paletteEntries(flow(platform));
      const keys = blockPluginsForFlow(flow(platform)).map((p) => p.key);
      expect(entries.map((e) => e.id).sort()).toEqual(keys.sort());
    }
  });

  it("groups by role — the flow's platform first, then Actions, then AI", () => {
    expect(groupsInOrder(paletteEntries(flow('whatsapp')))).toEqual(['WhatsApp', 'Actions', 'AI']);
    expect(groupsInOrder(paletteEntries(flow('widget')))).toEqual(['Widget', 'Actions', 'AI']);
    /* A platform with no families of its own gets the neutral set alone. */
    expect(groupsInOrder(paletteEntries(flow('facebook')))).toEqual(['Actions', 'AI']);
  });

  it('keeps the catalog order inside a group', () => {
    const entries = paletteEntries(flow('whatsapp')).filter((e) => e.group === 'WhatsApp');
    const catalog = blockPluginsForFlow(flow('whatsapp'))
      .filter((p) => p.platform === 'whatsapp')
      .map((p) => p.key);
    expect(entries.map((e) => e.id)).toEqual(catalog);
  });

  it('marks the entry points, and only them', () => {
    const entries = paletteEntries(flow('whatsapp'));
    const noted = entries.filter((e) => e.note === 'entry point').map((e) => e.id);
    expect(noted.sort()).toEqual(
      ['triggeredMessage', 'whatsAppOneTimeNotification', 'whatsAppScheduledMessage'].sort(),
    );
    expect(entries.every((e) => e.note === undefined || e.note === 'entry point')).toBe(true);
  });

  it('gives every entry a glyph and at least one search word beyond its label', () => {
    for (const entry of paletteEntries(flow('whatsapp'))) {
      expect(entry.glyph).toBeTruthy();
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });

  it('is findable the way people type — through the same matcher the palette uses', () => {
    const entries = paletteEntries(flow('whatsapp'));
    const top = (query: string) => filterItems(entries, query, (e) => [e.label, ...e.keywords])[0]?.item.id;
    expect(top('wa but')).toBe('whatsAppTextAndButtons');
    expect(top('webhook')).toBe('sendJson');
    expect(top('if')).toBe('setCondition');
    expect(top('broadcast')).toBe('whatsAppOneTimeNotification');
    expect(top('ai agent')).toBe('aiAgent');
    expect(top('gpt')).toBe('aiAgent');
  });
});
