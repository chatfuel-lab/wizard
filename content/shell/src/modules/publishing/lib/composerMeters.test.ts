import { describe, expect, it } from 'vitest';
import { captionMeters } from './composerMeters';

describe('what the composer toolbar counts', () => {
  it('carries the length on its own when there are no hashtags', () => {
    expect(captionMeters('Bags landed')).toEqual([{ id: 'length', text: '11', tone: 'quiet' }]);
  });

  it('carries the length on an empty caption, so the strip does not change shape', () => {
    expect(captionMeters('')).toEqual([{ id: 'length', text: '0', tone: 'quiet' }]);
  });

  it('says nothing about hashtags until there is one', () => {
    expect(captionMeters('two words').map((meter) => meter.id)).toEqual(['length']);
    expect(captionMeters('#one').map((meter) => meter.id)).toEqual(['hashtags', 'length']);
  });

  it('counts codepoints, so an emoji is one character and not two', () => {
    expect(captionMeters('👋👋')[0]).toEqual({ id: 'length', text: '2', tone: 'quiet' });
  });

  it('turns the length danger past the ceiling and not before it', () => {
    expect(captionMeters('a'.repeat(2200))[0]?.tone).toBe('quiet');
    expect(captionMeters('a'.repeat(2201))[0]?.tone).toBe('danger');
  });

  it('turns the hashtags warning past the ceiling — the post still publishes', () => {
    const tags = (count: number) => Array.from({ length: count }, (_, i) => `#tag${i}`).join(' ');
    expect(captionMeters(tags(30))[0]).toEqual({ id: 'hashtags', text: '# 30', tone: 'quiet' });
    expect(captionMeters(tags(31))[0]).toEqual({ id: 'hashtags', text: '# 31', tone: 'warning' });
  });

  it('puts the hashtags first, so the two never swap places as one appears', () => {
    expect(captionMeters('#one two').map((meter) => meter.id)).toEqual(['hashtags', 'length']);
  });
});
