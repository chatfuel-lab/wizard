import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CODEGEN_AFTER_UPDATE, CODEGEN_COMMAND, CODEGEN_CYCLE } from '../src/codegen';

/**
 * The regeneration cycle, told the same way in every place it is told.
 *
 * A person can meet it three times — in the app's own README, in the core
 * skill's playbook, and in the output of `chatfuel-wizard update` — and only
 * the third of those is code. Two paraphrases of one procedure read like two
 * procedures, and an agent follows whichever it saw last, so the documents
 * quote the constants the CLI prints instead of describing them. This is the
 * test that says they still do.
 */
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');

/* Prose is allowed its backticks and its own line wrapping. It is not allowed
   a different sentence. */
const prose = (text: string): string => text.replaceAll('`', '').replace(/\s+/g, ' ');

const read = (at: string): string => prose(readFileSync(join(repoRoot, at), 'utf8'));

describe('the words the regeneration cycle is told in', () => {
  it.each([
    ['content/shell/README.md', CODEGEN_CYCLE],
    ['content/modules/core/skill/playbooks/customize.md', CODEGEN_CYCLE],
    ['content/skills/chatfuel-update/SKILL.md', CODEGEN_AFTER_UPDATE],
  ])('are the CLI’s own in %s', (at, steps) => {
    const text = read(at);
    for (const step of steps) expect(text, step).toContain(prose(step));
  });

  /* The app's README is the last document standing when the skills went to the
     home directory, so it is the one that has to name the command outright. */
  it('name the command in the README an app keeps', () => {
    expect(read('content/shell/README.md')).toContain(CODEGEN_COMMAND);
  });
});

/**
 * The install line is printed by the app's own script and written out in its
 * README, because a person who did not install the skills has only the README.
 * Two lists of six pinned versions drift the first time one of them is bumped.
 */
describe('the versions the toolchain is pinned to', () => {
  it('are the same in the README as in the script that prints them', () => {
    const script = readFileSync(join(repoRoot, 'content/shell/scripts/codegen.mjs'), 'utf8');
    const readme = readFileSync(join(repoRoot, 'content/shell/README.md'), 'utf8');
    const pinned = [...script.matchAll(/'((?:@[\w-]+\/)?[\w-]+@\d[\d.]*)'/g)].map((match) => match[1]!);

    expect(pinned.length).toBeGreaterThan(0);
    for (const version of pinned) expect(readme, version).toContain(version);
  });
});
