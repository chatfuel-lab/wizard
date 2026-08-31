#!/usr/bin/env node
/**
 * Print one version's section of the wizard changelog, for a GitHub Release body.
 *
 * The changelog is hand-written and is the only description of a release we have;
 * generating notes from commit subjects instead would publish a worse version of
 * something that already exists. So the release workflow reads this, and a tag
 * whose version has no section fails the release rather than publishing an empty
 * one - a missing entry is an author's oversight, not a release with nothing in it.
 *
 *   node scripts/release-notes.ts 0.2.0
 *
 * The parser lives with the wizard because `chatfuel-wizard update` reads the
 * same changelog by version range, and two readers of one file have to agree on
 * what a section is.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseNotes } from '../packages/wizard/src/releaseNotes.ts';

const CHANGELOG = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'packages', 'wizard', 'CHANGELOG.md');

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const version = process.argv[2]?.replace(/^v/, '');
  if (version === undefined || version === '') {
    console.error('usage: node scripts/release-notes.ts <version>');
    process.exit(2);
  }
  const notes = releaseNotes(version, readFileSync(CHANGELOG, 'utf8'));
  if (notes === null) {
    console.error(`No changelog section for ${version} in packages/wizard/CHANGELOG.md.`);
    process.exit(1);
  }
  console.log(notes);
}
