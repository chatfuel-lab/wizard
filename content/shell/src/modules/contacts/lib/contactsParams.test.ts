import { describe, expect, it } from 'vitest';
import { Platform, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import { EMPTY_FILTER, userAssigneeKey } from './contactsFilter';
import {
  DEFAULT_PARAMS,
  contactLink,
  livechatLink,
  parseContactsParams,
  toggleStage,
  viewSegment,
  writeContactsParams,
  type ContactsParams,
} from './contactsParams';

const parse = (qs: string) => parseContactsParams(new URLSearchParams(qs));
const write = (params: Partial<ContactsParams>, base = '') =>
  writeContactsParams(new URLSearchParams(base), { ...DEFAULT_PARAMS, ...params }).toString();

describe('parseContactsParams', () => {
  it('reads the defaults from an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
  });

  it('falls back silently on every unknown value', () => {
    const parsed = parse(
      'view=galaxy&tab=nope&density=huge&assignee=&stage=Nope&sort=broken&since=yesterday&platform=carrier-pigeon',
    );
    expect(parsed.view).toBe('list');
    expect(parsed.tab).toBe('overview');
    expect(parsed.density).toBe('cozy');
    expect(parsed.filter.assignee).toBe('Any');
    expect(parsed.filter.stages).toEqual([]);
    expect(parsed.filter.sort).toBeNull();
    expect(parsed.filter.since).toBeNull();
    expect(parsed.filter.platforms).toHaveLength(5);
  });

  it('reads a full link', () => {
    const parsed = parse(
      'view=audience&contact=c-1&tab=activity&density=compact&q=dana&assignee=u:u-9&stage=Won,Lost&unread=1&platform=whatsapp,widget&sort=deal amount:desc',
    );
    expect(parsed.view).toBe('audience');
    expect(parsed.contact).toBe('c-1');
    expect(parsed.tab).toBe('activity');
    expect(parsed.density).toBe('compact');
    expect(parsed.filter.q).toBe('dana');
    expect(parsed.filter.assignee).toBe(userAssigneeKey('u-9'));
    expect(parsed.filter.stages).toEqual([SalesStageV2.Won, SalesStageV2.Lost]);
    expect(parsed.filter.unreadOnly).toBe(true);
    expect(parsed.filter.platforms).toEqual([Platform.Whatsapp, Platform.Widget]);
    expect(parsed.filter.sort).toEqual({ name: 'deal amount', direction: Sort.Desc });
  });

  it('keeps an attribute name that contains a colon out of the direction', () => {
    expect(parse('sort=a:b:asc').filter.sort).toEqual({ name: 'a:b', direction: Sort.Asc });
  });

  it('never returns groups — they are not a URL-sized thing', () => {
    expect(parse('groups=lots').filter.groups).toEqual([]);
  });
});

describe('writeContactsParams', () => {
  it('writes nothing for the defaults', () => {
    expect(write({})).toBe('');
  });

  it('omits the record tab when no record is open', () => {
    expect(write({ tab: 'activity' })).toBe('');
    expect(write({ contact: 'c-1', tab: 'activity' })).toBe('contact=c-1&tab=activity');
  });

  it('omits the platform list when every platform is selected', () => {
    expect(write({ filter: { ...EMPTY_FILTER, platforms: [Platform.Whatsapp] } })).toBe('platform=whatsapp');
    expect(write({ filter: EMPTY_FILTER })).toBe('');
  });

  it('leaves parameters it does not own alone', () => {
    expect(write({ density: 'compact' }, 'other=1')).toBe('other=1&density=compact');
  });

  it('takes the view from the path, and reads a stale one out of the query once', () => {
    expect(parseContactsParams(new URLSearchParams(''), 'fields').view).toBe('fields');
    expect(parseContactsParams(new URLSearchParams('view=fields')).view).toBe('fields');
    /* The path wins, and the stale key never survives a write. */
    expect(parseContactsParams(new URLSearchParams('view=audience'), 'fields').view).toBe('fields');
    expect(write({ view: 'fields' }, 'view=audience')).toBe('');
    expect(viewSegment('fields')).toBe('fields');
    expect(viewSegment('list')).toBe('');
  });

  it('round-trips everything a link can carry', () => {
    const params: ContactsParams = {
      view: 'list',
      contact: 'c-1',
      tab: 'fields',
      density: 'compact',
      filter: {
        ...EMPTY_FILTER,
        q: 'anna',
        assignee: 'FuelyAI',
        stages: [SalesStageV2.New],
        unreadOnly: true,
        since: '2026-01-01T00:00:00.000Z',
        platforms: [Platform.Whatsapp],
        sort: { name: 'city', direction: Sort.Asc },
      },
    };
    expect(
      parseContactsParams(
        new URLSearchParams(writeContactsParams(new URLSearchParams(), params)),
        viewSegment(params.view),
      ),
    ).toEqual(params);
  });
});

describe('links and stage toggling', () => {
  it('builds the module deep links', () => {
    expect(contactLink('wa_1 2')).toBe('/contacts?contact=wa_1%202');
    expect(livechatLink('c-1')).toBe('/livechat?c=c-1');
  });

  it('collapses all six stages back to "no filter"', () => {
    const five = [SalesStageV2.New, SalesStageV2.Sorting, SalesStageV2.Ready, SalesStageV2.WorkingOn, SalesStageV2.Won];
    expect(toggleStage(five, SalesStageV2.Lost)).toEqual([]);
    expect(toggleStage([], SalesStageV2.Won)).toEqual([SalesStageV2.Won]);
    expect(toggleStage([SalesStageV2.Won], SalesStageV2.Won)).toEqual([]);
  });
});
