/**
 * Terminal hyperlinks: a short readable name where the emulator renders one,
 * and the address itself everywhere else.
 *
 * Rolled by hand rather than taken off the registry. The two published packages
 * that do this both drag a colour detector along, this CLI is run through `npx`
 * so every dependency is install latency on somebody's first minute, and the
 * colour detector already in the tree enables itself on continuous integration
 * and on Windows unconditionally — the right default for colour and exactly
 * backwards for an escape that prints as garbage where it is not understood.
 *
 * Both functions read the environment per call. A decision taken once at module
 * load cannot be flipped by a test, and the run reads it in one place anyway.
 */

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

/**
 * Emulators known to render OSC 8, by the name they announce themselves under.
 *
 * An allowlist, never a denylist, and that asymmetry is the whole design: an
 * emulator nobody has checked prints the raw address, which is merely long,
 * while a wrong guess prints the escape as literal bytes and loses the address
 * with it. Terminal.app is absent because it does not render the escape — not
 * listed anywhere as refused, simply never added.
 */
const KNOWN_GOOD: ReadonlySet<string> = new Set(['iTerm.app', 'WezTerm', 'Hyper', 'ghostty', 'vscode']);

/** The emulator version below which the escape is not understood. */
const MIN_EMULATOR_VERSION = 5000;

/**
 * Anything a terminal would read as a command rather than as text.
 *
 * Both control ranges, not just the low one: 0x9b is what a terminal in an
 * eight-bit mode reads as the control-sequence introducer — the single
 * character form of `ESC [` — and its neighbours in 0x80-0x9f are the rest of
 * that family, string terminator among them. A check that stopped at 0x7f
 * would let exactly the byte this guard exists for through.
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Whether this terminal renders OSC 8 hyperlinks.
 *
 * Exported for the tests, which is also why the environment, the stream and the
 * platform are arguments: they are what every rule below reads, and a test that
 * has to reach into `process` to move one is a test that changes the process.
 * The platform is one of them — the rule that keeps the escape off a Windows
 * console is the one rule that cannot be exercised at all on the machine this
 * suite is usually run on.
 *
 * The common multiplexer is deliberately not excluded by name. A recent one
 * passes the escape through, and an older one shows the plain label with no
 * link attached — degraded, but not garbled — and the forcing variable is there
 * for anyone who disagrees about their own.
 */
export function hyperlinksEnabled(
  env: NodeJS.ProcessEnv = process.env,
  stream?: NodeJS.WriteStream,
  platform: NodeJS.Platform = process.platform,
): boolean {
  // First, before every other rule: it is the answer for the person whose
  // terminal this detector is wrong about, in either direction.
  const forced = env.FORCE_HYPERLINK;
  if (forced !== undefined && forced !== '') return !(forced === '0' || forced.toLowerCase() === 'false');

  // Somebody who refused colour refused escapes; `dumb` says the same thing.
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  const term = env.TERM ?? '';
  if (term === 'dumb') return false;

  // A pipe, a log file, or a build runner: nothing there renders anything, and
  // the escape would be written into whatever is reading instead.
  const out = stream ?? process.stdout;
  if (!out?.isTTY) return false;
  if (env.CI !== undefined && env.CI !== '') return false;

  // The old multiplexer's own terminal type. Not the multiplexer running under
  // a modern emulator — that one reports the emulator's TERM.
  if (term.startsWith('screen')) return false;

  if (env.WT_SESSION) return true;
  // Every other console on Windows: the escape arrives as text.
  if (platform === 'win32') return false;

  if (KNOWN_GOOD.has(env.TERM_PROGRAM ?? '')) return true;
  if (/kitty|alacritty/.test(term)) return true;
  const version = Number.parseInt(env.VTE_VERSION ?? '', 10);
  return Number.isFinite(version) && version >= MIN_EMULATOR_VERSION;
}

/**
 * `url` wrapped in an OSC 8 pair, so the terminal shows `label` and opens `url`.
 * Returns `url` untouched wherever that cannot work, so a caller comparing the
 * two knows whether a name was printed instead of an address.
 *
 * Bell-terminated rather than the string terminator the specification prefers:
 * bell is what emulators actually implement and what other tools emit, and a
 * bare string terminator is the form most likely to be swallowed by something
 * in between. Both measure as the label's width in the routines the prompt
 * library frames its boxes with, so a note holding one stays aligned.
 *
 * The address is refused for the reason the browser opener refuses one: it is
 * the server's string and not this process's. A scheme that is not https is not
 * a browser, and a control character inside the address would close this escape
 * and let the rest of the string speak to the terminal on its own account.
 *
 * What goes between the two halves is the PARSED address, not the string that
 * arrived: the URL parser percent-encodes anything a terminal could act on, so
 * the escape carries a form that cannot close itself. The refusal above stands
 * in front of it rather than behind it — an address holding a control character
 * is not one to dress up as a name, whatever it would encode to — and a caller
 * that gets its own string back knows an address went out instead of a label.
 */
export function link(url: string, label: string = url): string {
  if (!hyperlinksEnabled()) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== 'https:') return url;
  if (hasControlCharacter(url)) return url;
  return `${ESC}]8;;${parsed.href}${BEL}${label}${ESC}]8;;${BEL}`;
}
