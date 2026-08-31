import type { ModuleClient } from '~api';
import type {
  AutomationsAttributesQuery,
  AutomationsBootstrapQuery,
  AutomationsFacebookPostsQuery,
  AutomationsMetaAdsQuery,
  AutomationsPreviewMessagesQuery,
  AutomationsPreviewStartForAutomationMutation,
  FuelyAutomationListQuery,
  FuelySettingBookingRulesUpdateInput,
  FuelySettingCatalogImagesUpdateInput,
  FuelySettingCollectContactInfoUpdateInput,
  FuelySettingFollowUpsUpdateInput,
  FuelySettingIncomingMessagesUpdateInput,
  FuelySettingKeywordsUpdateInput,
  FuelySettingListOfAdsUpdateInput,
  FuelySettingListOfPostsUpdateInput,
  FuelySettingListOfStoriesUpdateInput,
  FuelySettingMessageDelaysUpdateInput,
  FuelySettingPrivateReplyUpdateInput,
  FuelySettingPublicReplyUpdateInput,
  FuelySettingRefLinksUpdateInput,
  FuelySettingSwitchToHumanUpdateInput,
  FuelySettingWhenAiRepliesUpdateInput,
  InstagramMediaPickerQuery,
} from '~api/generated/automations/graphql';

/** The injected client — this module never constructs one. */
export type ApiClient = ModuleClient;

/**
 * Full automation shape (the FuelyAutomationParts fragment). One record per
 * base or custom automation; `settings` is the resolved list.
 */
export type AutomationRecord = FuelyAutomationListQuery['bot']['fuelyAutomations'][number];

/**
 * One element of automation.settings. There is no id and no kind field —
 * `__typename` is the only discriminator (guide.md). The union includes every
 * FuelySetting implementation the schema knows, which is one
 * more (`FuelySettingSendEventsToMeta`) than the module edits — see
 * `KnownSettingTypename`.
 */
export type SettingInfo = AutomationRecord['settings'][number];
export type SettingTypename = SettingInfo['__typename'];
export type SettingOf<T extends SettingTypename> = Extract<SettingInfo, { __typename: T }>;

/** The 15 setting types this module reads, writes and renders an editor for. */
export type KnownSettingTypename = SettingUpdate['type'];

/** Shallow parent/candidate-parent shape (the FuelyAutomationRef fragment). */
export type AutomationRef = SettingInfo['canInheritFrom'][number];

export type InstagramMediaNode = InstagramMediaPickerQuery['bot']['instagramMediasConnection']['edges'][number]['node'];
export type FacebookPostNode = NonNullable<
  Extract<
    AutomationsFacebookPostsQuery['bot']['contactScopes'][number],
    { __typename: 'FacebookContactScope' }
  >['facebookPage']['posts']['edges'][number]['node']
>;
export type MetaAdAccount = AutomationsMetaAdsQuery['currentUser']['metaAdAccounts'][number];
export type MetaAdNode = MetaAdAccount['ads']['edges'][number]['node'];

/** Bootstrap slices (see `AutomationsCatalogContext`). */
export type BootstrapBot = AutomationsBootstrapQuery['bot'];
export type ContactScopeNode = BootstrapBot['contactScopes'][number];
export type TeamMember = BootstrapBot['members'][number];
export type AttributeNode = AutomationsAttributesQuery['bot']['botAttributes']['edges'][number]['node'];

/** Preview (test chat). */
export type PreviewMessageNode =
  AutomationsPreviewMessagesQuery['bot']['conversation']['messages']['edges'][number]['node'];
export type PreviewSession = AutomationsPreviewStartForAutomationMutation['previewResponsesStartForFuelyAutomation'];

/**
 * The 10 setting types that can inherit from a base automation. The five
 * filter settings exist only on custom automations, never on a base, so
 * they have nothing to inherit from.
 */
export type InheritableSettingTypename =
  | 'FuelySettingIncomingMessages'
  | 'FuelySettingWhenAIReplies'
  | 'FuelySettingMessageDelays'
  | 'FuelySettingCatalogImages'
  | 'FuelySettingBookingRules'
  | 'FuelySettingSwitchToHuman'
  | 'FuelySettingFollowUps'
  | 'FuelySettingCollectContactInfo'
  | 'FuelySettingPrivateReply'
  | 'FuelySettingPublicReply';

/**
 * One setting write, dispatched by __typename to the matching
 * FuelySettingSet* document. Every update REPLACES the whole value
 * (read-modify-write for the list-valued ones).
 */
export type SettingUpdate =
  | { type: 'FuelySettingIncomingMessages'; update: FuelySettingIncomingMessagesUpdateInput }
  | { type: 'FuelySettingWhenAIReplies'; update: FuelySettingWhenAiRepliesUpdateInput }
  | { type: 'FuelySettingMessageDelays'; update: FuelySettingMessageDelaysUpdateInput }
  | { type: 'FuelySettingCatalogImages'; update: FuelySettingCatalogImagesUpdateInput }
  | { type: 'FuelySettingBookingRules'; update: FuelySettingBookingRulesUpdateInput }
  | { type: 'FuelySettingSwitchToHuman'; update: FuelySettingSwitchToHumanUpdateInput }
  | { type: 'FuelySettingFollowUps'; update: FuelySettingFollowUpsUpdateInput }
  | { type: 'FuelySettingCollectContactInfo'; update: FuelySettingCollectContactInfoUpdateInput }
  | { type: 'FuelySettingPrivateReply'; update: FuelySettingPrivateReplyUpdateInput }
  | { type: 'FuelySettingPublicReply'; update: FuelySettingPublicReplyUpdateInput }
  | { type: 'FuelySettingKeywords'; update: FuelySettingKeywordsUpdateInput }
  | { type: 'FuelySettingListOfPosts'; update: FuelySettingListOfPostsUpdateInput }
  | { type: 'FuelySettingListOfStories'; update: FuelySettingListOfStoriesUpdateInput }
  | { type: 'FuelySettingListOfAds'; update: FuelySettingListOfAdsUpdateInput }
  | { type: 'FuelySettingRefLinks'; update: FuelySettingRefLinksUpdateInput };

export type SettingUpdateOf<T extends KnownSettingTypename> = Extract<SettingUpdate, { type: T }>['update'];

/** What the workspace knows about the signed-in role. */
export interface AutomationsRole {
  canView: boolean;
  /** `Ai: Edit` — every write, and the test chat (managers cannot test). */
  canEdit: boolean;
  loading: boolean;
}
