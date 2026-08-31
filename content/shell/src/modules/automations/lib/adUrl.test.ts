import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope, MetaAdEffectiveStatus, Platform } from '~api/generated/automations/graphql';
import { adPlatformsOf, adStatusLabel, adStatusTone, hasAdIds, parseAdIds, syncFreshness } from './adUrl';

const A = '120210000000000010';
const B = '120210000000000020';

describe('parseAdIds', () => {
  it('takes bare 15–20 digit ids, comma or whitespace separated, in order and deduped', () => {
    expect(parseAdIds(A)).toEqual([A]);
    expect(parseAdIds(`${A}, ${B}`)).toEqual([A, B]);
    expect(parseAdIds(`${A}\n${B}\n${A}`)).toEqual([A, B]);
    expect(parseAdIds(`  ${A}  `)).toEqual([A]);
  });

  it('reads selected_ad_ids= out of the real Ads Manager URL shapes', () => {
    expect(
      parseAdIds(
        `https://adsmanager.facebook.com/adsmanager/manage/ads?act=1234567890&business_id=987654321012345&selected_ad_ids=${A}%2C${B}`,
      ),
    ).toEqual([A, B]);
    expect(
      parseAdIds(
        `https://business.facebook.com/adsmanager/manage/ads/edit?act=1234567890&selected_ad_ids=${A}&nav_entry_point=lep_237`,
      ),
    ).toEqual([A]);
    expect(
      parseAdIds(
        `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1234567890#selected_ad_ids=${A},${B}`,
      ),
    ).toEqual([A, B]);
    expect(parseAdIds(`selected_ad_ids=${A}`)).toEqual([A]);
  });

  it('never mistakes act= / business_id= digit runs or a URL path for an ad id', () => {
    expect(
      parseAdIds(
        'https://adsmanager.facebook.com/adsmanager/manage/ads?act=123456789012345&business_id=987654321012345',
      ),
    ).toEqual([]);
    expect(parseAdIds(`https://www.facebook.com/ads/library/?id=${A}`)).toEqual([]);
    expect(parseAdIds(`https://x.test/adsmanager?selected_adset_ids=${A}`)).toEqual([]);
  });

  it('ignores the rest — words, short numbers, too-long runs — and never throws on odd encodings', () => {
    expect(parseAdIds('hydrafacial spring 12345 1234567890123456789012')).toEqual([]);
    expect(parseAdIds('%E0%A4%A')).toEqual([]);
    expect(parseAdIds('')).toEqual([]);
    expect(parseAdIds(`ad ${A} and ${B}`)).toEqual([A, B]);
  });

  it('a URL with the parameter and a bare id together keeps both', () => {
    expect(parseAdIds(`https://adsmanager.facebook.com/adsmanager/manage/ads?act=1&selected_ad_ids=${A} ${B}`)).toEqual(
      [A, B],
    );
  });

  it('hasAdIds is the boolean view', () => {
    expect(hasAdIds(A)).toBe(true);
    expect(hasAdIds('nothing')).toBe(false);
  });
});

describe('adPlatformsOf', () => {
  it('WhatsApp click-from-ads asks for whatsapp; the Instagram ad scopes for instagram; others both', () => {
    expect(adPlatformsOf(FuelyAutomationScope.WhatsAppClickFromAds)).toEqual([Platform.Whatsapp]);
    expect(adPlatformsOf(FuelyAutomationScope.InstagramAdComments)).toEqual([Platform.Instagram]);
    expect(adPlatformsOf(FuelyAutomationScope.InstagramClickFromAds)).toEqual([Platform.Instagram]);
    expect(adPlatformsOf(FuelyAutomationScope.FacebookClickFromAds)).toEqual([Platform.Instagram, Platform.Whatsapp]);
    expect(adPlatformsOf(FuelyAutomationScope.TikTokClickFromAds)).toEqual([Platform.Instagram, Platform.Whatsapp]);
  });
});

describe('ad status', () => {
  it('tones: Active green, the paused family muted, the rest warning', () => {
    expect(adStatusTone(MetaAdEffectiveStatus.Active)).toBe('success');
    expect(adStatusTone(MetaAdEffectiveStatus.Paused)).toBe('neutral');
    expect(adStatusTone(MetaAdEffectiveStatus.CampaignPaused)).toBe('neutral');
    expect(adStatusTone(MetaAdEffectiveStatus.Archived)).toBe('neutral');
    expect(adStatusTone(MetaAdEffectiveStatus.Disapproved)).toBe('warning');
    expect(adStatusTone(MetaAdEffectiveStatus.PendingReview)).toBe('warning');
  });

  it('labels every enum value and echoes an unknown one', () => {
    for (const status of Object.values(MetaAdEffectiveStatus)) expect(adStatusLabel(status)).not.toBe('');
    expect(adStatusLabel('SomethingNew')).toBe('SomethingNew');
  });
});

describe('syncFreshness', () => {
  const now = Date.parse('2026-08-17T12:00:00Z');
  it('reads minutes, hours and days, and null when never synced', () => {
    expect(syncFreshness(null, now)).toBeNull();
    expect(syncFreshness('garbage', now)).toBeNull();
    expect(syncFreshness('2026-08-17T11:59:50Z', now)).toBe('Synced just now');
    expect(syncFreshness('2026-08-17T11:35:00Z', now)).toBe('Synced 25 min ago');
    expect(syncFreshness('2026-08-17T10:00:00Z', now)).toBe('Synced 2 h ago');
    expect(syncFreshness('2026-08-14T12:00:00Z', now)).toBe('Synced 3 d ago');
  });
});
