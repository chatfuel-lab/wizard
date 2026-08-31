import { describe, expect, it } from 'vitest';
import { CAPTION_MAX } from './constants';
import { captionLength, captionStats, clampCaption, hashtagsIn } from './caption';

describe('hashtagsIn', () => {
  it('finds a plain tag', () => {
    expect(hashtagsIn('Morning roast #coffee')).toEqual(['coffee']);
  });

  it('reads a run of tags with no spaces as several tags', () => {
    expect(hashtagsIn('#one#two#three')).toEqual(['one', 'two', 'three']);
  });

  it('ignores a hash in the middle of a word', () => {
    expect(hashtagsIn('C#, F# and a#b')).toEqual([]);
  });

  it('takes a tag after punctuation', () => {
    expect(hashtagsIn('New bags!#coffee (#roasting)')).toEqual(['coffee', 'roasting']);
  });

  it('refuses a tag made only of digits', () => {
    expect(hashtagsIn('#2024 #v2 #99')).toEqual(['v2']);
  });

  it('counts one tag once however it is cased', () => {
    expect(hashtagsIn('#Coffee #coffee #COFFEE')).toEqual(['Coffee']);
  });

  it('takes underscores and letters from any alphabet', () => {
    expect(hashtagsIn('#slow_bar #café')).toEqual(['slow_bar', 'café']);
  });

  it('ignores a lone hash and a doubled one', () => {
    expect(hashtagsIn('# ## #')).toEqual([]);
    expect(hashtagsIn('##tag')).toEqual(['tag']);
  });

  it('stops a tag at the first character it cannot hold', () => {
    expect(hashtagsIn('#coffee, #beans.')).toEqual(['coffee', 'beans']);
    expect(hashtagsIn('#coffee-beans')).toEqual(['coffee']);
  });

  it('finds nothing in an empty caption', () => {
    expect(hashtagsIn('')).toEqual([]);
  });

  it('reads a tag at the very start', () => {
    expect(hashtagsIn('#first and then some words')).toEqual(['first']);
  });

  it('reads a tag over a line break', () => {
    expect(hashtagsIn('Two rooms.\n#coffee\n#beans')).toEqual(['coffee', 'beans']);
  });
});

describe('captionLength', () => {
  it('counts plain characters one for one', () => {
    expect(captionLength('hello')).toBe(5);
  });

  /* The measured rule: 2200 emoji are accepted and 2201 are refused, so the
     server is counting codepoints. `.length` would say 4400 for the first. */
  it('counts an emoji as one character, not two', () => {
    expect(captionLength('👋')).toBe(1);
    expect('👋'.length).toBe(2);
  });

  it('accepts a caption of the ceiling in emoji', () => {
    const legal = '👋'.repeat(CAPTION_MAX);
    expect(captionLength(legal)).toBe(CAPTION_MAX);
    expect(captionLength(`${legal}👋`)).toBe(CAPTION_MAX + 1);
  });

  it('counts an empty caption as nothing', () => {
    expect(captionLength('')).toBe(0);
  });
});

describe('clampCaption', () => {
  it('leaves a caption inside the ceiling alone', () => {
    expect(clampCaption('hello', 10)).toBe('hello');
  });

  it('cuts on a codepoint, never inside one', () => {
    expect(clampCaption('👋👋👋', 2)).toBe('👋👋');
  });
});

describe('captionStats', () => {
  it('measures the caption in codepoints', () => {
    expect(captionStats('hello').length).toBe(5);
    expect(captionStats('👋👋').length).toBe(2);
  });

  it('reports what is left, and when it has run out', () => {
    expect(captionStats('hello').remaining).toBe(CAPTION_MAX - 5);
    expect(captionStats('x'.repeat(CAPTION_MAX)).overLength).toBe(false);
    expect(captionStats('x'.repeat(CAPTION_MAX + 1)).overLength).toBe(true);
    expect(captionStats('👋'.repeat(CAPTION_MAX)).overLength).toBe(false);
  });

  it('reports the tag count', () => {
    const stats = captionStats('#a #b #c');
    expect(stats.count).toBe(3);
    expect(stats.overHashtagLimit).toBe(false);
  });

  it('turns over the limit only past it, never at it', () => {
    const at = Array.from({ length: 30 }, (_, i) => `#tag${i}a`).join(' ');
    expect(captionStats(at).count).toBe(30);
    expect(captionStats(at).overHashtagLimit).toBe(false);
    expect(captionStats(`${at} #onemore`).overHashtagLimit).toBe(true);
  });

  it('takes limits of its own', () => {
    expect(captionStats('#a #b', 1).overHashtagLimit).toBe(true);
    expect(captionStats('hello', 30, 4).overLength).toBe(true);
  });
});
