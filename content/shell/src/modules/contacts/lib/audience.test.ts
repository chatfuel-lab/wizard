import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType, Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import type { CatalogEntry } from '../hooks/useAttributeCatalog';
import {
  channelRows,
  fieldCoverage,
  formatCount,
  formatShare,
  ownerRows,
  restrictionGap,
  shareOf,
  shareOfMax,
  stageRows,
  sumStages,
} from './audience';

const entry = (patch: Partial<CatalogEntry> & { name: string }): CatalogEntry => ({
  type: AttributeType.Custom,
  dataType: AttributeDataType.String,
  usersCount: 0,
  defaultValue: null,
  flowsCount: 0,
  aliases: [],
  ...patch,
});

describe('arithmetic that must never produce NaN', () => {
  it('never divides by zero', () => {
    expect(shareOf(5, 0)).toBe(0);
    expect(shareOf(0, 0)).toBe(0);
    expect(Number.isNaN(shareOf(1, 0))).toBe(false);
  });

  it('clamps a share into 0..1 so a bar cannot overflow its track', () => {
    expect(shareOf(120, 100)).toBe(1);
    expect(shareOf(-4, 100)).toBe(0);
  });

  it('survives a count the server did not return as a number', () => {
    expect(shareOf(Number.NaN, 10)).toBe(0);
    expect(shareOf(10, Number.NaN)).toBe(0);
  });

  it('scales a bar against the biggest row, and against nothing when all are zero', () => {
    const rows = [{ count: 10 }, { count: 5 }, { count: 0 }];
    expect(shareOfMax(10, rows)).toBe(1);
    expect(shareOfMax(5, rows)).toBe(0.5);
    expect(shareOfMax(0, [{ count: 0 }])).toBe(0);
  });

  it('prints an unknown as an em dash and a sliver as <1%', () => {
    expect(formatShare(null)).toBe('—');
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(0.0004)).toBe('<1%');
    expect(formatShare(0.5)).toBe('50%');
    expect(formatCount(null)).toBe('—');
  });
});

describe('the restriction gap', () => {
  it('is the contacts that exist but this role cannot open', () => {
    expect(restrictionGap({ visible: 44, total: 67 })).toBe(23);
  });

  it('never goes negative when the two counts disagree the other way', () => {
    expect(restrictionGap({ visible: 70, total: 67 })).toBe(0);
  });
});

describe('channels', () => {
  const counts = new Map([
    [Platform.Whatsapp, 40],
    [Platform.Instagram, 20],
    [Platform.Tiktok, 0],
  ]);

  it('ranks the channels and keeps the empty ones', () => {
    const rows = channelRows(counts, 67);
    expect(rows.map((row) => row.platform)).toEqual([Platform.Whatsapp, Platform.Instagram, Platform.Tiktok]);
    expect(rows[2].count).toBe(0);
  });

  it('labels a channel rather than leaking the enum', () => {
    expect(channelRows(counts, 67)[0].label).toBe('WhatsApp');
  });
});

describe('stages', () => {
  const totals = { New: 10, Sorting: 4, Ready: 3, WorkingOn: 2, Won: 1, Lost: 0 } as Record<SalesStageV2, number>;

  it('keeps pipeline order rather than ranking by size', () => {
    expect(stageRows(totals).map((row) => row.stage)).toEqual([
      SalesStageV2.New,
      SalesStageV2.Sorting,
      SalesStageV2.Ready,
      SalesStageV2.WorkingOn,
      SalesStageV2.Won,
      SalesStageV2.Lost,
    ]);
  });

  it('takes its share against the staged contacts, not the address book', () => {
    const rows = stageRows(totals);
    expect(sumStages(rows)).toBe(20);
    expect(rows[0].share).toBeCloseTo(0.5);
  });

  it('is empty, not zeroed, when the query failed', () => {
    expect(stageRows(null)).toEqual([]);
  });
});

describe('conversations', () => {
  it('ranks owners and drops the ones nothing was counted for', () => {
    const rows = ownerRows(
      [
        { userId: 'u1', name: 'Mira' },
        { userId: 'u2', name: 'Sam' },
        { userId: 'u3', name: 'Never counted' },
      ],
      new Map([
        ['u1', 4],
        ['u2', 9],
      ]),
      44,
    );
    expect(rows.map((row) => row.name)).toEqual(['Sam', 'Mira']);
    expect(rows[0].share).toBeCloseTo(9 / 44);
  });
});

describe('field completeness', () => {
  const catalog = [
    entry({ name: 'city', usersCount: 40 }),
    entry({ name: 'company', usersCount: 12 }),
    entry({ name: 'churn risk', usersCount: null }),
    entry({ name: 'plan', usersCount: 67, defaultValue: 'free' }),
    entry({ name: 'last seen', type: AttributeType.System, usersCount: 67 }),
  ];

  it('ranks by how many contacts carry the field', () => {
    expect(fieldCoverage(catalog, 67).rows.map((row) => row.name)).toEqual(['last seen', 'plan', 'city', 'company']);
  });

  it('excludes an uncounted field rather than drawing it as an empty bar', () => {
    const coverage = fieldCoverage(catalog, 67);
    expect(coverage.rows.some((row) => row.name === 'churn risk')).toBe(false);
    expect(coverage.uncounted).toBe(1);
  });

  it('can be narrowed to the fields this bot invented', () => {
    expect(fieldCoverage(catalog, 67, { customOnly: true }).rows.map((row) => row.name)).not.toContain('last seen');
  });

  it('never divides by a zero address book', () => {
    expect(fieldCoverage(catalog, 0).rows.every((row) => row.share === 0)).toBe(true);
  });
});
