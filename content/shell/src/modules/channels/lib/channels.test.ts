import { describe, expect, it } from 'vitest';
import { channelsOf } from './channels';
import type { ChannelScopes } from '../types';

const scopes = (list: ChannelScopes): ChannelScopes => list;

describe('channelsOf', () => {
  it('maps every platform to its slot and prints what it is connected as', () => {
    const channels = channelsOf(
      scopes([
        {
          __typename: 'WhatsAppPhoneContactScope',
          id: 's-wa',
          phone: { id: 'p1', displayPhoneNumber: '+1 555 0100', verifiedName: 'Acme' },
        },
        {
          __typename: 'InstagramAccountContactScope',
          id: 's-ig',
          instagramAccount: { id: 'i1', username: 'acme', name: 'Acme Inc' },
        },
        {
          __typename: 'TikTokAccountContactScope',
          id: 's-tt',
          tiktokAccount: { id: 't1', username: 'acmetok', name: null },
        },
        { __typename: 'FacebookContactScope', id: 's-fb', facebookPage: { id: 'f1', name: 'Acme Page' } },
        { __typename: 'WebWidgetContactScope', id: 's-ww', webWidget: { id: 'w1', name: 'Site widget' } },
      ]),
    );
    expect(channels.whatsapp).toEqual({ scopeId: 's-wa', label: '+1 555 0100', detail: 'Acme' });
    expect(channels.instagram).toEqual({ scopeId: 's-ig', label: '@acme', detail: 'Acme Inc' });
    expect(channels.tiktok).toEqual({ scopeId: 's-tt', label: '@acmetok', detail: null });
    expect(channels.facebook).toEqual([{ scopeId: 's-fb', label: 'Acme Page', detail: null }]);
    expect(channels.widget).toEqual({ scopeId: 's-ww', label: 'Site widget', detail: null });
  });

  it('keeps a nameless web widget as connected, with nothing to print', () => {
    // Every `WebWidget.name` the API answers is the empty string, though the
    // field is non-null — the card shows the chip and no row.
    const channels = channelsOf(
      scopes([{ __typename: 'WebWidgetContactScope', id: 's', webWidget: { id: 'w1', name: '  ' } }]),
    );
    expect(channels.widget).toEqual({ scopeId: 's', label: '', detail: null });
  });

  it('falls back through name to the id when TikTok carries no handle', () => {
    const named = channelsOf(
      scopes([
        { __typename: 'TikTokAccountContactScope', id: 's', tiktokAccount: { id: 't1', username: null, name: 'Acme' } },
      ]),
    );
    expect(named.tiktok).toEqual({ scopeId: 's', label: 'Acme', detail: null });
    const bare = channelsOf(
      scopes([
        { __typename: 'TikTokAccountContactScope', id: 's', tiktokAccount: { id: 't1', username: null, name: null } },
      ]),
    );
    expect(bare.tiktok?.label).toBe('t1');
  });

  it('keeps the first of a platform, lists every Facebook page sorted, and skips what it does not know', () => {
    const channels = channelsOf(
      scopes([
        { __typename: 'FacebookContactScope', id: 'b', facebookPage: { id: 'f2', name: 'Zed' } },
        { __typename: 'FacebookContactScope', id: 'a', facebookPage: { id: 'f1', name: 'Alpha' } },
        { __typename: 'InstagramAccountContactScope', id: 'first', instagramAccount: { id: 'i1', username: 'one' } },
        { __typename: 'InstagramAccountContactScope', id: 'second', instagramAccount: { id: 'i2', username: 'two' } },
        { __typename: 'SomethingNew', id: 'x' } as unknown as ChannelScopes[number],
      ]),
    );
    expect(channels.facebook.map((a) => a.label)).toEqual(['Alpha', 'Zed']);
    expect(channels.instagram?.scopeId).toBe('first');
    expect(channels.whatsapp).toBeNull();
  });
});
