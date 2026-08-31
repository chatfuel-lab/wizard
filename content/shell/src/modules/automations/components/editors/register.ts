/**
 * Populates the registry (`./index.ts`) with the 15 editors. Imported ONCE,
 * for its side effect, from `components/channels/ChannelsView.tsx` — the one
 * place a `SettingSection` is first mounted from — so the Default card and
 * every `RuleCard` find an editor by typename. The calls are idempotent.
 */
import {
  BookingRulesEditor,
  CatalogImagesEditor,
  FollowUpsEditor,
  IncomingMessagesEditor,
  MessageDelaysEditor,
  WhenAIRepliesEditor,
} from './CoreEditors';
import {
  KeywordsEditor,
  ListOfAdsEditor,
  ListOfPostsEditor,
  ListOfStoriesEditor,
  RefLinksEditor,
} from './FilterEditors';
import { registerEditor } from './index';
import { CollectContactInfoEditor, SwitchToHumanEditor } from './PeopleEditors';
import { PrivateReplyEditor, PublicReplyEditor } from './ReplyEditors';

registerEditor('FuelySettingIncomingMessages', IncomingMessagesEditor);
registerEditor('FuelySettingWhenAIReplies', WhenAIRepliesEditor);
registerEditor('FuelySettingMessageDelays', MessageDelaysEditor);
registerEditor('FuelySettingCatalogImages', CatalogImagesEditor);
registerEditor('FuelySettingBookingRules', BookingRulesEditor);
registerEditor('FuelySettingSwitchToHuman', SwitchToHumanEditor);
registerEditor('FuelySettingFollowUps', FollowUpsEditor);
registerEditor('FuelySettingCollectContactInfo', CollectContactInfoEditor);
registerEditor('FuelySettingPrivateReply', PrivateReplyEditor);
registerEditor('FuelySettingPublicReply', PublicReplyEditor);
registerEditor('FuelySettingKeywords', KeywordsEditor);
registerEditor('FuelySettingListOfPosts', ListOfPostsEditor);
registerEditor('FuelySettingListOfStories', ListOfStoriesEditor);
registerEditor('FuelySettingListOfAds', ListOfAdsEditor);
registerEditor('FuelySettingRefLinks', RefLinksEditor);
