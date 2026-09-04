import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { ChannelsApp } from './ChannelsApp';
import { ChannelsPage } from './components/ChannelsPage';
import { emptyChannels, type Channels } from './lib/channels';
import { initialChannelsState, type ChannelsState } from './lib/channelsStore';

/**
 * The white-screen guard, and the page in each of its states.
 *
 * Rendering to a string needs no DOM: effects do not run, so `ChannelsApp`
 * asserts the frame around the data, and `ChannelsPage` — pure from props —
 * is drawn with frozen states to assert what each one shows and hides.
 */
const noop = async () => undefined;

const connected: Channels = {
  ...emptyChannels(),
  whatsapp: { scopeId: 's-wa', label: '+1 555 0100', detail: 'Acme' },
  facebook: [{ scopeId: 's-fb', label: 'Acme Page', detail: null }],
  widget: { scopeId: 's-ww', label: '', detail: null },
};

const ready = (channels: Channels): ChannelsState => ({
  ...initialChannelsState(),
  epoch: 1,
  scopes: { state: 'ready', channels, loadedAt: 1 },
});

const page = (
  state: ChannelsState,
  canManage: boolean,
  handOff: Parameters<typeof ChannelsPage>[0]['handOff'] = null,
) =>
  renderToStaticMarkup(
    <ChannelsPage
      state={state}
      canManage={canManage}
      handOff={handOff}
      onDismissHandOff={() => undefined}
      onRefresh={() => undefined}
      onConnect={noop}
      onRefreshAccess={noop}
      onDisconnect={noop}
    />,
  );

describe('the module renders', () => {
  it('mounts, and draws its frame before any data arrives', () => {
    const html = renderToStaticMarkup(
      <ChannelsApp
        botId="bot-1"
        client={createTestClient()}
        view=""
        setView={() => undefined}
        params={new URLSearchParams()}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );
    expect(html).toContain('Channels');
    expect(html).toContain('aria-label="Loading"');
    expect(html).toContain('aria-label="Refresh"');
  });

  it('shows the connection state and no control at all to a role that may not manage', () => {
    const html = page(ready(connected), false);
    for (const name of ['WhatsApp', 'Instagram', 'TikTok', 'Facebook', 'Web widget']) expect(html).toContain(name);
    expect(html).toContain('+1 555 0100');
    expect(html).toContain('Connected');
    expect(html).toContain('Not connected');
    expect(html).not.toContain('>Connect<');
    expect(html).not.toContain('Disconnect');
  });

  it('offers the one action that fits each platform', () => {
    const html = page(ready(connected), true);
    // WhatsApp is connected: re-grant its permissions, or drop it.
    expect(html).toContain('Refresh access');
    // Instagram and TikTok are not: the hand-off that connects one.
    expect(html).toContain('>Connect<');
    // The WhatsApp card and the Facebook row — never the widget, which the
    // server refuses to disconnect.
    expect((html.match(/>Disconnect</g) ?? []).length).toBe(2);
  });

  it('prints no row for a channel with no name, rather than a blank one', () => {
    const html = page(ready(connected), true);
    const widgetCard = html.slice(html.indexOf('Web widget'));
    expect(widgetCard).not.toContain('<ul');
  });

  it('says so when a hand-off came back unfinished', () => {
    const html = page(ready(connected), true, { platform: 'instagram', ok: false });
    expect(html).toContain('Instagram was not connected');
  });

  it('says so and offers a retry when the channels could not be read', () => {
    const html = page({ ...initialChannelsState(), epoch: 1, scopes: { state: 'error', message: 'boom' } }, true);
    expect(html).toContain('Channels could not be read');
    expect(html).toContain('Try again');
    expect(html).toContain('boom');
  });
});
