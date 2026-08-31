/**
 * TemplateStr protocol round-trip (guide.md "Rich text: the TemplateStr
 * protocol"): READS are structured parts (TemplateStrText | TemplateStrAttribute),
 * WRITES are plain strings where "{{attribute name}}" placeholders are parsed
 * server-side. Not allowed inside the braces: '{', '}', '%', newline.
 *
 * templateStrToString renders parts into the editable string; parseTemplateString
 * is the client-side echo of the server's parser — used by tests to close the
 * loop, never to talk to the API (writes stay plain strings).
 */
import { AttributeDataType, AttributeType, type TStrFragment } from '~api/generated/flow-builder/graphql';

export type TemplateStrLike = Pick<TStrFragment, 'parts'>;
export type TemplateStrPart = TStrFragment['parts'][number];

/** Parts → editable string; attribute parts render as "{{name}}". */
export function templateStrToString(value: TemplateStrLike | null | undefined): string {
  if (!value) return '';
  return value.parts
    .map((part) => (part.__typename === 'TemplateStrAttribute' ? `{{${part.attribute.name}}}` : part.text))
    .join('');
}

/** Placeholder grammar: anything between {{ }} except '{', '}', '%', newline. */
const PLACEHOLDER = /\{\{([^{}%\n]+)\}\}/g;

/**
 * Editable string → parts. Mirrors the server-side parse of a plain-string
 * write; malformed braces stay literal text (the server does the same).
 */
export function parseTemplateString(input: string): TemplateStrPart[] {
  const parts: TemplateStrPart[] = [];
  let cursor = 0;
  PLACEHOLDER.lastIndex = 0;
  for (let match = PLACEHOLDER.exec(input); match !== null; match = PLACEHOLDER.exec(input)) {
    if (match.index > cursor) {
      parts.push({ __typename: 'TemplateStrText', text: input.slice(cursor, match.index), errCode: null });
    }
    parts.push({
      __typename: 'TemplateStrAttribute',
      errCode: null,
      attribute: {
        __typename: 'BotAttribute',
        name: match[1]!,
        type: AttributeType.Custom,
        dataType: AttributeDataType.String,
      },
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < input.length) {
    parts.push({ __typename: 'TemplateStrText', text: input.slice(cursor), errCode: null });
  }
  return parts;
}

/** Convenience for tests: a whole TemplateStr object from an editable string. */
export function templateStrFromString(input: string): TStrFragment {
  return { __typename: 'TemplateStr', parts: parseTemplateString(input) };
}
