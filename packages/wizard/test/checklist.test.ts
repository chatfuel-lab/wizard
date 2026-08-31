import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { checklist, type ChecklistOptions } from '../src/prompts/checklist';

const DOWN = '\x1b[B';
const UP = '\x1b[A';
const ENTER = '\r';
const SPACE = ' ';
const CTRL_C = '\x03';

const OPTIONS = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'deals', label: 'Deals', hint: 'pipelines' },
  { value: 'inbox', label: 'Inbox' },
];

/**
 * Drives the prompt the way a person does: one key at a time, each one after
 * the frame the previous key produced.
 */
async function press(keys: string[], opts: Partial<ChecklistOptions<string>> = {}) {
  const input = new PassThrough();
  const output = new PassThrough();
  let frames = '';
  output.on('data', (chunk: Buffer) => {
    frames += chunk.toString();
  });
  Object.defineProperty(input, 'isTTY', { value: false, configurable: true });

  const done = checklist<string>({
    message: 'Which modules do you want?',
    options: OPTIONS,
    ...opts,
    input,
    output,
  });
  for (const key of keys) {
    input.write(key);
    await new Promise((resolve) => setImmediate(resolve));
  }
  const result = await Promise.race([
    done,
    new Promise((_, reject) => setTimeout(() => reject(new Error('prompt never ended')), 1000)),
  ]);
  return { result: result as string[] | null, frames };
}

const toContinue = (count: number) => Array.from({ length: count }, () => DOWN);

describe('checklist', () => {
  it('checks the row under the cursor on enter and continues on the Continue row', async () => {
    const { result } = await press([DOWN, ENTER, ...toContinue(2), ENTER]);
    expect(result).toEqual(['deals']);
  });

  it('unchecks on a second enter', async () => {
    const { result } = await press([ENTER, ENTER, DOWN, ENTER, ...toContinue(2), ENTER]);
    expect(result).toEqual(['deals']);
  });

  it('does not end the step when enter lands on an option', async () => {
    const { result } = await press([ENTER, ENTER, ENTER, ...toContinue(3), ENTER]);
    // Three enters on the first row: checked, unchecked, checked again.
    expect(result).toEqual(['contacts']);
  });

  it('returns the checked values in option order, whatever order they were checked in', async () => {
    const { result } = await press([...toContinue(2), ENTER, UP, UP, ENTER, ...toContinue(3), ENTER]);
    expect(result).toEqual(['contacts', 'inbox']);
  });

  it('refuses to continue with nothing checked while required', async () => {
    const { result, frames } = await press([...toContinue(3), ENTER, UP, UP, UP, ENTER, ...toContinue(3), ENTER]);
    expect(frames).toContain('Pick at least one.');
    expect(result).toEqual(['contacts']);
  });

  it('continues with nothing checked when it is not required', async () => {
    const { result } = await press([...toContinue(3), ENTER], { required: false });
    expect(result).toEqual([]);
  });

  it('starts with initialValues checked and returns them untouched', async () => {
    const { result } = await press([...toContinue(3), ENTER], {
      initialValues: ['contacts', 'inbox'],
    });
    expect(result).toEqual(['contacts', 'inbox']);
  });

  it('still toggles on space', async () => {
    const { result } = await press([SPACE, ...toContinue(3), ENTER]);
    expect(result).toEqual(['contacts']);
  });

  it('stops at the ends of the list', async () => {
    const { result } = await press([UP, UP, ENTER, ...toContinue(9), ENTER]);
    expect(result).toEqual(['contacts']);
  });

  it('returns null when cancelled', async () => {
    const { result } = await press([ENTER, CTRL_C]);
    expect(result).toBeNull();
  });

  it('names the key that acts, and only where the cursor is', async () => {
    const { frames } = await press([ENTER, ...toContinue(3), ENTER]);
    expect(frames).toContain('enter to check');
    expect(frames).toContain('enter to uncheck');
    expect(frames).toContain('enter to continue');
  });
});
