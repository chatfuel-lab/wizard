/**
 * Reading an arbitrary JSON value one row at a time.
 *
 * ## What this is for
 *
 * A pending tool approval carries its arguments as a `Map!`, which round-trips
 * arbitrary nested JSON: the real batch seen in practice was
 * `{ botId, service: { title, description, durationSeconds, images,
 * isAvailable, price: { amount, currency } } }`. The module renders that as
 * `JSON.stringify(args, null, 2)` inside a `<pre>` — sixteen lines of braces
 * that a person is asked to read and then approve, on the surface where
 * approving means the account changes.
 *
 * `data/JsonView.tsx` renders it as rows that collapse. This is the half that
 * decides what each row says, kept out of the component because "what does a
 * four-key object look like collapsed" is a question with a right answer and a
 * test, while "how is that row laid out" is not.
 *
 * ## Why nothing here recurses
 *
 * Every function answers about ONE value: its kind, its one-line summary, its
 * immediate children. Depth is the component's business, and it stops at a
 * depth limit rather than descending as far as the data goes. That is not
 * tidiness — a `Map!` is whatever the server put in it, and a value that
 * contains itself (or is merely 40 levels deep) would take the whole dashboard
 * down with a stack overflow during a render. A walk that cannot recurse
 * cannot overflow.
 */

/** What a value is, as far as a viewer is concerned. */
export type JsonKind = 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object' | 'unsupported';

/**
 * `unsupported` is the honest answer for `undefined`, a function or a symbol.
 * None of them can come out of JSON, all of them can come out of a caller
 * spreading a live object into the props, and rendering them as `null` would
 * be a viewer that lies about the value it is showing.
 */
export function jsonKind(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'object':
      return 'object';
    default:
      return 'unsupported';
  }
}

/** Whether a value has rows under it. */
export function isExpandable(value: unknown): boolean {
  const kind = jsonKind(value);
  if (kind === 'array') return (value as unknown[]).length > 0;
  if (kind === 'object') return Object.keys(value as object).length > 0;
  return false;
}

/** Children of one container, in the order the source wrote them. */
export interface JsonEntry {
  /** Property name, or the index as a string for an array. */
  key: string;
  value: unknown;
  /** Dotted path from the root — `service.price.amount`. Row identity. */
  path: string;
}

/** A path segment appended to its parent, in the notation a person would type. */
export function jsonPath(parent: string, key: string, inArray: boolean): string {
  if (inArray) return `${parent}[${key}]`;
  if (parent === '') return key;
  /* A key with a dot or a bracket in it would produce a path that reads as two
     segments; bracket-quote it so the path stays unambiguous. */
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}["${key}"]`;
}

export function entriesOf(value: unknown, path = ''): JsonEntry[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: String(index),
      value: item,
      path: jsonPath(path, String(index), true),
    }));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
      key,
      value: item,
      path: jsonPath(path, key, false),
    }));
  }
  return [];
}

export interface JsonSummary {
  kind: JsonKind;
  /** The one line this value shows when it is not expanded. */
  label: string;
  /** Keys or items. Zero for a scalar. */
  count: number;
}

/**
 * The collapsed line for a value.
 *
 * Containers say how much is inside, because the count is the only thing that
 * tells a reader whether opening the row is worth it: `{…} 6 keys` is a
 * decision, `Object` is not. An empty container says so with the empty literal
 * rather than "0 keys", which reads as an error.
 *
 * Scalars are shown as they would be written in JSON — strings quoted, so that
 * `"12"` and `12` are visibly different, which on an argument called `amount`
 * is the difference between a correct call and a rejected one.
 */
export function summarize(value: unknown): JsonSummary {
  const kind = jsonKind(value);
  switch (kind) {
    case 'array': {
      const count = (value as unknown[]).length;
      return { kind, count, label: count === 0 ? '[]' : `[…] ${count} ${count === 1 ? 'item' : 'items'}` };
    }
    case 'object': {
      const count = Object.keys(value as object).length;
      return { kind, count, label: count === 0 ? '{}' : `{…} ${count} ${count === 1 ? 'key' : 'keys'}` };
    }
    default:
      return { kind, count: 0, label: formatScalar(value) };
  }
}

/** A scalar as JSON would write it — and as a person would read it back. */
export function formatScalar(value: unknown): string {
  switch (jsonKind(value)) {
    case 'null':
      return 'null';
    case 'string':
      return JSON.stringify(value as string);
    case 'number':
    case 'boolean':
      /* `String`, not `JSON.stringify`: NaN and Infinity have no JSON spelling
         and stringify writes them as `null`, which would show a number field as
         absent rather than as wrong. */
      return String(value);
    default:
      return String(value);
  }
}

export interface TruncatedText {
  text: string;
  truncated: boolean;
  /** Characters not shown. Zero when nothing was cut. */
  hidden: number;
}

/**
 * A long string, cut to a line.
 *
 * Tool arguments hold prose — a service description, a denial message — and one
 * of them is enough to push every other row off the screen. The cut is
 * reversible in the component ("show all"), so this reports what it hid rather
 * than silently ending in an ellipsis: a reader who cannot see the length
 * cannot tell a truncated paragraph from a truncated word.
 */
export function truncateText(text: string, limit: number): TruncatedText {
  /* Code units, not code points: the cut is a display budget, and a surrogate
     pair split in half would render as a replacement character. Slice on a
     boundary by stepping back over a lone high surrogate. */
  if (!Number.isFinite(limit) || limit <= 0 || text.length <= limit) {
    return { text, truncated: false, hidden: 0 };
  }
  let end = Math.floor(limit);
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return { text: text.slice(0, end), truncated: true, hidden: text.length - end };
}

/**
 * Whether a row opens by itself.
 *
 * The rule is about how much is behind the row rather than how deep it is: a
 * two-key object is cheaper to read open than closed, and a twenty-item array
 * opened by default is the `<pre>` dump this replaces. So depth sets the budget
 * and size spends it — the root and its children open if they are small, and
 * everything below starts shut.
 */
export function opensByDefault(value: unknown, depth: number, autoDepth: number): boolean {
  if (depth >= autoDepth) return false;
  if (!isExpandable(value)) return false;
  const { count } = summarize(value);
  return count <= 12;
}

/**
 * JSON as a person would copy it out.
 *
 * `JSON.stringify` throws on a cycle and on a BigInt, and a copy button that
 * throws takes the render down with it — the click handler is inside React's
 * event system, not in a promise. So the failure is a value, and the caller
 * decides whether to offer the button at all.
 */
export function stringifyJson(value: unknown, indent = 2): string | null {
  try {
    const text = JSON.stringify(value, null, indent);
    return text === undefined ? null : text;
  } catch {
    return null;
  }
}
