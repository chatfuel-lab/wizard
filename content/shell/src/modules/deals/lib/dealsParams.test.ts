import { describe, expect, it } from 'vitest';
import { SalesStageV2, Sort } from '~api/generated/deals/graphql';
import { EMPTY_FILTER } from './dealsFilter';
import { DEFAULT_PARAMS, parseDealsParams, viewSegment, writeDealsParams } from './dealsParams';

const parse = (query: string, view = '') => parseDealsParams(new URLSearchParams(query), view);
const write = (next: Parameters<typeof writeDealsParams>[1], from = '') =>
  writeDealsParams(new URLSearchParams(from), next).toString();

describe('parseDealsParams', () => {
  it('returns the defaults for an empty query', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
  });

  it('falls back silently on every unknown value — a stale URL must not white-screen', () => {
    const parsed = parse('view=gantt&density=roomy&assignee=nobody&sort=&collapsed=Nope');
    expect(parsed.view).toBe('board');
    expect(parsed.density).toBe('comfortable');
    expect(parsed.filter.assignee).toBe('Any');
    expect(parsed.filter.sort).toBeNull();
    expect(parsed.collapsed).toEqual([]);
  });

  it('reads the view, the open deal and the density', () => {
    const parsed = parse('view=table&deal=c-1&density=compact');
    expect(parsed.view).toBe('table');
    expect(parsed.deal).toBe('c-1');
    expect(parsed.density).toBe('compact');
  });

  it('treats an empty deal id as no deal', () => {
    expect(parse('deal=').deal).toBeNull();
  });

  it('dedupes stage lists, drops unknown members and returns them in board order', () => {
    expect(parse('collapsed=Won,Nope,Won,New').collapsed).toEqual([SalesStageV2.New, SalesStageV2.Won]);
    expect(parse('stage=Lost,Ready').filter.stages).toEqual([SalesStageV2.Ready, SalesStageV2.Lost]);
  });

  it('parses sort and tolerates an attribute name containing a colon', () => {
    expect(parse('sort=deal amount:desc').filter.sort).toEqual({
      attribute: 'deal amount',
      direction: Sort.Desc,
    });
    expect(parse('sort=a:b:asc').filter.sort).toEqual({ attribute: 'a:b', direction: Sort.Asc });
    expect(parse('sort=deal amount').filter.sort).toBeNull();
    expect(parse('sort=:asc').filter.sort).toBeNull();
  });

  it('never surfaces predicates from a URL — they live in saved views', () => {
    expect(parse('predicates=%5B%5D').filter.predicates).toEqual([]);
  });
});

describe('writeDealsParams', () => {
  it('omits every default, so a fresh board has a clean URL', () => {
    expect(write(DEFAULT_PARAMS)).toBe('');
  });

  it('round-trips a fully populated set', () => {
    const params: Parameters<typeof writeDealsParams>[1] = {
      view: 'table',
      deal: 'c-9',
      density: 'compact',
      collapsed: [SalesStageV2.Won],
      filter: {
        ...EMPTY_FILTER,
        assignee: 'FuelyAI',
        q: 'kaya',
        stages: [SalesStageV2.New, SalesStageV2.Ready],
        unreadOnly: true,
        sort: { attribute: 'deal amount', direction: Sort.Asc },
      },
    };
    expect(parseDealsParams(new URLSearchParams(write(params)), viewSegment(params.view))).toEqual(params);
  });

  it('keeps the open deal when only the density changes', () => {
    // The regression that would silently break every ?deal= deep link.
    const after = write({ ...DEFAULT_PARAMS, deal: 'c-3', density: 'compact' });
    expect(parseDealsParams(new URLSearchParams(after)).deal).toBe('c-3');
  });

  it('clears a key when its value returns to the default', () => {
    expect(write(DEFAULT_PARAMS, 'view=table&density=compact&q=kaya')).toBe('');
  });

  it('takes the view from the path, and reads a stale one out of the query once', () => {
    expect(parse('', 'table').view).toBe('table');
    expect(parse('view=table').view).toBe('table');
    /* The path wins, and the stale key never survives a write. */
    expect(parse('view=forecast', 'table').view).toBe('table');
    expect(write({ ...DEFAULT_PARAMS, view: 'table' }, 'view=forecast')).toBe('');
    expect(viewSegment('table')).toBe('table');
    expect(viewSegment('board')).toBe('');
  });

  it('leaves params belonging to the shell alone', () => {
    expect(write(DEFAULT_PARAMS, 'tab=other')).toBe('tab=other');
  });
});

describe('assignee in the URL', () => {
  it('round-trips a person as u:<UserAccountID>', () => {
    const written = write({
      ...DEFAULT_PARAMS,
      filter: { ...EMPTY_FILTER, assignee: 'u:u-2' },
    });
    expect(written).toBe('assignee=u%3Au-2');
    expect(parseDealsParams(new URLSearchParams(written)).filter.assignee).toBe('u:u-2');
  });

  it('accepts any id shape — the API owns what a UserAccountID looks like', () => {
    expect(parse('assignee=u:000000000000000000000001').filter.assignee).toBe('u:000000000000000000000001');
  });

  it('falls back on a malformed person key rather than filtering by nothing', () => {
    expect(parse('assignee=u:').filter.assignee).toBe('Any');
    expect(parse('assignee=u').filter.assignee).toBe('Any');
  });

  it('writes the AI preset as "ai"', () => {
    expect(write({ ...DEFAULT_PARAMS, filter: { ...EMPTY_FILTER, assignee: 'FuelyAI' } })).toBe('assignee=ai');
    expect(parse('assignee=ai').filter.assignee).toBe('FuelyAI');
  });
});
