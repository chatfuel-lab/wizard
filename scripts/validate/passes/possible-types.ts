// ---------------------------------------------------------------------------
// Pass 4 — possible-types.json must be what the SDL beside it derives to
// ---------------------------------------------------------------------------
// `possible-types.json` sits next to the SDL it comes from and is a pure
// function of it: for each interface and union, the concrete types it can
// resolve to. So it is checked by re-deriving it, which catches a hand-edit and
// a stale copy alike without keeping a second copy around to compare against.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isInterfaceType, isUnionType, Kind, parse } from 'graphql';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const ABSTRACT = new Set<string>([Kind.INTERFACE_TYPE_DEFINITION, Kind.UNION_TYPE_DEFINITION]);

export function checkPossibleTypes(ctx: ValidateContext): void {
  const references = ctx.schemaDir;
  const possible = join(references, 'possible-types.json');
  if (!existsSync(possible)) {
    fail('content/schema/possible-types.json is missing — it is derived from the schema.graphql beside it');
    return;
  }

  const derived =
    '{\n' +
    parse(readFileSync(join(references, 'schema.graphql'), 'utf8'), { noLocation: true })
      .definitions.filter((d) => ABSTRACT.has(d.kind))
      .flatMap((d) => {
        const name = (d as { name: { value: string } }).name.value;
        const type = ctx.schema.getType(name);
        if (!isInterfaceType(type) && !isUnionType(type)) return [];
        const impls = ctx.schema.getPossibleTypes(type).map((t) => t.name);
        return [`  ${JSON.stringify(name)}: ${JSON.stringify(impls).replace(/,/g, ', ')}`];
      })
      .join(',\n') +
    '\n}\n';

  if (readFileSync(possible, 'utf8') !== derived) {
    fail(
      'content/schema/possible-types.json does not match the schema.graphql beside it — ' +
        'it is generated, so regenerate it from the SDL rather than editing it',
    );
  }
}
