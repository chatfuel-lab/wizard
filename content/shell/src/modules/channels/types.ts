import type { ModuleClient } from '~api';
import type { BotChannelsPartsFragment } from '~api/generated/core/graphql';

export type ApiClient = ModuleClient;

/** `bot.contactScopes` as the core `BotChannels` document selects it. */
export type ChannelScopes = BotChannelsPartsFragment['contactScopes'];
