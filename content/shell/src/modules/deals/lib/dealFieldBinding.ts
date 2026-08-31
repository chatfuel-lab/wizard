import { DEAL_FIELDS, DEAL_FIELD_NAMES, type DealFieldKey, type DealFieldSpec } from './dealFields';

/**
 * Binding the convention in `dealFields.ts` to what a particular bot actually
 * has. A bot may already carry `Deal Amount` from the dashboard, or a localized
 * alias — the field should find it rather than quietly creating a second
 * attribute beside it.
 *
 * Nothing here is load-bearing for a fresh bot: unknown names are silently
 * omitted from `contact.attributes(names:)`, so the board
 * asks for every configured name from the first render and binding only ever
 * *adds* an alias to that list.
 */

export interface CatalogAlias {
  locale: string;
  alias: string;
}

export interface CatalogEntry {
  name: string;
  aliases?: readonly CatalogAlias[];
}

/** How the name was found. Anything but `exact` is worth showing in the panel. */
export type BindingVia = 'exact' | 'alias' | 'case' | 'localized' | 'none';

export interface DealFieldBinding {
  spec: DealFieldSpec;
  /** The attribute this bot really has; the configured name when unbound. */
  name: string;
  bound: boolean;
  via: BindingVia;
}

export type DealFieldBindings = Record<DealFieldKey, DealFieldBinding>;

const lower = (value: string) => value.trim().toLowerCase();

/** Match order: exact name, exact alias, case-insensitive name, case-insensitive alias, localized alias. */
export function bindDealFields(catalog: readonly CatalogEntry[]): DealFieldBindings {
  const byName = new Map<string, CatalogEntry>();
  const byLower = new Map<string, CatalogEntry>();
  for (const entry of catalog) {
    if (!byName.has(entry.name)) byName.set(entry.name, entry);
    if (!byLower.has(lower(entry.name))) byLower.set(lower(entry.name), entry);
  }

  const claimed = new Set<string>();
  const bindings = {} as DealFieldBindings;

  for (const spec of DEAL_FIELDS) {
    const take = (entry: CatalogEntry | undefined, via: BindingVia): boolean => {
      if (!entry || claimed.has(entry.name)) return false;
      claimed.add(entry.name);
      bindings[spec.key] = { spec, name: entry.name, bound: true, via };
      return true;
    };

    if (take(byName.get(spec.attributeName), 'exact')) continue;
    if (spec.aliases.some((alias) => take(byName.get(alias), 'alias'))) continue;
    if (take(byLower.get(lower(spec.attributeName)), 'case')) continue;
    if (spec.aliases.some((alias) => take(byLower.get(lower(alias)), 'case'))) continue;

    // A localized alias is a property of the catalog entry, so this one scans.
    const wanted = new Set([lower(spec.attributeName), lower(spec.label), ...spec.aliases.map(lower)]);
    const localized = catalog.find(
      (entry) => !claimed.has(entry.name) && (entry.aliases ?? []).some((alias) => wanted.has(lower(alias.alias))),
    );
    if (take(localized, 'localized')) continue;

    bindings[spec.key] = { spec, name: spec.attributeName, bound: false, via: 'none' };
  }

  return bindings;
}

/** Every configured name plus whatever binding resolved. Sorted, so identity is stable. */
export function requestedNames(bindings: DealFieldBindings | null): string[] {
  const names = new Set<string>(DEAL_FIELD_NAMES);
  for (const binding of Object.values(bindings ?? {})) names.add(binding.name);
  return [...names].sort();
}

/** The unbound state, available before the catalog answers — nothing waits on it. */
export function unboundFields(): DealFieldBindings {
  const bindings = {} as DealFieldBindings;
  for (const spec of DEAL_FIELDS) {
    bindings[spec.key] = { spec, name: spec.attributeName, bound: false, via: 'none' };
  }
  return bindings;
}
