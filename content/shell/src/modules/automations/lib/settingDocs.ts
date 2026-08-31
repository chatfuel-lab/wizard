/**
 * The two dispatch tables: which generated document writes which setting.
 * Pure async functions over the injected client — no React, so the composites
 * runner, the mutations hook and the undo runner all go through one place.
 *
 * `FuelySettingUpdateInput` is `@oneOf` (enforced by the API even though the
 * bundled SDL strips the directive): every document below sends exactly one key.
 */
import {
  FuelySettingInheritBookingRulesDocument,
  FuelySettingInheritCatalogImagesDocument,
  FuelySettingInheritCollectContactInfoDocument,
  FuelySettingInheritFollowUpsDocument,
  FuelySettingInheritIncomingMessagesDocument,
  FuelySettingInheritMessageDelaysDocument,
  FuelySettingInheritPrivateReplyDocument,
  FuelySettingInheritPublicReplyDocument,
  FuelySettingInheritSwitchToHumanDocument,
  FuelySettingInheritWhenAiRepliesDocument,
  FuelySettingSetBookingRulesDocument,
  FuelySettingSetCatalogImagesDocument,
  FuelySettingSetCollectContactInfoDocument,
  FuelySettingSetFollowUpsDocument,
  FuelySettingSetIncomingMessagesDocument,
  FuelySettingSetKeywordsDocument,
  FuelySettingSetListOfAdsDocument,
  FuelySettingSetListOfPostsDocument,
  FuelySettingSetListOfStoriesDocument,
  FuelySettingSetMessageDelaysDocument,
  FuelySettingSetPrivateReplyDocument,
  FuelySettingSetPublicReplyDocument,
  FuelySettingSetRefLinksDocument,
  FuelySettingSetSwitchToHumanDocument,
  FuelySettingSetWhenAiRepliesDocument,
} from '~api/generated/automations/graphql';
import type { ApiClient, AutomationRecord, InheritableSettingTypename, SettingUpdate } from '../types';

/** Write one setting's value. The response is the whole automation, resolved. */
export async function applySettingUpdate(
  client: ApiClient,
  botID: string,
  automationID: string,
  update: SettingUpdate,
): Promise<AutomationRecord> {
  const vars = { botID, automationID };
  switch (update.type) {
    case 'FuelySettingIncomingMessages':
      return (await client.mutate(FuelySettingSetIncomingMessagesDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingWhenAIReplies':
      return (await client.mutate(FuelySettingSetWhenAiRepliesDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingMessageDelays':
      return (await client.mutate(FuelySettingSetMessageDelaysDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingCatalogImages':
      return (await client.mutate(FuelySettingSetCatalogImagesDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingBookingRules':
      return (await client.mutate(FuelySettingSetBookingRulesDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingSwitchToHuman':
      return (await client.mutate(FuelySettingSetSwitchToHumanDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingFollowUps':
      return (await client.mutate(FuelySettingSetFollowUpsDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingCollectContactInfo':
      return (await client.mutate(FuelySettingSetCollectContactInfoDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingPrivateReply':
      return (await client.mutate(FuelySettingSetPrivateReplyDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingPublicReply':
      return (await client.mutate(FuelySettingSetPublicReplyDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingKeywords':
      return (await client.mutate(FuelySettingSetKeywordsDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingListOfPosts':
      return (await client.mutate(FuelySettingSetListOfPostsDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingListOfStories':
      return (await client.mutate(FuelySettingSetListOfStoriesDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingListOfAds':
      return (await client.mutate(FuelySettingSetListOfAdsDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
    case 'FuelySettingRefLinks':
      return (await client.mutate(FuelySettingSetRefLinksDocument, { ...vars, update: update.update }))
        .fuelyAutomationUpdateSetting;
  }
}

/** Point a setting at a parent from its own `canInheritFrom`. */
export async function applySettingInherit(
  client: ApiClient,
  botID: string,
  automationID: string,
  setting: InheritableSettingTypename,
  parentID: string,
): Promise<AutomationRecord> {
  const vars = { botID, automationID, parentID };
  switch (setting) {
    case 'FuelySettingIncomingMessages':
      return (await client.mutate(FuelySettingInheritIncomingMessagesDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingWhenAIReplies':
      return (await client.mutate(FuelySettingInheritWhenAiRepliesDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingMessageDelays':
      return (await client.mutate(FuelySettingInheritMessageDelaysDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingCatalogImages':
      return (await client.mutate(FuelySettingInheritCatalogImagesDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingBookingRules':
      return (await client.mutate(FuelySettingInheritBookingRulesDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingSwitchToHuman':
      return (await client.mutate(FuelySettingInheritSwitchToHumanDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingFollowUps':
      return (await client.mutate(FuelySettingInheritFollowUpsDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingCollectContactInfo':
      return (await client.mutate(FuelySettingInheritCollectContactInfoDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingPrivateReply':
      return (await client.mutate(FuelySettingInheritPrivateReplyDocument, vars)).fuelyAutomationUpdateSetting;
    case 'FuelySettingPublicReply':
      return (await client.mutate(FuelySettingInheritPublicReplyDocument, vars)).fuelyAutomationUpdateSetting;
  }
}
