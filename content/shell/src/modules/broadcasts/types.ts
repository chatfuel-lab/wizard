import type { ModuleClient } from '~api';
import type {
  BroadcastAttrRefFragment,
  BroadcastBlockFragment,
  BroadcastCatalogTemplateFragment,
  BroadcastElementFragment,
  BroadcastFlowFragment,
  BroadcastSegmentFragment,
  BroadcastTemplateConfigFragment,
} from '~api/generated/broadcasts/graphql';

export type ApiClient = ModuleClient;

/** A flow as `BroadcastFlow` selects it — the whole of what a campaign is made of. */
export type CampaignFlow = BroadcastFlowFragment;
export type CampaignBlock = BroadcastBlockFragment;
export type CampaignElement = BroadcastElementFragment;

/** The entry-point element of a one-time campaign. */
export type OneTimeElement = Extract<CampaignElement, { __typename: 'WhatsAppOneTimeNotificationBlockElement' }>;
/** The entry-point element of a scheduled or repeating campaign. */
export type ScheduledElement = Extract<CampaignElement, { __typename: 'WhatsAppScheduledMessageBlockElement' }>;
/** The element that carries the message. */
export type TemplateElement = Extract<CampaignElement, { __typename: 'WhatsAppTemplateBlockElement' }>;

/** A catalog row, with enough of the message to preview it. */
export type CatalogTemplate = BroadcastCatalogTemplateFragment;
/** The template as the payload block holds it, parameters filled. */
export type TemplateConfig = BroadcastTemplateConfigFragment;

export type AttributeRef = BroadcastAttrRefFragment;
export type SegmentRead = BroadcastSegmentFragment;

/** One server verdict on a block element, as `BroadcastElementErrors` selects it. */
export type ElementError = CampaignElement['errors'][number];

/**
 * The facts about the bot the module reads once: the zone times are shown in,
 * and the WhatsApp number that sends — or its absence.
 */
export interface BotFacts {
  /** The bot's IANA zone, or null when it has none `Intl` accepts. */
  zone: string | null;
  whatsapp: {
    phoneId: string;
    displayPhoneNumber: string;
    /** `WhatsAppPhoneStatus`, as a string — `Connected` is the one that sends. */
    status: string | null;
    wabaId: string;
    wabaName: string | null;
    businessId: string;
    businessName: string;
  } | null;
}
