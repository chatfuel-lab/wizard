import { createRequire } from 'node:module';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hyperlinksEnabled, link } from '../src/link';

/**
 * Terminal hyperlinks: the escape a URL is wrapped in, and — the half worth
 * more — every environment where wrapping it would print garbage instead.
 *
 * A hyperlink that does not render is not a cosmetic loss. The one address the
 * wizard prints that nobody can retype is a single-use checkout session, so the
 * detector's job is to be wrong in the safe direction: an emulator that is not
 * known good gets the plain address, and the list of known-good ones is an
 * allowlist for exactly that reason.
 */

/**
 * The width routine `p.note` frames its box with. Nothing in this package
 * declares it — it arrives under the prompt library — so it is resolved
 * through the package that owns it rather than imported by name.
 */
const clackRequire = createRequire(createRequire(import.meta.url).resolve('@clack/prompts'));
const stringWidth = ((await import(clackRequire.resolve('fast-string-width'))) as { default: (s: string) => number })
  .default;

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

const URL = 'https://checkout.stripe.com/c/pay/cs_test_wizard';
const LABEL = 'Chatfuel checkout';

/** The bell-terminated OSC 8 pair, spelled out rather than built by the code under test. */
const wrapped = (url: string, label: string): string => `${ESC}]8;;${url}${BEL}${label}${ESC}]8;;${BEL}`;

/** Every variable the detector reads, so an ambient one cannot decide a case. */
const READS = ['FORCE_HYPERLINK', 'NO_COLOR', 'TERM', 'TERM_PROGRAM', 'CI', 'WT_SESSION', 'VTE_VERSION'] as const;

/** An environment that says yes on its own, for the exclusions to be subtracted from. */
const GOOD: NodeJS.ProcessEnv = { TERM: 'xterm-256color', TERM_PROGRAM: 'iTerm.app' };

/** A terminal, without touching the real stream's own property. */
const tty = { isTTY: true } as unknown as NodeJS.WriteStream;
const pipe = { isTTY: undefined } as unknown as NodeJS.WriteStream;

/** The same environment `link()` will read, since it takes no arguments for it. */
function stub(env: NodeJS.ProcessEnv): void {
  for (const name of READS) vi.stubEnv(name, env[name]);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the escape', () => {
  it('is the bell-terminated pair, with the label between the two halves', () => {
    stub({ FORCE_HYPERLINK: '1' });
    expect(link(URL, LABEL)).toBe(wrapped(URL, LABEL));
  });

  it('repeats the URL as its own label when no label is given', () => {
    stub({ FORCE_HYPERLINK: '1' });
    expect(link(URL)).toBe(wrapped(URL, URL));
  });
});

describe('the note frame', () => {
  /**
   * `p.note` pads every line to the widest one it holds. If either routine
   * counted the address rather than the label, one hyperlinked line would push
   * the box hundreds of columns wide and the whole frame would come apart.
   */
  it('measures as the label alone, in both routines', () => {
    stub({ FORCE_HYPERLINK: '1' });
    const printed = link(URL, LABEL);
    expect(stringWidth(printed)).toBe(stringWidth(LABEL));
    expect(stripVTControlCharacters(printed)).toBe(LABEL);
  });
});

/**
 * Each case names one reason to stay off, and asserts it through
 * `hyperlinksEnabled`, which takes all three of the things a rule reads.
 *
 * Each case used to assert `link()` as well. That half could not fail: `link()`
 * reads the real stdout, which is a pipe under the test runner, so it answered
 * the plain address for the stream's sake whatever the case was meant to be
 * about — every one of those assertions would have passed with the rule under
 * test deleted. That `link()` asks the detector at all is proved once, and
 * deterministically, by the forcing variable below: the same call returns the
 * escape with it on and the plain address with it off.
 */
describe('what turns it off', () => {
  const off = (env: NodeJS.ProcessEnv, stream = tty, platform: NodeJS.Platform = 'darwin'): void => {
    expect(hyperlinksEnabled(env, stream, platform)).toBe(false);
  };

  it('nothing at the other end of the stream', () => off(GOOD, pipe));
  it('a continuous-integration runner', () => off({ ...GOOD, CI: 'true' }));
  it('a terminal that says it is dumb', () => off({ ...GOOD, TERM: 'dumb' }));
  it('colour refused', () => off({ ...GOOD, NO_COLOR: '1' }));
  it('a multiplexer that may be too old to render it', () => off({ ...GOOD, TERM: 'screen.xterm-256color' }));
  // An allowlist, never a denylist: this one is off because it is not on the
  // list, and so is every emulator nobody has checked.
  it('an emulator nobody put on the list', () => off({ ...GOOD, TERM_PROGRAM: 'Apple_Terminal' }));
  /* Every console on Windows but the new terminal, where the escape arrives as
     the literal characters of itself. The allowlist would say yes to this
     environment on any other platform, which is the whole point of the rule. */
  it('a Windows console with nothing to say it is the new one', () => off(GOOD, tty, 'win32'));
});

describe('what turns it on', () => {
  const on = (env: NodeJS.ProcessEnv, platform: NodeJS.Platform = 'darwin'): void => {
    expect(hyperlinksEnabled(env, tty, platform)).toBe(true);
  };

  it('a known-good emulator', () => on({ TERM: 'xterm-256color', TERM_PROGRAM: 'WezTerm' }));
  /* On Windows, and only on the strength of `WT_SESSION`: the platform gate
     below it refuses every other console there. */
  it('the new Windows terminal', () => on({ TERM: 'xterm-256color', WT_SESSION: '0d1a…' }, 'win32'));
  it('kitty', () => on({ TERM: 'xterm-kitty' }));
  it('alacritty', () => on({ TERM: 'alacritty' }));
  it('an emulator new enough to say so', () => on({ TERM: 'xterm-256color', VTE_VERSION: '6003' }));
  it('but not one that is too old to', () => {
    expect(hyperlinksEnabled({ TERM: 'xterm-256color', VTE_VERSION: '4205' }, tty)).toBe(false);
  });
});

describe('the forcing variable', () => {
  it('beats a stream with nothing at the other end', () => {
    expect(hyperlinksEnabled({ FORCE_HYPERLINK: '1' }, pipe)).toBe(true);
    stub({ FORCE_HYPERLINK: '1' });
    expect(link(URL, LABEL)).toBe(wrapped(URL, LABEL));
  });

  it('beats a known-good emulator when it is off', () => {
    expect(hyperlinksEnabled({ ...GOOD, FORCE_HYPERLINK: '0' }, tty)).toBe(false);
    expect(hyperlinksEnabled({ ...GOOD, FORCE_HYPERLINK: 'false' }, tty)).toBe(false);
    stub({ ...GOOD, FORCE_HYPERLINK: '0' });
    expect(link(URL, LABEL)).toBe(URL);
  });
});

/**
 * The same rule the browser opener in the trial step applies before it hands
 * an address to the desktop, for the same reason: the address is the server's
 * string, not this process's.
 */
describe('what it refuses to dress up', () => {
  it('a scheme that is not https', () => {
    stub({ FORCE_HYPERLINK: '1' });
    expect(link('file:///etc/passwd', LABEL)).toBe('file:///etc/passwd');
    expect(link('file:///etc/passwd', LABEL)).not.toContain(ESC);
  });

  it('an address carrying a control character of its own', () => {
    stub({ FORCE_HYPERLINK: '1' });
    const smuggled = `https://example.test/${BEL}${ESC}]8;;https://evil.test/${BEL}`;
    expect(link(smuggled, LABEL)).toBe(smuggled);
    const newline = 'https://example.test/\nSTOLEN';
    expect(link(newline, LABEL)).toBe(newline);
  });

  /* The upper control range, which the low-range check used to walk straight
     past: 0x9b is the control-sequence introducer a terminal in an eight-bit
     mode acts on, and it survives the URL parser as a character. */
  it('an address carrying one from the upper control range', () => {
    stub({ FORCE_HYPERLINK: '1' });
    const csi = `https://example.test/${String.fromCharCode(0x9b)}2J`;
    expect(link(csi, LABEL)).toBe(csi);
    expect(link(csi, LABEL)).not.toContain(ESC);
    const del = `https://example.test/${String.fromCharCode(0x7f)}`;
    expect(link(del, LABEL)).toBe(del);
  });

  /* What goes into the escape is the parsed address rather than the string
     that arrived — the parser is what percent-encodes anything the terminal
     could act on, and here it also supplies the path a bare origin lacks. */
  it('carries the parsed address, not the string it was handed', () => {
    stub({ FORCE_HYPERLINK: '1' });
    expect(link('https://example.test', LABEL)).toBe(wrapped('https://example.test/', LABEL));
  });
});
