import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AutomationsAttributesDocument,
  AutomationsBootstrapDocument,
  Platform,
} from '~api/generated/automations/graphql';
import { errorMessage } from '../lib/errors';
import type { ApiClient, AttributeNode, BootstrapBot, ContactScopeNode, TeamMember } from '../types';

export interface ChannelConnection {
  platform: 'Instagram' | 'WhatsApp' | 'Facebook' | 'TikTok' | 'Web Widget';
  connected: boolean;
  /** "@luma.skin", "+1 202 555 0142", "Luma Skin Studio", the widget name — or null. */
  handle: string | null;
  /** The contact scope id (`ig_…`, `wa_…`) or null when not connected. */
  contactScopeId: string | null;
  /** The account id the picker mutations need (Instagram only). */
  accountId: string | null;
  avatarUrl: string | null;
}

export interface CatalogValue {
  /** Loading of the bootstrap query; the rest arrive independently. */
  loading: boolean;
  error: string | null;
  bot: BootstrapBot | null;
  channels: ChannelConnection[];
  team: TeamMember[];
  attributes: AttributeNode[];
  attributesLoading: boolean;
  refresh: () => void;
}

const ALL_PLATFORMS: Platform[] = Object.values(Platform);

/** Which channels are connected, from `bot.contactScopes` (order not stable — never index). */
export function channelsOf(scopes: readonly ContactScopeNode[]): ChannelConnection[] {
  const find = <T extends ContactScopeNode['__typename']>(t: T) =>
    scopes.find((s): s is Extract<ContactScopeNode, { __typename: T }> => s.__typename === t);
  const ig = find('InstagramAccountContactScope');
  const wa = find('WhatsAppPhoneContactScope');
  const fb = find('FacebookContactScope');
  const tt = find('TikTokAccountContactScope');
  const ww = find('WebWidgetContactScope');
  return [
    {
      platform: 'Instagram',
      connected: Boolean(ig?.instagramAccount?.id),
      handle: ig?.instagramAccount ? `@${ig.instagramAccount.username}` : null,
      contactScopeId: ig?.id ?? null,
      accountId: ig?.instagramAccount?.id ?? null,
      avatarUrl: ig?.instagramAccount?.profilePicture?.url ?? null,
    },
    {
      platform: 'WhatsApp',
      connected: Boolean(wa?.phone?.id),
      handle: wa?.phone?.displayPhoneNumber ?? null,
      contactScopeId: wa?.id ?? null,
      accountId: null,
      avatarUrl: null,
    },
    {
      platform: 'Facebook',
      connected: Boolean(fb?.facebookPage?.id),
      handle: fb?.facebookPage?.name ?? null,
      contactScopeId: fb?.id ?? null,
      accountId: fb?.facebookPage?.id ?? null,
      avatarUrl: fb?.facebookPage?.picture?.url ?? null,
    },
    {
      platform: 'TikTok',
      connected: Boolean(tt?.tiktokAccount?.id),
      handle: tt?.tiktokAccount?.username ? `@${tt.tiktokAccount.username}` : null,
      contactScopeId: tt?.id ?? null,
      accountId: tt?.tiktokAccount?.id ?? null,
      avatarUrl: null,
    },
    {
      // A widget scope exists on every bot; "connected" means it is enabled.
      platform: 'Web Widget',
      connected: Boolean(ww?.webWidget?.isEnabled),
      handle: ww?.webWidget?.name?.trim() ? ww.webWidget.name : null,
      contactScopeId: ww?.id ?? null,
      accountId: ww?.webWidget?.id ?? null,
      avatarUrl: null,
    },
  ];
}

/**
 * The workspace's context data — connected channels, team, attribute catalog,
 * knowledge-base facts. Called by `AutomationsApp` with props (it renders the
 * provider — validate 10b). Each slice loads on its own so a slow attribute
 * catalog never blocks the rail.
 */
export function useBootstrap(client: ApiClient, botId: string): CatalogValue {
  const [bot, setBot] = useState<BootstrapBot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<AttributeNode[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(true);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .query(AutomationsBootstrapDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        setBot(data.bot);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, generation]);

  useEffect(() => {
    let cancelled = false;
    setAttributesLoading(true);
    client
      .query(AutomationsAttributesDocument, { botID: botId, platforms: ALL_PLATFORMS, first: 200 })
      .then((data) => {
        if (!cancelled) setAttributes(data.bot.botAttributes.edges.map((e) => e.node));
      })
      .catch(() => {
        /* the picker degrades to free text */
      })
      .finally(() => {
        if (!cancelled) setAttributesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, generation]);

  const refresh = useCallback(() => setGeneration((g) => g + 1), []);
  const channels = useMemo(() => channelsOf(bot?.contactScopes ?? []), [bot]);
  const team = useMemo(() => bot?.members ?? [], [bot]);

  return useMemo(
    () => ({
      loading,
      error,
      bot,
      channels,
      team,
      attributes,
      attributesLoading,
      refresh,
    }),
    [loading, error, bot, channels, team, attributes, attributesLoading, refresh],
  );
}
