/** Terminal art for the wizard. ANSI 256-color, box-drawing only — no image deps. */

const RESET = '[0m';
const color = (n: number, text: string) => `[38;5;${n}m${text}${RESET}`;

// Cyan → violet gradient, one shade per banner line.
const GRADIENT = [51, 45, 39, 69, 105, 141];

const WORDMARK = [
  ' ██████╗██╗  ██╗ █████╗ ████████╗███████╗██╗   ██╗███████╗██╗     ',
  '██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔════╝██║   ██║██╔════╝██║     ',
  '██║     ███████║███████║   ██║   █████╗  ██║   ██║█████╗  ██║     ',
  '██║     ██╔══██║██╔══██║   ██║   ██╔══╝  ██║   ██║██╔══╝  ██║     ',
  '╚██████╗██║  ██║██║  ██║   ██║   ██║     ╚██████╔╝███████╗███████╗',
  ' ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚══════╝',
];

const BOT = [
  '      ▄▄▄▄▄▄▄      ╭──────────────────────────────╮',
  '     ▐ ◉   ◉ ▌     │  Hi! Let me build you a      │',
  '     ▐   ▽   ▌ ◁───│  working Chatfuel app.       │',
  '      ▀▀█▀█▀▀      ╰──────────────────────────────╯',
  '     ▄▄▀▀▀▀▀▄▄',
];

export function banner(): string {
  const wordmark = WORDMARK.map((line, i) => color(GRADIENT[i] ?? 141, line)).join('\n');
  const bot = BOT.map((line, i) => color(i < 2 ? 45 : 39, line)).join('\n');
  return `\n${wordmark}\n${color(141, '                                w i z a r d')}\n\n${bot}\n`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Line-by-line banner reveal — the animated variant of banner(). */
export async function printBanner(animated: boolean): Promise<void> {
  if (!animated) {
    console.log(banner());
    return;
  }
  console.log('');
  for (const [i, line] of WORDMARK.entries()) {
    console.log(color(GRADIENT[i] ?? 141, line));
    await sleep(55);
  }
  console.log(color(141, '                                w i z a r d'));
  await sleep(120);
  console.log('');
  for (const [i, line] of BOT.entries()) {
    console.log(color(i < 2 ? 45 : 39, line));
    await sleep(45);
  }
  console.log('');
}

// Browser window about to open — the outro sits right above the "start the
// dev server and open your browser?" confirm, so the art points at it.
const BROWSER = [
  ' ╭───────────────────────────────╮',
  ' │ ● ● ●   localhost:5173        │',
  ' ├───────────────────────────────┤',
  ' │                               │',
  ' │   ▸▸▸  your own AI platform   │',
  ' │        is about to unfold —   │',
  ' │   one Enter away              │',
  ' │                               │',
  ' ╰───────────────────────────────╯',
];

export function outroArt(): string {
  return BROWSER.map((line, i) => color(GRADIENT[Math.min(i, GRADIENT.length - 1)] ?? 45, line)).join('\n');
}

/** Small per-step vignettes — one visual beat per wizard phase. */
export type StepArtKey =
  'modules' | 'token' | 'workspace' | 'trial' | 'auth' | 'scaffold' | 'deploy' | 'github' | 'handoff' | 'launch';

const STEP_ART: Record<StepArtKey, Array<[shade: number, line: string]>> = {
  modules: [
    [51, '▛▀▀▜ ▛▀▀▜ ▛▀▀▜'],
    [45, '▌ ▪▐ ▌ ▪▐ ▌ ▪▐   pick your building blocks'],
    [39, '▙▄▄▟ ▙▄▄▟ ▙▄▄▟'],
  ],
  token: [
    [51, ' ╭─────╮'],
    [45, ' │  ◯  ├───────╼   one key opens everything'],
    [39, ' ╰─────╯'],
  ],
  workspace: [
    [45, '  ┌───┬───┬───┐'],
    [39, '  │ ▪ │ ▪ │ ▪ │   which workspace holds your bots?'],
    [69, '  └───┴───┴───┘'],
  ],
  trial: [
    [45, '   ╭───────╮'],
    [39, '   │ ▸ ▸ ▸ ├───╮   switch the AI on'],
    [69, '   ╰───────╯'],
  ],
  auth: [
    [83, '   ╭─────╮'],
    [77, '   │ ◉ ◉ │╾──╼   who gets in? your own sign-in'],
    [71, '   ╰──┬──╯'],
  ],
  scaffold: [
    [51, '      ┌──╼'],
    [45, '      │  ▪       pouring the foundation…'],
    [39, '    ▟█▙'],
    [69, '  ▟█████▙'],
  ],
  deploy: [
    [51, '        ▲'],
    [45, '       ╱│╲       up it goes'],
    [39, '      ▔▔▔▔▔'],
  ],
  github: [
    [51, '   ●──●──●'],
    [45, '   │  ╲  │      every version, kept'],
    [39, '   ●──●──●'],
  ],
  handoff: [
    [141, '   ✦  ·  ✧'],
    [105, ' ·   ✦    ·      your AI pair is ready'],
    [69, '   ✧  ·  ✦'],
  ],
  launch: [
    [51, ' ┌─────────────────┐'],
    [45, ' │ ▸ localhost:5173│    the wow moment'],
    [39, ' └─────────────────┘'],
  ],
};

export function stepArt(key: StepArtKey): string {
  return STEP_ART[key].map(([shade, line]) => color(shade, line)).join('\n');
}
