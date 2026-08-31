import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { ChannelConnection } from '../hooks/useBootstrap';
import { nearestSource, sourceOptions } from './newRule';
import { allowsCustomAutomations } from './scopes';

const channel = (platform: ChannelConnection['platform'], connected = true): ChannelConnection => ({
  platform,
  connected,
  handle: connected ? `@${platform.toLowerCase()}` : null,
  contactScopeId: connected ? `${platform.toLowerCase()}_1` : null,
  accountId: null,
  avatarUrl: null,
});

describe('sourceOptions', () => {
  it('lists only the scopes that accept rules, in nav order, with connection and count', () => {
    const options = sourceOptions([channel('Instagram'), channel('WhatsApp', false)], {
      [FuelyAutomationScope.InstagramPostComments]: 4,
    });
    expect(options.every((o) => allowsCustomAutomations(o.scope))).toBe(true);
    expect(options[0]).toEqual({
      scope: FuelyAutomationScope.InstagramPostComments,
      platform: 'Instagram',
      connection: channel('Instagram'),
      rules: 4,
    });
    const whatsApp = options.find((o) => o.scope === FuelyAutomationScope.WhatsAppClickFromAds);
    expect(whatsApp?.connection?.connected).toBe(false);
    expect(whatsApp?.rules).toBe(0);
    const missing = options.find((o) => o.platform === 'Facebook');
    expect(missing?.connection).toBeUndefined();
  });
});

describe('nearestSource', () => {
  const options = sourceOptions([], {});

  it('keeps the wanted scope when it accepts rules', () => {
    expect(nearestSource(FuelyAutomationScope.FacebookMMeLinks, options)).toBe(FuelyAutomationScope.FacebookMMeLinks);
  });

  it("falls back to the platform's first source", () => {
    expect(nearestSource(FuelyAutomationScope.TikTokDirectMessages, options)).toBe(
      FuelyAutomationScope.TikTokPostComments,
    );
  });

  it('falls back to the first source overall', () => {
    expect(nearestSource(FuelyAutomationScope.WebWidgetDirectMessage, options)).toBe(
      FuelyAutomationScope.InstagramPostComments,
    );
    expect(nearestSource(null, options)).toBe(FuelyAutomationScope.InstagramPostComments);
  });

  it('is null with no sources at all', () => {
    expect(nearestSource(FuelyAutomationScope.InstagramPostComments, [])).toBeNull();
  });
});
