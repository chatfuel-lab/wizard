import type { Readable, Writable } from 'node:stream';
import { Prompt, type State } from '@clack/core';
import pc from 'picocolors';

/**
 * A checkbox list where enter is the only key that does anything: it checks and
 * unchecks the row under the cursor, and the Continue row at the bottom ends the
 * step. Space keeps toggling too, for the people who already have that habit.
 *
 * The standard multi-select toggles on space and submits on enter, which people
 * do not discover: they arrow to what they want, press enter, and leave with an
 * empty selection.
 *
 * The frame below is deliberately the same shape as the other prompts in this
 * wizard - same bars, symbols and checkboxes - so a step does not look like it
 * came from somewhere else. The glyph table and the sliding window are ported
 * from those prompts, which export neither.
 */

// Ported from is-unicode-supported (MIT): boxes and bars are unreadable on the
// terminals this returns false for.
function unicodeSupported(): boolean {
  const { env } = process;
  const { TERM, TERM_PROGRAM } = env;
  if (process.platform !== 'win32') return TERM !== 'linux';
  return (
    Boolean(env.WT_SESSION) ||
    Boolean(env.TERMINUS_SUBLIME) ||
    env.ConEmuTask === '{cmd::Cmder}' ||
    TERM_PROGRAM === 'Terminus-Sublime' ||
    TERM_PROGRAM === 'vscode' ||
    TERM === 'xterm-256color' ||
    TERM === 'alacritty' ||
    TERM === 'rxvt-unicode' ||
    TERM === 'rxvt-unicode-256color' ||
    env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  );
}

const unicode = unicodeSupported();
const s = (glyph: string, fallback: string) => (unicode ? glyph : fallback);

const S_STEP_ACTIVE = s('◆', '*');
const S_STEP_CANCEL = s('■', 'x');
const S_STEP_ERROR = s('▲', 'x');
const S_STEP_SUBMIT = s('◇', 'o');
const S_BAR = s('│', '|');
const S_BAR_END = s('└', '—');
const S_CHECKBOX_ACTIVE = s('◻', '[•]');
const S_CHECKBOX_SELECTED = s('◼', '[+]');
const S_CHECKBOX_INACTIVE = s('◻', '[ ]');
const S_POINTER = s('▸', '>');

function symbol(state: State): string {
  switch (state) {
    case 'cancel':
      return pc.red(S_STEP_CANCEL);
    case 'error':
      return pc.yellow(S_STEP_ERROR);
    case 'submit':
      return pc.green(S_STEP_SUBMIT);
    default:
      return pc.cyan(S_STEP_ACTIVE);
  }
}

/**
 * Returned by validate() when enter lands on an option row. The base prompt has
 * no other way to say "do not submit this"; a validation message is the veto.
 * It is never shown - the frame recognises it and renders as if nothing failed.
 */
const VETO = ' checklist:toggle';

export interface ChecklistOption<T> {
  value: T;
  label: string;
  hint?: string;
}

export interface ChecklistOptions<T> {
  message: string;
  options: ChecklistOption<T>[];
  initialValues?: T[];
  /** Continue refuses while nothing is checked. Default true. */
  required?: boolean;
  maxItems?: number;
  input?: Readable;
  output?: Writable;
}

class ChecklistPrompt<T> extends Prompt<T[]> {
  readonly options: ChecklistOption<T>[];
  readonly message: string;
  readonly required: boolean;
  readonly maxItems: number | undefined;
  /** options.length is the Continue row. */
  cursor = 0;
  /** Indexes into options, so the values themselves need not be comparable. */
  checked = new Set<number>();

  constructor(opts: ChecklistOptions<T>) {
    const holder: { self?: ChecklistPrompt<T> } = {};
    super(
      {
        render: () => holder.self!.frame(),
        validate: () => holder.self!.veto(),
        input: opts.input,
        output: opts.output,
      },
      false,
    );
    holder.self = this;

    this.options = opts.options;
    this.message = opts.message;
    this.required = opts.required ?? true;
    this.maxItems = opts.maxItems;

    for (const initial of opts.initialValues ?? []) {
      const index = this.options.findIndex((o) => o.value === initial);
      if (index >= 0) this.checked.add(index);
    }

    this.on('cursor', (action) => {
      if (action === 'up' || action === 'left') this.cursor = Math.max(0, this.cursor - 1);
      if (action === 'down' || action === 'right') {
        this.cursor = Math.min(this.options.length, this.cursor + 1);
      }
    });

    // The base emits 'key' before it acts on enter, so the toggle lands first
    // and the veto below decides whether that same enter also ends the step.
    this.on('key', (char) => {
      if (char !== '\r' && char !== ' ') return;
      if (this.cursor >= this.options.length) return;
      if (this.checked.has(this.cursor)) this.checked.delete(this.cursor);
      else this.checked.add(this.cursor);
    });

    this.on('finalize', () => {
      this.value = this.checkedValues();
    });
  }

  checkedValues(): T[] {
    return this.options.filter((_, i) => this.checked.has(i)).map((o) => o.value);
  }

  private veto(): string | undefined {
    if (this.cursor < this.options.length) return VETO;
    if (this.required && this.checked.size === 0) return 'Pick at least one.';
    return undefined;
  }

  /**
   * The window of options around the cursor, ellipsed at whichever end is cut.
   * Six lines of the frame are not options: the two title lines, the blank bar,
   * the Continue row, the end bar, and the line the shell prints next.
   */
  private window(): { option: ChecklistOption<T>; index: number }[] {
    const fromTerminal = process.stdout.rows ? Math.max(process.stdout.rows - 6, 5) : Number.POSITIVE_INFINITY;
    const room = Math.max(Math.min(fromTerminal, this.maxItems ?? Number.POSITIVE_INFINITY), 5);
    if (room >= this.options.length) {
      return this.options.map((option, index) => ({ option, index }));
    }
    let start = 0;
    if (this.cursor >= room - 3) {
      start = Math.max(Math.min(this.cursor - room + 3, this.options.length - room), 0);
    }
    return this.options.slice(start, start + room).map((option, i) => ({ option, index: start + i }));
  }

  private optionRow(option: ChecklistOption<T>, index: number): string {
    const active = this.cursor === index;
    const checked = this.checked.has(index);
    const hint = option.hint ? ` ${pc.dim(`(${option.hint})`)}` : '';
    const box = checked
      ? pc.green(S_CHECKBOX_SELECTED)
      : active
        ? pc.cyan(S_CHECKBOX_ACTIVE)
        : pc.dim(S_CHECKBOX_INACTIVE);
    if (!active) return `${box} ${pc.dim(option.label)}${checked ? hint : ''}`;
    const key = pc.dim(checked ? 'enter to uncheck' : 'enter to check');
    return `${box} ${option.label}${hint}  ${key}`;
  }

  private continueRow(): string {
    if (this.cursor !== this.options.length) return `  ${pc.dim('Continue')}`;
    return `${pc.cyan(S_POINTER)} ${pc.bold('Continue')}  ${pc.dim('enter to continue')}`;
  }

  private frame(): string {
    // A vetoed enter is not a failure; only a real message paints the frame yellow.
    const failed = this.state === 'error' && this.error !== VETO;
    const state: State = failed ? 'error' : this.state === 'error' ? 'active' : this.state;
    const title = `${pc.gray(S_BAR)}\n${symbol(state)}  ${this.message}\n`;
    const labels = (style: (label: string) => string) =>
      this.options
        .filter((_, i) => this.checked.has(i))
        .map((o) => style(o.label))
        .join(pc.dim(', '));

    if (state === 'submit') {
      return `${title}${pc.gray(S_BAR)}  ${labels(pc.dim) || pc.dim('none')}`;
    }
    if (state === 'cancel') {
      const struck = labels((label) => pc.strikethrough(pc.dim(label)));
      return `${title}${pc.gray(S_BAR)}  ${struck.trim() ? `${struck}\n${pc.gray(S_BAR)}` : ''}`;
    }

    const bar = failed ? pc.yellow(S_BAR) : pc.cyan(S_BAR);
    const window = this.window();
    const rows = window.map(({ option, index }, i) => {
      const cutTop = i === 0 && index > 0;
      const cutBottom = i === window.length - 1 && index < this.options.length - 1;
      return cutTop || cutBottom ? pc.dim('...') : this.optionRow(option, index);
    });
    const end = failed ? `${pc.yellow(S_BAR_END)}  ${pc.yellow(this.error)}` : pc.cyan(S_BAR_END);
    const list = rows.length > 0 ? `${bar}  ${rows.join(`\n${bar}  `)}\n` : '';
    return `${title}${list}${bar}\n${bar}  ${this.continueRow()}\n${end}\n`;
  }
}

/** The checked values, or null if the person cancelled (ctrl-c, escape). */
export async function checklist<T>(opts: ChecklistOptions<T>): Promise<T[] | null> {
  const prompt = new ChecklistPrompt<T>(opts);
  const result = await prompt.prompt();
  // Cancel is matched by shape, not by symbol identity: nothing here should
  // depend on this package and the prompt library sharing one copy of it.
  if (typeof result === 'symbol') return null;
  return result ?? [];
}
