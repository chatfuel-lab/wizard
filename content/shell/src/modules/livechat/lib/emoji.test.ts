import { describe, expect, it } from 'vitest';
import { ALL_EMOJI, EMOJI_GROUPS, searchEmoji } from './emoji';

describe('the catalogue', () => {
  it('holds every character exactly once', () => {
    const chars = ALL_EMOJI.map((entry) => entry.char);
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('names every character, because the button label is the name', () => {
    for (const entry of ALL_EMOJI) expect(entry.name.trim()).not.toBe('');
  });

  it('is the flat list and the grouped one, from one source', () => {
    expect(ALL_EMOJI).toHaveLength(EMOJI_GROUPS.reduce((n, group) => n + group.emoji.length, 0));
  });
});

describe('searchEmoji', () => {
  it('finds a character by a keyword that is not its name', () => {
    expect(searchEmoji('thanks')[0]!.char).toBe('🙏');
    expect(searchEmoji('shipping').map((entry) => entry.char)).toContain('📦');
  });

  it('finds one by its name', () => {
    expect(searchEmoji('thumbs up')[0]!.char).toBe('👍');
  });

  it('answers with the whole catalogue for an empty query', () => {
    expect(searchEmoji('')).toHaveLength(ALL_EMOJI.length);
  });

  it('answers with nothing rather than everything for a miss', () => {
    expect(searchEmoji('zzzzzz')).toEqual([]);
  });
});
