import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { insideProblem } from '../src/insidePath';

let dir: string;
let root: string;
let outside: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-inside-'));
  root = join(dir, 'app');
  outside = join(dir, 'elsewhere');
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1;');
  writeFileSync(join(outside, 'secret'), 'PRIVATE KEY');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('insideProblem', () => {
  it('passes a real file, and the root itself', () => {
    expect(insideProblem(root, join(root, 'src', 'a.ts'))).toBeUndefined();
    expect(insideProblem(root, root)).toBeUndefined();
  });

  it('passes a path that does not exist yet', () => {
    // The write side asks before the file is there; the parent that will hold
    // it has been checked, and the missing segments cannot be links.
    expect(insideProblem(root, join(root, 'src', 'new', 'b.ts'))).toBeUndefined();
  });

  it('refuses a path that climbs out', () => {
    expect(insideProblem(root, join(root, '..', 'elsewhere', 'secret'))).toBe('it resolves outside');
  });

  it('refuses a symlink, whatever it points at', () => {
    symlinkSync(join(outside, 'secret'), join(root, 'link'));
    expect(insideProblem(root, join(root, 'link'))).toBe('it is a symlink');
    symlinkSync(join(root, 'src', 'a.ts'), join(root, 'inward'));
    expect(insideProblem(root, join(root, 'inward'))).toBe('it is a symlink');
  });

  it('refuses a path whose parent directory is a symlink out', () => {
    // The whole point: every segment spells out something under the root, and
    // one of them is a door to somewhere else. `startsWith` sees nothing wrong.
    symlinkSync(outside, join(root, 'src', 'vendor'));
    const target = join(root, 'src', 'vendor', 'written.txt');
    expect(target.startsWith(root)).toBe(true);
    expect(insideProblem(root, target)).toBe('it resolves outside');
  });

  it('compares real paths on both sides, so a symlinked root is not an escape', () => {
    // macOS hands out /var/folders/... as a symlink to /private/var/folders/...,
    // and a root that arrives unresolved must not refuse its own files.
    const alias = join(dir, 'alias');
    symlinkSync(root, alias);
    expect(insideProblem(alias, join(root, 'src', 'a.ts'))).toBeUndefined();
  });
});
