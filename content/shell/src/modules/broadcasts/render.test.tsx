import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BroadcastStatus } from '~api/generated/broadcasts/graphql';
import { createTestClient } from '../testClient';
import { BroadcastsApp } from './BroadcastsApp';
import { CampaignsTable } from './components/campaigns/CampaignsTable';
import { CampaignDetail } from './components/detail/CampaignDetail';
import { TemplatesTable } from './components/templates/TemplatesTable';
import { campaignOf } from './lib/campaign';
import { sampleFlow, sampleTemplate } from './lib/samples';

/**
 * The white-screen guard, and the pieces in each of their states. Rendering
 * to a string needs no DOM: effects do not run, so `BroadcastsApp` asserts
 * the frame around the data, and the pure components are drawn with frozen
 * records to assert what each one shows and hides.
 */
const NOW = Date.parse('2026-09-07T12:00:00Z');
const ZONE = 'America/Mexico_City';
const noop = () => undefined;

const record = (options: Parameters<typeof sampleFlow>[0]) => campaignOf(sampleFlow(options), NOW)!;

describe('the module renders', () => {
  it('mounts, and draws its frame before any data arrives', () => {
    const html = renderToStaticMarkup(
      <BroadcastsApp
        botId="bot-1"
        client={createTestClient()}
        view=""
        setView={noop}
        params={new URLSearchParams()}
        setParams={noop}
        navigate={noop}
      />,
    );
    expect(html).toContain('Broadcasts');
    expect(html).toContain('Campaigns');
    expect(html).toContain('Templates');
    // The role is closed until it answers, so nothing to create yet.
    expect(html).not.toContain('New campaign');
  });

  it('opens the composer route from the address, before the list has loaded', () => {
    const html = renderToStaticMarkup(
      <BroadcastsApp
        botId="bot-1"
        client={createTestClient()}
        view="compose"
        setView={noop}
        params={new URLSearchParams('c=flow-1')}
        setParams={noop}
        navigate={noop}
      />,
    );
    expect(html).toContain('Campaigns');
    expect(html).not.toContain('Templates');
  });
});

describe('the campaign list', () => {
  const rows = [
    record({ id: 'a', name: 'Welcome back', kind: 'now' }),
    record({ id: 'b', name: 'Tuesday deal', enabled: true, settings: { status: BroadcastStatus.Live } }),
    record({
      id: 'c',
      name: 'Old news',
      kind: 'now',
      settings: { status: BroadcastStatus.Finished, sentToContactsCount: 403 },
    }),
  ];
  const table = (actions: boolean) =>
    renderToStaticMarkup(
      <CampaignsTable
        rows={rows}
        selectedId={null}
        onOpen={noop}
        zone={ZONE}
        now={NOW}
        loading={false}
        actions={actions ? { onEdit: noop, onUnschedule: noop, onDuplicate: noop, onDelete: noop } : null}
        compact={false}
      />,
    );

  it('shows each status, the next send in the bot zone, and the recipients count', () => {
    const html = table(true);
    expect(html).toContain('Draft');
    expect(html).toContain('Scheduled');
    expect(html).toContain('Sent');
    expect(html).toContain('6 Jan 2030, 01:00');
    expect(html).toContain('403');
    expect(html).toContain('spring_sale');
  });

  it('offers no action to a role that may not edit', () => {
    expect(table(true)).toContain('Actions for');
    expect(table(false)).not.toContain('Actions for');
  });
});

describe('the campaign panel', () => {
  const panel = (options: Parameters<typeof sampleFlow>[0], canEdit = true) =>
    renderToStaticMarkup(
      <CampaignDetail
        record={record(options)}
        zone={ZONE}
        now={NOW}
        canEdit={canEdit}
        busy={false}
        onEdit={noop}
        onSend={noop}
        onSchedule={noop}
        onUnschedule={noop}
      />,
    );

  it('offers Send now to a one-time draft, and Schedule to a scheduled one', () => {
    expect(panel({ kind: 'now' })).toContain('Send now');
    expect(panel({ kind: 'scheduled' })).toContain('Schedule');
    expect(panel({ kind: 'scheduled' })).not.toContain('Send now');
  });

  it('prints what is still incomplete, and no caption', () => {
    const html = panel({ withoutPayload: true });
    expect(html).toContain('The campaign has no message');
    expect(html).not.toMatch(/as of|snapshot|the API/i);
  });

  it('draws the message as a bubble with the audience under it', () => {
    const html = panel({});
    expect(html).toContain('Hi there, everything is 20% off this week.');
    expect(html).toContain('Every WhatsApp contact');
  });

  it('shows nothing to press to a role that may not edit', () => {
    expect(panel({ kind: 'now' }, false)).not.toMatch(/Send now<\/button>/);
  });
});

describe('the template catalog', () => {
  it('lists every status with its badge and the first lines of the message', () => {
    const html = renderToStaticMarkup(
      <TemplatesTable
        rows={[sampleTemplate(), sampleTemplate({ id: 'r', name: 'rejected_one', status: 'Rejected' as never })]}
        selectedId={null}
        onOpen={noop}
        loading={false}
        compact={false}
      />,
    );
    expect(html).toContain('Approved');
    expect(html).toContain('Rejected');
    expect(html).toContain('20% off');
  });
});
