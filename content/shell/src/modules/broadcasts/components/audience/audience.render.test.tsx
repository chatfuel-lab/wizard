import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AttrFilterDefaultOperator,
  AttributeDataType,
  AttributeType,
  BoolOperator,
} from '~api/generated/broadcasts/graphql';
import { createTestClient } from '../../../testClient';
import { BroadcastsCampaignsContext, BroadcastsCatalogContext } from '../../BroadcastsCampaignsContext';
import { BroadcastsContext } from '../../BroadcastsContext';
import type { AttributeCatalog, CatalogEntry } from '../../hooks/useAttributeCatalog';
import type { CampaignsStore } from '../../hooks/useCampaignsStore';
import type { WhatsAppTemplatesState } from '../../hooks/useWhatsAppTemplates';
import type { AudienceFilter } from '../../lib/audienceFilter';
import { validateAudience } from '../../lib/audienceValidation';
import { campaignOf } from '../../lib/campaign';
import { sampleFlow, sampleSegment } from '../../lib/samples';
import type { SegmentRead } from '../../types';
import { AudienceStep } from '../composer/AudienceStep';
import { FilterGroupBuilder } from './FilterGroupBuilder';

/**
 * The audience pieces, drawn to a string. Effects never run here, so the
 * step is asserted in the state it mounts in — the figure unknown, the
 * builder seeded from what the campaign holds — and the builder is drawn
 * over a frozen filter to assert what it shows and hides.
 */
const NOW = Date.parse('2026-09-07T12:00:00Z');
const ZONE = 'America/Mexico_City';
const noop = () => undefined;

const entries: CatalogEntry[] = [
  { name: 'city', type: AttributeType.Custom, dataType: AttributeDataType.String, usersCount: 12 },
  { name: 'plan', type: AttributeType.Custom, dataType: AttributeDataType.String, usersCount: 40 },
  { name: 'whatsapp phone', type: AttributeType.System, dataType: AttributeDataType.String, usersCount: 351 },
];

const catalog: AttributeCatalog = {
  entries,
  byName: new Map(entries.map((entry) => [entry.name, entry])),
  loading: false,
  error: null,
  dataTypeOf: (name) => entries.find((entry) => entry.name === name)?.dataType,
  suggested: entries,
  refresh: noop,
};

const twoGroups: AudienceFilter = {
  groupOperator: BoolOperator.Or,
  groups: [
    {
      id: 'g1',
      operator: BoolOperator.And,
      predicates: [{ id: 'p1', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin'] }],
    },
    {
      id: 'g2',
      operator: BoolOperator.Or,
      predicates: [
        { id: 'p1', name: 'plan', operator: AttrFilterDefaultOperator.Contains, values: ['pro'] },
        { id: 'p2', name: 'whatsapp phone', operator: AttrFilterDefaultOperator.IsNotEmpty, values: [] },
      ],
    },
  ],
};

const readAttr = (id: string, name: string, values: string[]): SegmentRead['filters'][number] => ({
  id,
  byAttribute: {
    attribute: { name, type: AttributeType.Custom, dataType: AttributeDataType.String },
    defaultStrategy: { operator: AttrFilterDefaultOperator.Is, comparableValues: values },
    dateStrategy: null,
  },
  byTag: null,
  byStoredSegment: null,
  byInFlightSegment: null,
});

/** The step needs the module's two providers; nothing in them is read before an effect runs. */
function step(segment: SegmentRead, canEdit: boolean): string {
  const flow = sampleFlow({ settings: { segment } });
  const record = campaignOf(flow, NOW)!;
  const store = { isPending: () => false } as unknown as CampaignsStore;
  const templates = { templates: [], loaded: true, loading: false, error: null } as unknown as WhatsAppTemplatesState;
  return renderToStaticMarkup(
    <BroadcastsContext.Provider
      value={{ client: createTestClient(), botId: 'bot-1', navigate: () => undefined, installedModules: [] }}
    >
      <BroadcastsCampaignsContext.Provider value={store}>
        <BroadcastsCatalogContext.Provider value={templates}>
          <AudienceStep record={record} zone={ZONE} canEdit={canEdit} onCount={noop} />
        </BroadcastsCatalogContext.Provider>
      </BroadcastsCampaignsContext.Provider>
    </BroadcastsContext.Provider>,
  );
}

describe('the audience builder', () => {
  it('draws two groups with the words that join them and the rows inside', () => {
    const html = renderToStaticMarkup(
      <FilterGroupBuilder
        filter={twoGroups}
        onFilterChange={noop}
        catalog={catalog}
        issues={validateAudience(twoGroups)}
        zone={ZONE}
      />,
    );
    expect(html).toContain('Match');
    expect(html).toContain('>all<');
    expect(html).toContain('>any<');
    expect(html).toContain('>and<');
    expect(html).toContain('>or<');
    expect(html).toContain('Berlin');
    expect(html).toContain('pro');
    expect(html).toContain('is not empty');
    expect(html).toContain('Add a group');
    expect(html).toContain('Condition');
  });

  it('prints an issue beside the row it belongs to, and a note as a tag', () => {
    const filter: AudienceFilter = {
      groupOperator: BoolOperator.And,
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [
            { id: 'p1', name: '', operator: AttrFilterDefaultOperator.Is, values: [''] },
            { id: 'p2', name: 'plan', operator: AttrFilterDefaultOperator.Gt, values: ['3'] },
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <FilterGroupBuilder
        filter={filter}
        onFilterChange={noop}
        catalog={catalog}
        issues={validateAudience(filter)}
        zone={ZONE}
      />,
    );
    expect(html).toMatch(/Pick a field<\/p>/);
    expect(html).toContain('Approximate');
    // The second row has its value; the only "Add a value" left is the chip box's placeholder.
    expect(html).not.toMatch(/Add a value<\/p>/);
  });

  it('offers nothing to press when read-only', () => {
    const html = renderToStaticMarkup(
      <FilterGroupBuilder
        filter={twoGroups}
        onFilterChange={noop}
        catalog={catalog}
        issues={[]}
        zone={ZONE}
        readOnly
      />,
    );
    expect(html).not.toContain('Add a group');
    expect(html).not.toContain('Remove');
    expect(html).toContain('Berlin');
  });
});

describe('the audience step', () => {
  it('shows the count figure with the one word under it and no caption', () => {
    const html = step(sampleSegment(), true);
    expect(html).toContain('recipients');
    expect(html).toContain('—');
    expect(html).toContain('Everyone');
    expect(html).toContain('Contacts who…');
    expect(html).not.toContain('Match');
    expect(html).not.toMatch(/as of|snapshot|the API|approximate:/i);
  });

  it('opens the builder on what the campaign already holds', () => {
    const html = step(
      sampleSegment({
        resultOperator: BoolOperator.Or,
        filters: [readAttr('f1', 'city', ['Berlin']), readAttr('f2', 'plan', ['pro'])],
      }),
      true,
    );
    expect(html).toContain('Match');
    expect(html).toContain('Berlin');
    expect(html).toContain('pro');
    expect(html).toContain('recipients');
  });

  it('shows the builder read-only to a role that may not edit', () => {
    const html = step(sampleSegment({ filters: [readAttr('f1', 'city', ['Berlin'])] }), false);
    expect(html).toContain('Berlin');
    expect(html).not.toContain('Add a group');
    expect(html).not.toContain('Condition<');
  });
});
