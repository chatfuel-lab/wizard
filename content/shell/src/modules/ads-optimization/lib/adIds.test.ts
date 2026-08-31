import { describe, expect, it } from 'vitest';
import { adIdProblem, adsManagerUrl, hasAdIds, parseAdIds } from './adIds';

describe('parseAdIds', () => {
  it('takes the ids out of an Ads Manager address', () => {
    expect(
      parseAdIds(
        'https://adsmanager.facebook.com/adsmanager/manage/ads?act=1234567890&selected_ad_ids=120210000000000010%2C120210000000000020',
      ),
    ).toEqual(['120210000000000010', '120210000000000020']);
  });

  it('does NOT take the account id for an ad', () => {
    // `act=` and `business_id=` are digit runs too, and pointing a set at the
    // account instead of the ad fails silently for weeks.
    const ids = parseAdIds(
      'https://business.facebook.com/adsmanager/manage/ads/edit?act=1234567890123456&business_id=9876543210987654&selected_ad_ids=120210000000000010',
    );
    expect(ids).toEqual(['120210000000000010']);
  });

  it('reads the parameter out of the fragment too', () => {
    expect(
      parseAdIds('…/adsmanager/manage/campaigns?act=1#selected_ad_ids=120210000000000010,120210000000000020'),
    ).toEqual(['120210000000000010', '120210000000000020']);
  });

  it('takes bare ids, separated any way somebody types them', () => {
    expect(parseAdIds('120210000000000010, 120210000000000020\n120210000000000030')).toEqual([
      '120210000000000010',
      '120210000000000020',
      '120210000000000030',
    ]);
  });

  it('ignores a URL that carries no ad id at all', () => {
    expect(parseAdIds('https://adsmanager.facebook.com/adsmanager/manage/ads?act=1234567890123456')).toEqual([]);
  });

  it('keeps the order and drops repeats', () => {
    expect(parseAdIds('120210000000000020 120210000000000010 120210000000000020')).toEqual([
      '120210000000000020',
      '120210000000000010',
    ]);
  });

  it('ignores prose rather than erroring on it', () => {
    // People paste sentences. Refusing the whole box because one word is not an
    // id would lose the ids that were in it.
    expect(parseAdIds('here you go: 120210000000000010 thanks!')).toEqual(['120210000000000010']);
    expect(hasAdIds('nothing here')).toBe(false);
  });
});

describe('adIdProblem', () => {
  it('says nothing about an id that is shaped like one', () => {
    expect(adIdProblem('120210000000000010')).toBeNull();
  });

  it('names the three ways a stored id goes wrong', () => {
    expect(adIdProblem('   ')).toBe('blank');
    expect(adIdProblem('1'.repeat(61))).toBe('tooLong');
    expect(adIdProblem('not-an-ad')).toBe('notAnId');
  });
});

describe('adsManagerUrl', () => {
  it('addresses the ad by the id the setting stores', () => {
    expect(adsManagerUrl('120210000000000010')).toContain('selected_ad_ids=120210000000000010');
  });
});
