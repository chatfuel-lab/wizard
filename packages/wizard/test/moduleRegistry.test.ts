import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { camelId, generateModuleRegistry } from '../src/scaffold/moduleRegistry';

describe('camelId', () => {
  it('camelizes kebab ids', () => {
    expect(camelId('livechat')).toBe('livechat');
    expect(camelId('knowledge-base')).toBe('knowledgeBase');
    expect(camelId('a-b-c1')).toBe('aBC1');
  });
});

describe('generateModuleRegistry', () => {
  it('emits the checked-in convention', () => {
    const out = generateModuleRegistry(['livechat', 'knowledge-base']);
    expect(out).toContain("import { moduleDescriptor as livechat } from './livechat';");
    expect(out).toContain("import { moduleDescriptor as knowledgeBase } from './knowledge-base';");
    expect(out).toContain('export const MODULES: ModuleDescriptor[] = [livechat, knowledgeBase];');
    expect(out).toContain("import type { ModuleDescriptor } from './types';");
  });

  it('matches the shape of the checked-in registry file', () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const checkedIn = readFileSync(join(repoRoot, 'content/shell/src/modules/index.ts'), 'utf8');
    // Same import convention (fixed export name) — generation and reality agree.
    expect(checkedIn).toMatch(/import \{ moduleDescriptor as \w+ \} from '\.\/[\w-]+';/);
    expect(checkedIn).toMatch(/export const MODULES: ModuleDescriptor\[\] = \[/);
  });
});
