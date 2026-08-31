import { describe, expect, it } from 'vitest';
import { formatFileSize } from './fileSize';

describe('formatFileSize', () => {
  it('is decimal, like every file dialog and every documented limit', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(999)).toBe('999 B');
    expect(formatFileSize(1_000)).toBe('1.0 kB');
    expect(formatFileSize(1_500_000)).toBe('1.5 MB');
    expect(formatFileSize(12_000_000)).toBe('12 MB');
    expect(formatFileSize(50_000_000)).toBe('50 MB');
  });

  it('says nothing rather than NaN', () => {
    expect(formatFileSize(Number.NaN)).toBe('');
    expect(formatFileSize(-1)).toBe('');
  });
});
