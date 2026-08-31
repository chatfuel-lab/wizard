import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateOperationDocs } from '../src/scaffold/operationDocs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('generateOperationDocs', () => {
  it('names only the namespaces the app took', () => {
    const out = generateOperationDocs(['contacts', 'core', 'knowledge-base']);
    expect(out).toContain("import * as contacts from './vendor/api/generated/contacts/graphql.js';");
    expect(out).toContain("import * as core from './vendor/api/generated/core/graphql.js';");
    expect(out).toContain("import * as knowledgeBase from './vendor/api/generated/knowledge-base/graphql.js';");
    expect(out).toContain('export const operations = [contacts, core, knowledgeBase];');
    // The proxy's surface is the app's own: what was not taken cannot be sent.
    expect(out).not.toContain('livechat');
    expect(out).not.toContain('bookings');
  });

  it('never writes `export *`, which would drop a name two namespaces share', () => {
    // contacts and livechat both export FileInfoFragmentDoc.
    const out = generateOperationDocs(['contacts', 'livechat']);
    expect(out).not.toMatch(/^export \* /m);
    expect(out).toContain('export const operations = [contacts, livechat];');
  });

  it('carries the marker the wizard rewrites the file by', () => {
    expect(generateOperationDocs(['core'])).toContain('@chatfuel:operation-docs');
  });

  it('matches the shape of the checked-in barrel', () => {
    const checkedIn = readFileSync(join(repoRoot, 'content/shell/src/operationDocs.ts'), 'utf8');
    expect(checkedIn).toContain('@chatfuel:operation-docs');
    expect(checkedIn).toMatch(/import \* as \w+ from '[^']+\/generated\/[\w-]+\/graphql\.js';/);
    expect(checkedIn).toMatch(/export const operations = \[/);
    expect(checkedIn).not.toMatch(/^export \* /m);
  });
});
