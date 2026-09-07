import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from '~ui';
import { BroadcastStatus } from '~api/generated/broadcasts/graphql';
import { createTestClient } from '../../../testClient';
import { BroadcastsCampaignsContext, BroadcastsCatalogContext } from '../../BroadcastsCampaignsContext';
import { BroadcastsContext } from '../../BroadcastsContext';
import type { CampaignsStore } from '../../hooks/useCampaignsStore';
import type { WhatsAppTemplatesState } from '../../hooks/useWhatsAppTemplates';
import type { ComposerStep } from '../../lib/broadcastsParams';
import { initialBroadcastsState } from '../../lib/broadcastsStore';
import { campaignOf, sortCampaigns } from '../../lib/campaign';
import { sampleFlow, sampleTemplate } from '../../lib/samples';
import type { CampaignFlow } from '../../types';
import { ComposerRoute } from '../../views/ComposerRoute';

/**
 * The composer's white-screen guard: every step draws from a frozen flow,
 * and the review offers the one primary the campaign's kind calls for.
 * Rendering to a string runs no effect, so the stores are doubles that
 * hold the flows and answer nothing.
 */
const NOW = Date.parse('2026-09-07T12:00:00Z');
const ZONE = 'America/Mexico_City';
const WHATSAPP = {
  phoneId: 'p1',
  displayPhoneNumber: '+1 555 0100',
  status: 'Connected',
  wabaId: 'w1',
  wabaName: 'Acme',
  businessId: 'b1',
  businessName: 'Acme',
};
const noop = () => undefined;
const never = () => new Promise<never>(() => undefined);

function storeOf(flows: CampaignFlow[]): CampaignsStore {
  const byId = Object.fromEntries(flows.map((flow) => [flow.id, flow]));
  return {
    state: { ...initialBroadcastsState(), list: { state: 'ready', loadedAt: NOW }, flows: byId },
    campaigns: sortCampaigns(flows.flatMap((flow) => campaignOf(flow, NOW) ?? [])),
    flowOf: (id) => byId[id],
    refresh: noop,
    refetchFlow: never,
    createDraft: never,
    rename: never,
    remove: never,
    sendNow: never,
    enable: never,
    disable: never,
    writeFlow: never,
    writeBlock: never,
    isPending: () => false,
  };
}

const catalog: WhatsAppTemplatesState = {
  templates: [sampleTemplate()],
  loaded: true,
  loading: false,
  error: null,
  refresh: noop,
  refetchFromMeta: never,
};

function render(flows: CampaignFlow[], flowId: string, step: ComposerStep | null, canEdit = true): string {
  return renderToStaticMarkup(
    <ToastProvider>
      <BroadcastsContext.Provider
        value={{ client: createTestClient(), botId: 'bot-1', navigate: () => undefined, installedModules: [] }}
      >
        <BroadcastsCampaignsContext.Provider value={storeOf(flows)}>
          <BroadcastsCatalogContext.Provider value={catalog}>
            <ComposerRoute
              flowId={flowId}
              step={step}
              onStep={noop}
              onClose={noop}
              onCompose={noop}
              onConnectWhatsApp={null}
              band="wide"
              role={{ loading: false, canEdit }}
              bot={{ state: 'ready', facts: { zone: ZONE, whatsapp: WHATSAPP } }}
              zone={ZONE}
              now={NOW}
              rootRef={{ current: null }}
            />
          </BroadcastsCatalogContext.Provider>
        </BroadcastsCampaignsContext.Provider>
      </BroadcastsContext.Provider>
    </ToastProvider>,
  );
}

const STEPS: ComposerStep[] = ['name', 'message', 'audience', 'schedule', 'review'];

describe('the composer renders each step', () => {
  it('draws the stepper, the name and every step of a scheduled draft', () => {
    for (const step of STEPS) {
      const html = render([sampleFlow()], 'flow-1', step);
      expect(html).toContain('Campaign steps');
      expect(html).toContain('Spring sale');
      if (step !== 'review') expect(html).toContain('Continue');
    }
  });

  it('fills the message step from the template on the draft, with the phone beside it', () => {
    const html = render([sampleFlow()], 'flow-1', 'message');
    expect(html).toContain('spring_sale');
    expect(html).toContain('Change template');
    expect(html).toContain('Hi there, everything is 20% off this week.');
  });

  it('offers the picker when the draft has no template yet', () => {
    const html = render([sampleFlow({ template: { whatsAppTemplate: null } })], 'flow-1', 'message');
    expect(html).toContain('Search templates');
    expect(html).not.toContain('Change template');
  });

  it('shows the day, the time and the repeat for a scheduled draft, and only the kind for a one-time one', () => {
    const scheduled = render([sampleFlow()], 'flow-1', 'schedule');
    expect(scheduled).toContain('First send day');
    expect(scheduled).toContain('Weekdays');
    const oneTime = render([sampleFlow({ kind: 'now' })], 'flow-1', 'schedule');
    expect(oneTime).not.toContain('First send day');
    expect(oneTime).toContain('Now');
  });

  it('opens on the first step that is not done when the address names none', () => {
    const html = render([sampleFlow({ name: 'Untitled campaign' })], 'flow-1', null);
    expect(html).toContain('Campaign name');
  });
});

describe('the review step', () => {
  it('offers Send now for a one-time draft and Schedule for a scheduled one', () => {
    const now = render([sampleFlow({ kind: 'now' })], 'flow-1', 'review');
    expect(now).toContain('Send now');
    expect(now).not.toMatch(/Schedule<\/button>/);
    const later = render([sampleFlow()], 'flow-1', 'review');
    expect(later).toMatch(/Schedule<\/button>/);
    expect(later).not.toContain('Send now');
  });

  it('offers Duplicate on a campaign that has gone out', () => {
    const sent = sampleFlow({ kind: 'now', settings: { status: BroadcastStatus.Finished, sentToContactsCount: 403 } });
    const html = render([sent], 'flow-1', 'review');
    expect(html).toContain('Duplicate');
    expect(html).not.toContain('Send now');
    expect(html).toContain('403');
  });

  it('prints every verdict under the step that fixes it', () => {
    const html = render([sampleFlow({ withoutPayload: true })], 'flow-1', 'review');
    expect(html).toContain('The campaign has no message');
  });

  it('shows the steps and no primary to a role that may not edit', () => {
    const html = render([sampleFlow({ kind: 'now' })], 'flow-1', 'review', false);
    expect(html).toContain('Campaign steps');
    expect(html).not.toContain('Send now');
    expect(html).not.toContain('Duplicate');
  });
});

describe('a draft the list does not hold', () => {
  it('waits for the read rather than declaring it gone', () => {
    const html = render([sampleFlow()], 'flow-other', 'name');
    expect(html).toContain('Campaigns');
    expect(html).not.toContain('not on the bot');
  });

  it('tells a bot with no number to connect one instead of offering templates', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <BroadcastsContext.Provider
          value={{
            client: createTestClient(),
            botId: 'bot-1',
            navigate: () => undefined,
            installedModules: ['channels'],
          }}
        >
          <BroadcastsCampaignsContext.Provider value={storeOf([sampleFlow()])}>
            <BroadcastsCatalogContext.Provider value={catalog}>
              <ComposerRoute
                flowId="flow-1"
                step="message"
                onStep={noop}
                onClose={noop}
                onCompose={noop}
                onConnectWhatsApp={noop}
                band="wide"
                role={{ loading: false, canEdit: true }}
                bot={{ state: 'ready', facts: { zone: ZONE, whatsapp: null } }}
                zone={ZONE}
                now={NOW}
                rootRef={{ current: null }}
              />
            </BroadcastsCatalogContext.Provider>
          </BroadcastsCampaignsContext.Provider>
        </BroadcastsContext.Provider>
      </ToastProvider>,
    );
    expect(html).toContain('No WhatsApp number is connected');
    expect(html).toContain('Connect WhatsApp');
    expect(html).not.toContain('Search templates');
  });
});
