import { describe, expect, it } from 'vitest';
import { EVENT_TONES, EVENT_TONE_COUNT, assignTones, eventToneFor, isEventTone } from './eventPalette';

describe('eventPalette', () => {
  it('has eight tones', () => {
    expect(EVENT_TONE_COUNT).toBe(8);
    expect(EVENT_TONES).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('eventToneFor is deterministic and inside 1..8', () => {
    for (const key of ['', 'haircut', 'massage', 'sp-1', 'sp-2', 'a very long specialist identifier']) {
      const tone = eventToneFor(key);
      expect(isEventTone(tone)).toBe(true);
      expect(eventToneFor(key)).toBe(tone);
    }
    expect(eventToneFor('')).toBe(1);
  });

  it('spreads different keys over more than one tone', () => {
    const tones = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(eventToneFor));
    expect(tones.size).toBeGreaterThan(3);
  });

  it('assignTones cycles in order and keeps a duplicate’s first tone', () => {
    const tones = assignTones(['alex', 'maria', 'sam', 'dana', 'e', 'f', 'g', 'h', 'ninth', 'alex']);
    expect(tones.get('alex')).toBe(1);
    expect(tones.get('maria')).toBe(2);
    expect(tones.get('h')).toBe(8);
    expect(tones.get('ninth')).toBe(1);
    expect(tones.size).toBe(9);
    expect(assignTones([])).toEqual(new Map());
  });

  it('isEventTone rejects everything outside', () => {
    expect(isEventTone(0)).toBe(false);
    expect(isEventTone(9)).toBe(false);
    expect(isEventTone(2.5)).toBe(false);
    expect(isEventTone('3')).toBe(false);
  });
});
