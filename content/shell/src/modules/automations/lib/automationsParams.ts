/**
 * The module's deep links, parsed and serialized in one pure place.
 *
 * Two rules the whole file exists to hold (deals' rules, verbatim):
 *
 * 1. **An unknown value falls back silently.** A hand-edited or stale URL must
 *    never white-screen and must never throw — it renders the default.
 * 2. **A default is omitted from the written params.** Otherwise every mount
 *    would rewrite the URL with the full schema.
 *
 *   scope=<FuelyAutomationScope>   the selected source (All omitted)
 *   automation=<id>                the rule card to expand and scroll to; the Test panel pins to it
 *   setting=<key>                  the section to expand on arrival (one-shot, see ScopePage)
 *   new=<scope>                    the New-rule dialog, opened for that scope
 *
 * An older link that still carries `?view=`, `?test=`, `?mode=` … is read for
 * the keys above and the rest is dropped on the next write.
 */
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { parseScope, SCOPES } from './scopes';

/** Short keys for `?setting=` — the typename minus the prefix, lower-camel. */
export type SettingKey =
  | 'incomingMessages'
  | 'whenAIReplies'
  | 'messageDelays'
  | 'catalogImages'
  | 'bookingRules'
  | 'switchToHuman'
  | 'followUps'
  | 'collectContactInfo'
  | 'privateReply'
  | 'publicReply'
  | 'keywords'
  | 'listOfPosts'
  | 'listOfStories'
  | 'listOfAds'
  | 'refLinks';
export const SETTING_KEYS: readonly SettingKey[] = [
  'incomingMessages',
  'whenAIReplies',
  'messageDelays',
  'catalogImages',
  'bookingRules',
  'switchToHuman',
  'followUps',
  'collectContactInfo',
  'privateReply',
  'publicReply',
  'keywords',
  'listOfPosts',
  'listOfStories',
  'listOfAds',
  'refLinks',
];

/** `FuelySettingIncomingMessages` ↔ `incomingMessages`. */
export const settingKeyOf = (typename: string): SettingKey | null => {
  const stripped = typename.replace(/^FuelySetting/, '');
  const key = (stripped.charAt(0).toLowerCase() + stripped.slice(1)) as SettingKey;
  return SETTING_KEYS.includes(key) ? key : null;
};
export const typenameOfKey = (key: SettingKey): string => `FuelySetting${key.charAt(0).toUpperCase()}${key.slice(1)}`;

/** The preview platforms a session can come back on (`PreviewResponsesFuelyAutomationSession.platform`). */
export type PreviewPlatform = 'whatsapp' | 'instagram' | 'widget' | 'tiktok' | 'facebook';
export const PREVIEW_PLATFORMS: readonly PreviewPlatform[] = ['whatsapp', 'instagram', 'widget', 'tiktok', 'facebook'];

export interface AutomationsParams {
  /** The selected source. */
  scope: FuelyAutomationScope;
  /** The card to expand and scroll to; the Test panel pins to it. */
  automation: string | null;
  /** The section to expand on arrival (consumed once). */
  setting: SettingKey | null;
  /** The New-rule dialog, opened for a scope, or null. */
  new: FuelyAutomationScope | null;
}

export const DEFAULT_PARAMS: AutomationsParams = {
  scope: FuelyAutomationScope.All,
  automation: null,
  setting: null,
  new: null,
};

const oneOfOrNull = <T extends string>(raw: string | null, allowed: readonly T[]): T | null =>
  allowed.includes(raw as T) ? (raw as T) : null;
const nonEmpty = (raw: string | null): string | null => (raw === null || raw === '' ? null : raw);

/** The keys this module ever wrote — the current four and the retired ones a stale link may carry. */
export const OWNED_KEYS: readonly string[] = [
  'scope',
  'automation',
  'setting',
  'new',
  'view',
  'test',
  'mode',
  'platform',
  'q',
  'filter',
  'sort',
];

export function parseAutomationsParams(params: URLSearchParams): AutomationsParams {
  return {
    scope: parseScope(params.get('scope')),
    automation: nonEmpty(params.get('automation')),
    setting: oneOfOrNull(params.get('setting'), SETTING_KEYS),
    new: oneOfOrNull(params.get('new'), SCOPES),
  };
}

/**
 * Rewrites only this module's keys and leaves anything else in `params`
 * untouched — the shell owns the rest of the query string. Retired keys are
 * dropped, so an old link stops carrying `?view=` after the first navigation.
 */
export function writeAutomationsParams(params: URLSearchParams, next: AutomationsParams): URLSearchParams {
  const out = new URLSearchParams(params);
  for (const key of OWNED_KEYS) out.delete(key);
  const set = (key: string, value: string | null) => {
    if (value !== null && value !== '') out.set(key, value);
  };
  set('scope', next.scope !== FuelyAutomationScope.All ? next.scope : null);
  set('automation', next.automation);
  set('setting', next.setting);
  set('new', next.new);
  return out;
}
