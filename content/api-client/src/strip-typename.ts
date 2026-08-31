function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively remove __typename keys (non-mutating). The server rejects
 * unknown input fields, and fetched objects round-tripped into mutation
 * variables always carry __typename. Non-plain objects pass through untouched.
 */
export function stripTypename<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => stripTypename(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === '__typename') continue;
      // Not `out[key] = …`. An own "__proto__" key — which `JSON.parse`
      // produces, and every fetched object round-tripped into variables has
      // been through `JSON.parse` — would reach `Object.prototype`'s accessor
      // and swap this object's prototype instead of adding a field, so the
      // field would vanish from the request with nothing said about it.
      Object.defineProperty(out, key, {
        value: stripTypename(item),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return out as T;
  }
  return value;
}
