import { describe, expect, it } from 'vitest';
import { DEFAULT_LOGO_FILE, logoUrl } from './brand';

describe('logoUrl', () => {
  it('falls back to the shipped mark', () => {
    expect(logoUrl(undefined, '/')).toBe(`/${DEFAULT_LOGO_FILE}`);
    expect(logoUrl('  ', '/')).toBe(`/${DEFAULT_LOGO_FILE}`);
  });

  it('resolves a bare file name against the base path', () => {
    expect(logoUrl('logo.png', '/')).toBe('/logo.png');
    expect(logoUrl('logo.png', '/app/')).toBe('/app/logo.png');
    expect(logoUrl('logo.png', '/app')).toBe('/app/logo.png');
  });

  it('passes an absolute path or URL through', () => {
    expect(logoUrl('/brand/mark.svg', '/app/')).toBe('/brand/mark.svg');
    expect(logoUrl('https://example.com/mark.svg', '/app/')).toBe('https://example.com/mark.svg');
    expect(logoUrl('//example.com/mark.svg', '/app/')).toBe('//example.com/mark.svg');
  });
});
