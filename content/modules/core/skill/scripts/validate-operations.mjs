#!/usr/bin/env node
// Validates GraphQL documents against references/schema.graphql.
// With no args: validates this skill's examples/ plus every sibling
// chatfuel-* skill's examples/ (installed layout: ../../chatfuel-<id>/).
// With args: validates the given .graphql files instead.
// Usage: node scripts/validate-operations.mjs [file.graphql ...]
// Requires the `graphql` package (any v16+): npm i --no-save graphql
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, parse, validate, specifiedRules } from 'graphql';

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = buildSchema(readFileSync(join(skillRoot, 'references', 'schema.graphql'), 'utf8'));

let files;
if (process.argv.length > 2) {
  files = process.argv.slice(2).map((f) => resolve(process.cwd(), f));
} else {
  files = [];
  const skillsDir = dirname(skillRoot);
  const siblings = readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('chatfuel-'))
    .map((d) => join(skillsDir, d.name));
  for (const dir of [skillRoot, ...siblings.filter((d) => d !== skillRoot)]) {
    const examples = join(dir, 'examples');
    if (!existsSync(examples)) continue;
    for (const f of readdirSync(examples)) {
      if (f.endsWith('.graphql')) files.push(join(examples, f));
    }
  }
}

let errorCount = 0;
for (const file of files) {
  const label = relative(process.cwd(), file);
  const source = readFileSync(file, 'utf8');
  let doc;
  try {
    doc = parse(source);
  } catch (e) {
    console.error(`✗ ${label}: parse error: ${e.message}`);
    errorCount += 1;
    continue;
  }
  const errors = validate(schema, doc, specifiedRules);
  if (errors.length === 0) {
    const ops = doc.definitions.filter((d) => d.kind === 'OperationDefinition').length;
    const frags = doc.definitions.filter((d) => d.kind === 'FragmentDefinition').length;
    console.log(`✓ ${label}: ${ops} operations, ${frags} fragments — valid`);
  } else {
    for (const e of errors) {
      const loc = e.locations?.[0];
      console.error(`✗ ${label}${loc ? `:${loc.line}` : ''}: ${e.message}`);
      errorCount += 1;
    }
  }
}

if (errorCount > 0) {
  console.error(`\n${errorCount} error(s).`);
  process.exit(1);
}
console.log('\nAll documents are valid.');
