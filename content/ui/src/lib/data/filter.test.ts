import { describe, expect, it } from 'vitest';
import { filterAcross, filterItems, highlightRanges, matchRanges, matchScore, type FilterText } from './filter';

describe('matchRanges', () => {
  it('returns one range for a contiguous, case-insensitive hit', () => {
    expect(matchRanges('Working on', 'ORK')).toEqual([{ start: 1, end: 4 }]);
  });

  it('falls back to a subsequence and merges the adjacent parts', () => {
    /* 'wo' is contiguous inside 'Won', 'n' follows it — one merged range. */
    expect(matchRanges('Won deals', 'won')).toEqual([{ start: 0, end: 3 }]);
    expect(matchRanges('Won deals', 'wds')).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 5 },
      { start: 8, end: 9 },
    ]);
  });

  it('is null when a character is missing', () => {
    expect(matchRanges('Won', 'wonz')).toBeNull();
  });

  it('treats an empty query as a match with nothing highlighted', () => {
    expect(matchRanges('Won', '')).toEqual([]);
  });

  it('does not reuse a character already consumed', () => {
    expect(matchRanges('abc', 'aa')).toBeNull();
  });
});

describe('matchScore ordering', () => {
  const rank = (query: string, ...texts: string[]) =>
    [...texts].sort((a, b) => matchScore(b, query) - matchScore(a, query));

  it('puts a prefix above a word start above a mid-word hit above a subsequence', () => {
    expect(rank('re', 'Ready', 'Not ready', 'Unrelated', 'Rich engine')).toEqual([
      'Ready',
      'Not ready',
      'Unrelated',
      'Rich engine',
    ]);
  });

  it('breaks ties by the shorter text', () => {
    expect(rank('new', 'New', 'New from webhook')).toEqual(['New', 'New from webhook']);
  });

  it('reports -1 for no match, 0 for an empty query', () => {
    expect(matchScore('Won', 'zzz')).toBe(-1);
    expect(matchScore('Won', '')).toBe(0);
  });
});

interface Command {
  label: string;
  keywords: string[];
}

const COMMANDS: Command[] = [
  { label: 'Move to Won', keywords: ['stage', 'close'] },
  { label: 'Assign to me', keywords: ['owner'] },
  { label: 'Open contact', keywords: ['profile'] },
];

const texts = (command: Command) => [command.label, ...command.keywords];

describe('filterItems', () => {
  it('drops non-matches and ranks the rest', () => {
    const results = filterItems(COMMANDS, 'won', texts);
    expect(results.map((r) => r.item.label)).toEqual(['Move to Won']);
  });

  it('matches on a keyword and says which text won', () => {
    const [result] = filterItems(COMMANDS, 'owner', texts);
    expect(result!.item.label).toBe('Assign to me');
    expect(result!.index).toBe(1);
  });

  it('prefers the label over a keyword when both match', () => {
    const items = [{ label: 'Close deal', keywords: ['closed'] }];
    const [result] = filterItems(items, 'close', texts);
    expect(result!.index).toBe(0);
  });

  it('keeps input order for equal scores', () => {
    const items = [
      { label: 'Alpha', keywords: [] },
      { label: 'Alpha', keywords: [] },
    ];
    const results = filterItems(items, 'alpha', texts);
    expect(results[0]!.item).toBe(items[0]);
    expect(results[1]!.item).toBe(items[1]);
  });

  it('returns everything, in order, for an empty query', () => {
    const results = filterItems(COMMANDS, '   ', texts);
    expect(results.map((r) => r.item.label)).toEqual(COMMANDS.map((c) => c.label));
  });
});

interface PaletteItem {
  label: string;
  description?: string;
  keywords?: string[];
}

/* The palette's own shape: label, then description at half weight, then keywords. */
const paletteTexts = (item: PaletteItem): FilterText[] => [
  item.label,
  { text: item.description ?? '', weight: 0.5 },
  ...(item.keywords ?? []),
];

describe('description weight', () => {
  it('lets a label that contains the query beat a description that starts with it', () => {
    /* Old scoring: the description prefix (1000 - 25 field penalty) beat the
       label's word-start hit (800). Prose starting with the word is not a
       stronger signal than a label containing it. */
    const items: PaletteItem[] = [
      { label: 'Assign', description: 'Who handles this conversation' },
      { label: 'Route to whoever is free' },
    ];
    const results = filterItems(items, 'who', paletteTexts);
    expect(results.map((r) => r.item.label)).toEqual(['Route to whoever is free', 'Assign']);
    expect(results[1]!.index).toBe(1);
  });

  it('still finds an item by its description alone', () => {
    const items: PaletteItem[] = [{ label: 'Assign', description: 'Who handles this conversation' }];
    expect(filterItems(items, 'handles', paletteTexts)).toHaveLength(1);
  });

  it('reads a bare string, a weighted text and a list the same way', () => {
    expect(filterItems(['Won'], 'won', (t) => t)[0]!.score).toBe(
      filterItems(['Won'], 'won', (t) => ({ text: t }))[0]!.score,
    );
    expect(filterItems(['Won'], 'won', (t) => [t])[0]!.score).toBe(filterItems(['Won'], 'won', (t) => t)[0]!.score);
    expect(filterItems(['Won'], 'won', (t) => ({ text: t, weight: 0.5 }))[0]!.score).toBeLessThan(
      filterItems(['Won'], 'won', (t) => t)[0]!.score,
    );
  });
});

/* The inbox palette with a conversation open, verbatim from
   `livechat/lib/inboxCommands.ts`: the case that was wrong. */
const INBOX_GROUPS = [
  {
    id: 'conversation',
    label: 'This conversation',
    items: [
      {
        label: 'Close to a flow',
        description: 'Hands Maria back to the bot — you pick which flow runs',
        keywords: ['finish', 'resolve', 'done', 'archive', 'bot', 'flow'],
      },
      { label: 'Take over', description: 'The bot stops answering; you do', keywords: ['human', 'start', 'reply'] },
      {
        label: 'Assign',
        description: 'To a teammate, to Fuely AI, or to nobody',
        keywords: ['owner', 'assignee', 'teammate', 'agent'],
      },
      { label: 'Show contact details', keywords: ['panel', 'person', 'note', 'attributes', 'profile'] },
    ] as PaletteItem[],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    items: [
      {
        label: 'New conversation',
        description: 'Start a thread with a contact who has not written in',
        keywords: ['create', 'start', 'compose', 'contact'],
      },
      {
        label: 'Search conversations',
        description: 'By name or phone, on the server',
        keywords: ['find', 'filter', 'name', 'phone'],
      },
      { label: 'Keyboard shortcuts', keywords: ['keys', 'help', 'cheat sheet'] },
    ] as PaletteItem[],
  },
];

describe('filterAcross', () => {
  const labels = (results: { item: PaletteItem }[]) => results.map((r) => r.item.label);

  it('puts "New conversation" first for "new" with a conversation open', () => {
    const ranked = filterAcross(INBOX_GROUPS, 'new', paletteTexts);
    expect(ranked[0]!.item.label).toBe('New conversation');
    expect(ranked[0]!.group.id).toBe('inbox');
    /* "Close to a flow" still matches — n…e…w through its description — but
       below, and by its description, not its label. */
    const close = ranked.find((entry) => entry.item.label === 'Close to a flow')!;
    expect(close.group.id).toBe('conversation');
    expect(close.index).toBe(1);
    expect(ranked.indexOf(close)).toBeGreaterThan(0);
  });

  it('is one list ranked by score, not group by group', () => {
    const ranked = filterAcross(INBOX_GROUPS, 'sho', paletteTexts);
    /* "Show contact details" is a label prefix; "Keyboard shortcuts" a label
       word start; "Search conversations" s…h…o scattered through its label;
       the last two scattered through a description at half weight. Grouped
       ranking put "Close to a flow" SECOND because it shared the leading group;
       here it goes where its score puts it — last. */
    expect(labels(ranked)).toEqual([
      'Show contact details',
      'Keyboard shortcuts',
      'Search conversations',
      'New conversation',
      'Close to a flow',
    ]);
    expect(ranked.map((entry) => entry.group.id)).toEqual(['conversation', 'inbox', 'inbox', 'inbox', 'conversation']);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1]!.score).toBeGreaterThan(ranked[i]!.score);
    }
  });

  it('keeps the author order for an empty query — group order, then item order', () => {
    const browsing = filterAcross(INBOX_GROUPS, '', paletteTexts);
    expect(labels(browsing)).toEqual([
      'Close to a flow',
      'Take over',
      'Assign',
      'Show contact details',
      'New conversation',
      'Search conversations',
      'Keyboard shortcuts',
    ]);
    expect(browsing.map((entry) => entry.group.id)).toEqual([
      'conversation',
      'conversation',
      'conversation',
      'conversation',
      'inbox',
      'inbox',
      'inbox',
    ]);
    expect(browsing.every((entry) => entry.score === 0)).toBe(true);
  });

  it('drops items with no hit, whatever their group', () => {
    const only = filterAcross(INBOX_GROUPS, 'keyboard', paletteTexts);
    expect(labels(only)).toEqual(['Keyboard shortcuts']);
    expect(only[0]!.group.id).toBe('inbox');
  });

  it('is stable between equal hits in different groups', () => {
    const groups = [
      { id: 'a', items: [{ label: 'Alpha' }] as PaletteItem[] },
      { id: 'b', items: [{ label: 'Alpha' }] as PaletteItem[] },
    ];
    expect(filterAcross(groups, 'alpha', paletteTexts).map((entry) => entry.group.id)).toEqual(['a', 'b']);
  });

  it('carries the matched text index and ranges through', () => {
    const ranked = filterAcross(INBOX_GROUPS, 'show', paletteTexts);
    expect(ranked[0]!.index).toBe(0);
    expect(ranked[0]!.ranges).toEqual([{ start: 0, end: 4 }]);
  });
});

describe('highlightRanges', () => {
  it('splits into alternating plain and matched segments', () => {
    expect(highlightRanges('Move to Won', [{ start: 8, end: 11 }])).toEqual([
      { text: 'Move to ', match: false },
      { text: 'Won', match: true },
    ]);
  });

  it('handles a match at the very start', () => {
    expect(highlightRanges('Won', [{ start: 0, end: 1 }])).toEqual([
      { text: 'W', match: true },
      { text: 'on', match: false },
    ]);
  });

  it('returns the whole string unmatched when there are no ranges', () => {
    expect(highlightRanges('Won', [])).toEqual([{ text: 'Won', match: false }]);
  });

  it('round-trips the original text', () => {
    const text = 'Move to Won';
    const ranges = matchRanges(text, 'mtw')!;
    expect(
      highlightRanges(text, ranges)
        .map((s) => s.text)
        .join(''),
    ).toBe(text);
  });
});
