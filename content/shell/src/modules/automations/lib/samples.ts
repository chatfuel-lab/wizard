/**
 * The automations corpus the unit tests read — "Luma Skin Studio", agent "Mia".
 *
 * One store, built the way the server would hand it over: 18 bases, seven
 * custom rules and the inheritance already resolved between them. The tests
 * over `automationsStore`, `inheritance`, `composites`, `settingRows`,
 * `settingValue`, `settingSummary` and `ruleSummary` all read it, and each
 * entry below is here because it makes an otherwise unreachable branch
 * observable:
 *
 * - 18 bases: All on; TikTok DM off; the Facebook bases ON although Facebook is
 *   NOT connected; Web Widget on with the widget disabled.
 * - Seven custom rules, one per filter type: `rule-spring-posts` (IG post
 *   comments; keywords Contains + 2 posts, PublicReply inherited),
 *   `rule-lead-ads` (IG ad comments; 3 ads), `rule-story-polls` (IG story
 *   replies; 2 stories), `rule-bio-link` (ig.me; 2 refs), `rule-wa-ads` (WA
 *   click-from-ads; keywords AnyComment + ads), `rule-tiktok-viral` (TikTok post
 *   comments; ExactlyMatches), `rule-fb-old-promo` (FB post comments, DISABLED,
 *   platform not connected), plus `rule-locked`.
 * - `rule-tiktok-viral` has keywords mode ExactlyMatches with an EMPTY list —
 *   a state the API will not accept; the editor refuses to save it (`limits.ts`).
 * - The All base carries a 3 000-char prompt (real prompts are 10+ lines) and a
 *   capture with `validationErrors` (a soft warning that never blocks a save).
 * - The IG DM base owns one setting that EQUALS the Default's value — "own but
 *   not different" — so the compare popover has something honest to say.
 * - One base setting of an UNKNOWN typename (`FuelySettingSendEventsToMeta`, on
 *   the WhatsApp DM base) — the row the module cannot edit must render, not crash.
 * - Instagram media: 20 (posts / reels / stories, one `isUnknown`), for the
 *   lookup that resolves a rule's post and story ids to something to draw.
 *
 * The store is mutable by construction — the module's own reducer writes into
 * records shaped like these — so a test that edits it edits it for the file,
 * not only for itself.
 */
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { COMMON_SETTINGS, extrasFor, FILTER_SETTINGS, SCOPES } from './scopes';
import type { SettingTypename } from '../types';

type Vars = Record<string, unknown>;
type SampleSetting = Record<string, unknown> & { __typename: SettingTypename };

interface SampleAutomation {
  __typename: 'FuelyAutomation';
  id: string;
  isBase: boolean;
  name: string | null;
  enabled: boolean;
  scope: FuelyAutomationScope;
  updatedAt: string;
  settings: SampleSetting[];
}

const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

// ---------------------------------------------------------------------------
// Team, attributes, channels, knowledge base, counts
// ---------------------------------------------------------------------------

const avatar = (id: string, hue: number) => ({
  __typename: 'File' as const,
  id: `avatar-${id}`,
  url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="hsl(${hue} 60% 55%)"/></svg>`)}`,
  type: 'image',
  status: 'Ready',
});

const TEAM = [
  {
    id: 'm-1',
    user: { id: 'u-nora', name: 'Nora Lindqvist', isUnknown: false, profilePicture: avatar('nora', 340) },
    role: {
      roleTypeV2: 'Admin',
      botPermissions: [
        { object: 'Ai', action: 'Edit' },
        { object: 'Inbox', action: 'Edit' },
      ],
    },
  },
  {
    id: 'm-2',
    user: { id: 'u-sam', name: 'Sam Okafor', isUnknown: false, profilePicture: avatar('sam', 200) },
    role: {
      roleTypeV2: 'Editor',
      botPermissions: [
        { object: 'Ai', action: 'Edit' },
        { object: 'Inbox', action: 'Edit' },
      ],
    },
  },
  {
    id: 'm-3',
    user: { id: 'u-lea', name: 'Lea Brandt', isUnknown: false, profilePicture: null },
    role: {
      roleTypeV2: 'Manager',
      botPermissions: [
        { object: 'Ai', action: 'View' },
        { object: 'Inbox', action: 'Edit' },
      ],
    },
  },
  {
    id: 'm-4',
    user: { id: 'u-gone', name: '', isUnknown: true, profilePicture: null },
    role: { roleTypeV2: 'Editor', botPermissions: [{ object: 'Ai', action: 'Edit' }] },
  },
];

const teamUser = (id: string) =>
  TEAM.find((m) => m.user.id === id)?.user ?? { id, name: '', isUnknown: true, profilePicture: null };

// ---------------------------------------------------------------------------
// Settings defaults
// ---------------------------------------------------------------------------

const LONG_PROMPT = [
  'You are Mia, the front-desk assistant of Luma Skin Studio in Berlin-Mitte. Warm, precise, never pushy.',
  'Answer in the language the person writes in. Keep replies under 60 words unless a treatment needs explaining.',
  'Treatments: hydrafacial (60 min, €120), microneedling (45 min, €180), LED therapy (30 min, €60), consultation (30 min, free).',
  'When someone asks about results, describe what a first session does and what needs a course of three; never promise outcomes.',
  'Booking: offer the two nearest free slots, then ask which works. If neither works, ask for a day and a time of day.',
  'Prices: state them plainly. Discounts: only the ones in the knowledge base; never invent one.',
  'Sensitive skin, pregnancy, medication: recommend the free consultation first and say why.',
  'If the person is upset, wants a refund, or asks for a human twice — hand over to the team and say a person will reply.',
  'Never diagnose. Never discuss other clinics. Never share the address of a staff member.',
  'Sign off the first message of a conversation with "— Mia, Luma Skin Studio".',
].join('\n');

const DEFAULTS: Record<SettingTypename, () => SampleSetting> = {
  FuelySettingIncomingMessages: () => ({
    __typename: 'FuelySettingIncomingMessages',
    howToReply: 'UsingAI',
    messagePrompt: LONG_PROMPT,
  }),
  FuelySettingWhenAIReplies: () => ({ __typename: 'FuelySettingWhenAIReplies', option: 'Always' }),
  FuelySettingMessageDelays: () => ({ __typename: 'FuelySettingMessageDelays', enabled: true }),
  FuelySettingCatalogImages: () => ({
    __typename: 'FuelySettingCatalogImages',
    whenToShow: 'WhenAsked',
    imagesPerCatalogItem: 2,
  }),
  FuelySettingBookingRules: () => ({
    __typename: 'FuelySettingBookingRules',
    autonomyLevel: 'BookWithTeammatesReview',
  }),
  FuelySettingSwitchToHuman: () => ({
    __typename: 'FuelySettingSwitchToHuman',
    howToSwitch: 'SwitchToTeammates',
    rules: [
      {
        switchingConditions: 'The person asks for a human, a manager or a call',
        messagePrompt: 'Say a teammate will reply within a few minutes and thank them for waiting.',
        assignees: [{ user: teamUser('u-nora') }, { user: teamUser('u-sam') }],
      },
      {
        switchingConditions: 'A complaint, a refund, or an allergic reaction',
        messagePrompt: 'Apologise once, do not argue, hand over immediately.',
        assignees: [{ user: teamUser('u-nora') }],
      },
      {
        switchingConditions: 'A question about a medical condition the knowledge base does not cover',
        messagePrompt: 'Recommend the free consultation and hand over.',
        assignees: [],
      },
    ],
  }),
  FuelySettingFollowUps: () => ({
    __typename: 'FuelySettingFollowUps',
    howToSend: 'Send',
    messagePrompt:
      'If the person went quiet after asking about a treatment, check in once after two hours: offer the two nearest slots again.',
  }),
  FuelySettingCollectContactInfo: () => ({
    __typename: 'FuelySettingCollectContactInfo',
    howToCollect: 'CollectInfo',
    captures: [
      {
        description: 'Which treatment they are interested in',
        attribute: { __typename: 'BotAttribute', name: 'treatment_interest', type: 'custom', dataType: 'string' },
        validationErrors: [],
      },
      {
        description: 'Their skin type, if they mention it',
        attribute: { __typename: 'BotAttribute', name: 'skin_type', type: 'custom', dataType: 'string' },
        validationErrors: [],
      },
      {
        description: 'When they would like to come in',
        attribute: { __typename: 'BotAttribute', name: 'preferred_time', type: 'custom', dataType: 'string' },
        validationErrors: [],
      },
      {
        description: 'Their full name',
        attribute: { __typename: 'BotAttribute', name: 'name', type: 'system', dataType: 'string' },
        validationErrors: ['SystemAttributeIsNotAllowed'],
      },
    ],
  }),
  FuelySettingPrivateReply: () => ({
    __typename: 'FuelySettingPrivateReply',
    privateReplyHowToReply: 'UsingAI',
    exactTextReply: 'Thanks for your comment! I sent you the details in a DM.',
    messagePrompt: 'Open the DM with a friendly line about their comment, then answer the question it contained.',
  }),
  FuelySettingPublicReply: () => ({
    __typename: 'FuelySettingPublicReply',
    publicReplyHowToReply: 'ExactText',
    exactTextReply: 'Thanks! Check your DMs 💌',
    messagePrompt: 'Reply publicly in one short sentence and point to the DM.',
    likeContactComment: false,
  }),
  FuelySettingKeywords: () => ({ __typename: 'FuelySettingKeywords', reactTo: 'AnyComment', keywords: [] }),
  FuelySettingListOfPosts: () => ({ __typename: 'FuelySettingListOfPosts', posts: [] }),
  FuelySettingListOfStories: () => ({ __typename: 'FuelySettingListOfStories', stories: [] }),
  FuelySettingListOfAds: () => ({ __typename: 'FuelySettingListOfAds', adIDs: [] }),
  FuelySettingRefLinks: () => ({ __typename: 'FuelySettingRefLinks', refs: [] }),
  FuelySettingSendEventsToMeta: () => ({ __typename: 'FuelySettingSendEventsToMeta' }),
};

/** Which fields carry the value (an inherit copies the parent's resolved value). */
export const VALUE_KEYS: Record<SettingTypename, string[]> = {
  FuelySettingIncomingMessages: ['howToReply', 'messagePrompt'],
  FuelySettingWhenAIReplies: ['option'],
  FuelySettingMessageDelays: ['enabled'],
  FuelySettingCatalogImages: ['whenToShow', 'imagesPerCatalogItem'],
  FuelySettingBookingRules: ['autonomyLevel'],
  FuelySettingSwitchToHuman: ['howToSwitch', 'rules'],
  FuelySettingFollowUps: ['howToSend', 'messagePrompt'],
  FuelySettingCollectContactInfo: ['howToCollect', 'captures'],
  FuelySettingPrivateReply: ['privateReplyHowToReply', 'exactTextReply', 'messagePrompt'],
  FuelySettingPublicReply: ['publicReplyHowToReply', 'exactTextReply', 'messagePrompt', 'likeContactComment'],
  FuelySettingKeywords: ['reactTo', 'keywords'],
  FuelySettingListOfPosts: ['posts'],
  FuelySettingListOfStories: ['stories'],
  FuelySettingListOfAds: ['adIDs'],
  FuelySettingRefLinks: ['refs'],
  FuelySettingSendEventsToMeta: [],
};

const isFilter = (typename: SettingTypename) => FILTER_SETTINGS.includes(typename);

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

export const AUTOMATIONS = new Map<string, SampleAutomation>();

const refOf = (a: SampleAutomation) => ({
  __typename: 'FuelyAutomation' as const,
  id: a.id,
  isBase: a.isBase,
  name: a.name,
  enabled: a.enabled,
  scope: a.scope,
});

const baseId = (scope: FuelyAutomationScope) =>
  scope === FuelyAutomationScope.All ? 'auto-all-base' : `auto-${scope}-base`;
const baseOf = (scope: FuelyAutomationScope): SampleAutomation => AUTOMATIONS.get(baseId(scope))!;

const allBase: SampleAutomation = {
  __typename: 'FuelyAutomation',
  id: 'auto-all-base',
  isBase: true,
  name: null,
  enabled: true,
  scope: FuelyAutomationScope.All,
  updatedAt: at(600),
  settings: COMMON_SETTINGS.map((typename) => ({ ...DEFAULTS[typename](), inheritsFrom: null, canInheritFrom: [] })),
};
AUTOMATIONS.set(allBase.id, allBase);

const OFF_BASES = new Set<FuelyAutomationScope>([
  FuelyAutomationScope.TikTokDirectMessages,
  FuelyAutomationScope.TikTokClickFromAds,
]);

for (const scope of SCOPES) {
  if (scope === FuelyAutomationScope.All) continue;
  const settingTypes = [...COMMON_SETTINGS, ...extrasFor(scope).filter((t) => !isFilter(t))];
  const base: SampleAutomation = {
    __typename: 'FuelyAutomation',
    id: baseId(scope),
    isBase: true,
    name: null,
    enabled: !OFF_BASES.has(scope),
    scope,
    updatedAt: at(540),
    /* Only the 8 common settings can follow Default: the All base does not
       carry Public/PrivateReply, so those have no parent on a scope base —
       `canInheritFrom: []`, as the wire answers. */
    settings: settingTypes.map((typename) => ({
      ...DEFAULTS[typename](),
      inheritsFrom: null,
      canInheritFrom: COMMON_SETTINGS.includes(typename) ? [refOf(allBase)] : [],
    })),
  };
  AUTOMATIONS.set(base.id, base);
}

/** Point a stored setting at a parent, copying the resolved value (read semantics). */
const inheritInStore = (automationId: string, typename: SettingTypename, parent: SampleAutomation) => {
  const automation = AUTOMATIONS.get(automationId);
  const setting = automation?.settings.find((s) => s.__typename === typename);
  const parentSetting = parent.settings.find((s) => s.__typename === typename);
  if (!automation || !setting || !parentSetting) return;
  for (const key of VALUE_KEYS[typename]) setting[key] = structuredClone(parentSetting[key]);
  setting.inheritsFrom = refOf(parent);
};

// Every scope base follows Default for the 8 common settings (as a fresh bot does)…
for (const scope of SCOPES) {
  if (scope === FuelyAutomationScope.All) continue;
  for (const typename of COMMON_SETTINGS) inheritInStore(baseId(scope), typename, allBase);
}
// …except where the demo needs an owned value:
{
  const igDm = baseOf(FuelyAutomationScope.InstagramDirectMessages);
  const own = (typename: SettingTypename, patch: Vars) => {
    const s = igDm.settings.find((x) => x.__typename === typename)!;
    Object.assign(s, patch, { inheritsFrom: null });
  };
  own('FuelySettingIncomingMessages', {
    messagePrompt: `${LONG_PROMPT}\nOn Instagram keep it to two short paragraphs and use one emoji at most.`,
  });
  own('FuelySettingWhenAIReplies', { option: 'OutsideOfWorkingHours' });
  // Owned but EQUAL to Default — "customized" without a difference.
  own('FuelySettingMessageDelays', { enabled: true });

  const wa = baseOf(FuelyAutomationScope.WhatsAppDirectMessages);
  const waOwn = (typename: SettingTypename, patch: Vars) => {
    const s = wa.settings.find((x) => x.__typename === typename)!;
    Object.assign(s, patch, { inheritsFrom: null });
  };
  waOwn('FuelySettingBookingRules', { autonomyLevel: 'BookWithFullAutonomy' });
  waOwn('FuelySettingCatalogImages', { whenToShow: 'OnceMentioned', imagesPerCatalogItem: 3 });
  // The unknown 16th setting the module does not edit — must render, never crash.
  wa.settings.push({ ...DEFAULTS.FuelySettingSendEventsToMeta(), inheritsFrom: null, canInheritFrom: [] });

  const fbPosts = baseOf(FuelyAutomationScope.FacebookPostComments);
  const fbOwn = fbPosts.settings.find((x) => x.__typename === 'FuelySettingPublicReply')!;
  Object.assign(fbOwn, { publicReplyHowToReply: 'UsingAI', likeContactComment: true, inheritsFrom: null });
}

// ---------------------------------------------------------------------------
// Custom rules
// ---------------------------------------------------------------------------

export function makeCustom(
  id: string,
  scope: FuelyAutomationScope,
  name: string,
  enabled: boolean,
  minutesAgo: number,
): SampleAutomation {
  const scopeBase = baseOf(scope);
  const automation: SampleAutomation = {
    __typename: 'FuelyAutomation',
    id,
    isBase: false,
    name,
    enabled,
    scope,
    updatedAt: at(minutesAgo),
    settings: [...COMMON_SETTINGS, ...extrasFor(scope)].map((typename) => ({
      ...DEFAULTS[typename](),
      inheritsFrom: null,
      canInheritFrom: isFilter(typename)
        ? []
        : typename === 'FuelySettingPrivateReply' || typename === 'FuelySettingPublicReply'
          ? [refOf(scopeBase)]
          : [refOf(allBase), refOf(scopeBase)],
    })),
  };
  AUTOMATIONS.set(automation.id, automation);
  // New customs start off following the scope base for everything but the filters.
  for (const typename of [...COMMON_SETTINGS, ...extrasFor(scope)].filter((t) => !isFilter(t)))
    inheritInStore(automation.id, typename, scopeBase);
  return automation;
}

const setOwn = (a: SampleAutomation, typename: SettingTypename, patch: Vars) => {
  const s = a.settings.find((x) => x.__typename === typename)!;
  Object.assign(s, patch, { inheritsFrom: null });
};

const IG_SCOPE_ID = 'ig_17841400000000001';

{
  const spring = makeCustom(
    'rule-spring-posts',
    FuelyAutomationScope.InstagramPostComments,
    'Spring glow posts',
    true,
    45,
  );
  setOwn(spring, 'FuelySettingKeywords', {
    reactTo: 'CommentThatContains',
    keywords: ['price', 'cost', 'how much', 'book', 'appointment'],
  });
  setOwn(spring, 'FuelySettingListOfPosts', {
    posts: [
      { postID: 'ig-media-1', contactScopeID: IG_SCOPE_ID },
      { postID: 'ig-media-2', contactScopeID: IG_SCOPE_ID },
    ],
  });
  setOwn(spring, 'FuelySettingIncomingMessages', {
    howToReply: 'UsingAI',
    messagePrompt:
      'The spring glow campaign: 15% off a course of three hydrafacials booked before June. Answer price and booking questions first.',
  });
  setOwn(spring, 'FuelySettingPrivateReply', {
    privateReplyHowToReply: 'UsingAI',
    exactTextReply: 'Sent you the details 💌',
    messagePrompt: 'Open with the spring offer, then answer their comment.',
  });

  const leadAds = makeCustom(
    'rule-lead-ads',
    FuelyAutomationScope.InstagramAdComments,
    'Lead ads — hydrafacial',
    true,
    120,
  );
  setOwn(leadAds, 'FuelySettingListOfAds', {
    adIDs: ['120210000000000001', '120210000000000002', '120210000000000003'],
  });
  setOwn(leadAds, 'FuelySettingKeywords', { reactTo: 'AnyComment', keywords: [] });
  setOwn(leadAds, 'FuelySettingCollectContactInfo', {
    howToCollect: 'CollectInfo',
    captures: [
      {
        description: 'Their budget for a treatment course',
        attribute: { __typename: 'BotAttribute', name: 'budget', type: 'custom', dataType: 'string' },
        validationErrors: [],
      },
      {
        description: 'Which ad they saw',
        attribute: { __typename: 'BotAttribute', name: 'referral_source', type: 'custom', dataType: 'string' },
        validationErrors: [],
      },
    ],
  });

  const stories = makeCustom('rule-story-polls', FuelyAutomationScope.InstagramStoryReplies, 'Story polls', true, 300);
  setOwn(stories, 'FuelySettingListOfStories', {
    stories: [
      { storyID: 'ig-media-3', contactScopeID: IG_SCOPE_ID },
      { storyID: 'ig-media-7', contactScopeID: IG_SCOPE_ID },
    ],
  });
  setOwn(stories, 'FuelySettingKeywords', { reactTo: 'CommentThatContains', keywords: ['yes', 'me', '🙋'] });

  const bio = makeCustom(
    'rule-bio-link',
    FuelyAutomationScope.InstagramIgMeLinks,
    'Bio link — free consultation',
    true,
    1440,
  );
  setOwn(bio, 'FuelySettingRefLinks', { refs: ['bio', 'spring-consult'] });
  setOwn(bio, 'FuelySettingIncomingMessages', {
    howToReply: 'UsingAI',
    messagePrompt:
      'They came from the bio link: offer the free 30-minute consultation first and the two nearest slots.',
  });

  const waAds = makeCustom(
    'rule-wa-ads',
    FuelyAutomationScope.WhatsAppClickFromAds,
    'Click-to-WhatsApp — microneedling',
    true,
    2000,
  );
  setOwn(waAds, 'FuelySettingListOfAds', { adIDs: ['120210000000000010'] });
  setOwn(waAds, 'FuelySettingKeywords', { reactTo: 'AnyComment', keywords: [] });
  setOwn(waAds, 'FuelySettingFollowUps', {
    howToSend: 'Send',
    messagePrompt: 'If they stop replying, one nudge after three hours with the microneedling intro price.',
  });

  const tiktok = makeCustom(
    'rule-tiktok-viral',
    FuelyAutomationScope.TikTokPostComments,
    'Viral video comments',
    false,
    90,
  );
  // A non-Any mode with zero keywords is not savable — the editor must refuse it.
  setOwn(tiktok, 'FuelySettingKeywords', { reactTo: 'CommentThatExactlyMatches', keywords: [] });

  const fbOld = makeCustom(
    'rule-fb-old-promo',
    FuelyAutomationScope.FacebookPostComments,
    'Old promo (2025)',
    false,
    60 * 24 * 40,
  );
  setOwn(fbOld, 'FuelySettingKeywords', { reactTo: 'CommentThatContains', keywords: ['promo'] });

  const locked = makeCustom(
    'rule-locked',
    FuelyAutomationScope.WhatsAppClickFromAds,
    'Busy rule (edit lock demo)',
    true,
    15,
  );
  setOwn(locked, 'FuelySettingKeywords', { reactTo: 'CommentThatContains', keywords: ['demo'] });
}

// ---------------------------------------------------------------------------
// Media, posts, ads
// ---------------------------------------------------------------------------

const MEDIA_TYPES = ['InstagramPost', 'InstagramReel', 'InstagramStory', 'InstagramPost'] as const;
const MEDIA_CAPTIONS = [
  'Spring glow: 15% off a course of three hydrafacials until June ✨',
  'Behind the treatment room — a 60-second hydrafacial',
  'Story: today only, two open slots at 17:00 and 18:30',
  'Microneedling explained: what the first session does',
  'LED therapy for calmer skin — book a free consult',
  'Story: poll — morning or evening appointments?',
  'Meet Nora, our lead aesthetician',
  'The consultation is free. Here is what happens in it.',
  'Client stories: three months, three sessions',
  'Story: we are open Saturdays now',
  'Aftercare after microneedling — the five rules',
  'Story: reply "me" for the spring waitlist',
  'Why we never promise results (and what we do promise)',
  'Sunday closed, Monday 10:00 — see you then',
  'Gift cards for the season',
  'Story: a day at the studio',
  'Sensitive skin? Start with the consult.',
  'Reels: the LED room in 20 seconds',
  'Prices, plainly. Hydrafacial €120 · Microneedling €180 · LED €60',
  'Story: closing early on the 24th',
];
const thumb = (i: number) => ({
  __typename: 'File' as const,
  id: `ig-thumb-${i}`,
  url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="hsl(${(i * 37) % 360} 45% 78%)"/><circle cx="48" cy="48" r="22" fill="hsl(${(i * 37) % 360} 55% 60%)"/></svg>`)}`,
  type: 'image',
  status: 'Ready',
});
export const MEDIA = MEDIA_CAPTIONS.map((caption, i) => ({
  __typename: MEDIA_TYPES[i % MEDIA_TYPES.length],
  id: `ig-media-${i + 1}`,
  isUnknown: i === 14,
  caption: i === 14 ? null : caption,
  url: `https://www.instagram.com/p/luma-${i + 1}/`,
  thumbnailPreview: i % 5 === 4 ? null : thumb(i + 1),
}));
