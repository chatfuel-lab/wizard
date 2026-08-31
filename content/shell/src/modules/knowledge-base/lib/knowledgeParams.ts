/**
 * The module's deep links, parsed and serialized in one pure place.
 *
 * Two rules the whole file exists to hold (deals' rules, verbatim):
 *
 * 1. **An unknown value falls back silently.** A hand-edited or stale URL must
 *    never white-screen and must never throw — it renders the default.
 * 2. **A default is omitted from the written params.** Otherwise every mount
 *    would rewrite the URL with the full schema.
 *
 *   source=<SourceId>     the selected knowledge source (overview omitted)
 *   item=<id>             the row to open on arrival (a catalog item, an FAQ key)
 *   q=<text>              the source's search box
 *   import=faq|products   the import wizard, opened for that target
 *   draft=<text>          a question to seed a NEW FAQ with — how "Create FAQ"
 *                         travels from the Gaps source to the FAQ source
 *
 * An earlier version of this page linked with `?tab=business|faqs|catalog`, and those links are
 * in the wild: the seed recipe's handoff prints one, and the automations module
 * links here from two setting editors. They are read once, mapped onto `source`,
 * and dropped on the next write.
 */
import { isSourceId, type SourceId } from './sources';

export type ImportTarget = 'faq' | 'products';
export const IMPORT_TARGETS: readonly ImportTarget[] = ['faq', 'products'];

export interface KnowledgeParams {
  source: SourceId;
  item: string | null;
  q: string;
  import: ImportTarget | null;
  draft: string | null;
}

export const DEFAULT_PARAMS: KnowledgeParams = {
  source: 'overview',
  item: null,
  q: '',
  import: null,
  draft: null,
};

/** The keys this module ever wrote — the current five and the retired tab. */
export const OWNED_KEYS: readonly string[] = ['source', 'item', 'q', 'import', 'draft', 'tab'];

/** `?tab=` from the three-tab page this replaced. */
const LEGACY_TABS: Record<string, SourceId> = {
  business: 'profile',
  faq: 'faq',
  faqs: 'faq',
  catalog: 'products',
};

const nonEmpty = (raw: string | null): string | null => (raw === null || raw === '' ? null : raw);

export function parseSource(raw: string | null, legacyTab: string | null): SourceId {
  if (isSourceId(raw)) return raw;
  if (legacyTab !== null && legacyTab in LEGACY_TABS) return LEGACY_TABS[legacyTab]!;
  return DEFAULT_PARAMS.source;
}

export function parseKnowledgeParams(params: URLSearchParams): KnowledgeParams {
  const importTarget = params.get('import');
  return {
    source: parseSource(params.get('source'), params.get('tab')),
    item: nonEmpty(params.get('item')),
    q: params.get('q') ?? '',
    import: IMPORT_TARGETS.includes(importTarget as ImportTarget) ? (importTarget as ImportTarget) : null,
    draft: nonEmpty(params.get('draft')),
  };
}

/**
 * Rewrites only this module's keys and leaves anything else in `params`
 * untouched — the shell owns the rest of the query string. `tab` is in
 * OWNED_KEYS purely so it is deleted: an old link stops carrying it after the
 * first navigation.
 */
export function writeKnowledgeParams(params: URLSearchParams, next: KnowledgeParams): URLSearchParams {
  const out = new URLSearchParams(params);
  for (const key of OWNED_KEYS) out.delete(key);
  const set = (key: string, value: string | null) => {
    if (value !== null && value !== '') out.set(key, value);
  };
  set('source', next.source !== DEFAULT_PARAMS.source ? next.source : null);
  set('item', next.item);
  set('q', next.q.trim() === '' ? null : next.q);
  set('import', next.import);
  set('draft', next.draft);
  return out;
}
