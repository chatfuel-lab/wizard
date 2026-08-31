/**
 * The value of a setting, read shape ↔ write shape.
 *
 * A read (`FuelySetting*` in `settings`) and a write (`FuelySetting*UpdateInput`)
 * differ in four places, all list-valued: posts carry `{postID, contactScopeID}`
 * but are written as `postIDs`; stories likewise; a switch-to-human assignee is
 * read as `{user: {id, …}}` and written as `{userID}`; a capture's attribute is
 * read as `{name, type, dataType}` and written as `name`. Everything else is a
 * field-for-field copy. This file is the one place that knows it, so a
 * duplicate, an undo, a "copy to" and a draft baseline all agree.
 *
 * `sameValue` compares two settings by their VALUE only — never by
 * `inheritsFrom` / `canInheritFrom` — which is what "differs from Default"
 * and "is this draft dirty" both mean.
 */
import type {
  InheritableSettingTypename,
  KnownSettingTypename,
  SettingInfo,
  SettingTypename,
  SettingUpdate,
} from '../types';

export const INHERITABLE: ReadonlySet<SettingTypename> = new Set<SettingTypename>([
  'FuelySettingIncomingMessages',
  'FuelySettingWhenAIReplies',
  'FuelySettingMessageDelays',
  'FuelySettingCatalogImages',
  'FuelySettingBookingRules',
  'FuelySettingSwitchToHuman',
  'FuelySettingFollowUps',
  'FuelySettingCollectContactInfo',
  'FuelySettingPrivateReply',
  'FuelySettingPublicReply',
]);

/** The five settings only a custom automation owns — its triggers. Never inherited. */
export const FILTER_SETTINGS: ReadonlySet<SettingTypename> = new Set<SettingTypename>([
  'FuelySettingKeywords',
  'FuelySettingListOfPosts',
  'FuelySettingListOfStories',
  'FuelySettingListOfAds',
  'FuelySettingRefLinks',
]);

/** The 15 the module edits. Anything else (SendEventsToMeta today) is read-only here. */
export const KNOWN_SETTINGS: ReadonlySet<SettingTypename> = new Set<SettingTypename>([
  ...INHERITABLE,
  ...FILTER_SETTINGS,
]);

export const isInheritable = (t: SettingTypename): t is InheritableSettingTypename => INHERITABLE.has(t);
export const isFilterSetting = (t: SettingTypename): boolean => FILTER_SETTINGS.has(t);
export const isKnownSetting = (t: SettingTypename): t is KnownSettingTypename => KNOWN_SETTINGS.has(t);

/**
 * The write that reproduces this setting's current value, or null for a
 * typename the module does not write (a duplicate skips it, a compare shows it
 * as "managed elsewhere").
 */
export function settingUpdateInput(setting: SettingInfo): SettingUpdate | null {
  switch (setting.__typename) {
    case 'FuelySettingIncomingMessages':
      return {
        type: setting.__typename,
        update: { howToReply: setting.howToReply, messagePrompt: setting.messagePrompt },
      };
    case 'FuelySettingWhenAIReplies':
      return { type: setting.__typename, update: { option: setting.option } };
    case 'FuelySettingMessageDelays':
      return { type: setting.__typename, update: { enabled: setting.enabled } };
    case 'FuelySettingCatalogImages':
      return {
        type: setting.__typename,
        update: { whenToShow: setting.whenToShow, imagesPerCatalogItem: setting.imagesPerCatalogItem },
      };
    case 'FuelySettingBookingRules':
      return { type: setting.__typename, update: { autonomyLevel: setting.autonomyLevel } };
    case 'FuelySettingSwitchToHuman':
      return {
        type: setting.__typename,
        update: {
          howToSwitch: setting.howToSwitch,
          rules: setting.rules.map((rule) => ({
            switchingConditions: rule.switchingConditions,
            messagePrompt: rule.messagePrompt,
            assignees: (rule.assignees ?? []).map((a) => ({ userID: a.user.id })),
          })),
        },
      };
    case 'FuelySettingFollowUps':
      return {
        type: setting.__typename,
        update: { howToSend: setting.howToSend, messagePrompt: setting.messagePrompt },
      };
    case 'FuelySettingCollectContactInfo':
      return {
        type: setting.__typename,
        update: {
          howToCollect: setting.howToCollect,
          captures: setting.captures.map((c) => ({ description: c.description, name: c.attribute?.name ?? '' })),
        },
      };
    case 'FuelySettingPrivateReply':
      return {
        type: setting.__typename,
        update: {
          privateReplyHowToReply: setting.privateReplyHowToReply,
          exactTextReply: setting.exactTextReply,
          messagePrompt: setting.messagePrompt,
        },
      };
    case 'FuelySettingPublicReply':
      return {
        type: setting.__typename,
        update: {
          publicReplyHowToReply: setting.publicReplyHowToReply,
          exactTextReply: setting.exactTextReply,
          messagePrompt: setting.messagePrompt,
          likeContactComment: setting.likeContactComment,
        },
      };
    case 'FuelySettingKeywords':
      return { type: setting.__typename, update: { reactTo: setting.reactTo, keywords: [...setting.keywords] } };
    case 'FuelySettingListOfPosts':
      return { type: setting.__typename, update: { postIDs: setting.posts.map((p) => p.postID) } };
    case 'FuelySettingListOfStories':
      return { type: setting.__typename, update: { storyIDs: setting.stories.map((s) => s.storyID) } };
    case 'FuelySettingListOfAds':
      return { type: setting.__typename, update: { adIDs: [...setting.adIDs] } };
    case 'FuelySettingRefLinks':
      return { type: setting.__typename, update: { refs: [...setting.refs] } };
    default:
      return null;
  }
}

/** Stable JSON of the write shape — the comparison key for values. */
export function valueKey(setting: SettingInfo): string {
  const input = settingUpdateInput(setting);
  return input ? stableJson(input.update) : `unknown:${setting.__typename}`;
}

/** Same VALUE (write shape), regardless of inheritance metadata. */
export function sameValue(a: SettingInfo, b: SettingInfo): boolean {
  return a.__typename === b.__typename && valueKey(a) === valueKey(b);
}

/** Same write shape — what a draft compares against its baseline. */
export function sameUpdate(a: SettingUpdate['update'], b: SettingUpdate['update']): boolean {
  return stableJson(a) === stableJson(b);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Find one setting on an automation by typename. */
export function settingOf<T extends SettingTypename>(
  settings: readonly SettingInfo[],
  typename: T,
): Extract<SettingInfo, { __typename: T }> | undefined {
  return settings.find((s): s is Extract<SettingInfo, { __typename: T }> => s.__typename === typename);
}
