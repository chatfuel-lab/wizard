/**
 * Every domain type in the module, derived from the generated operations so
 * the wire shape and the UI shape can never drift.
 *
 * The one hand-written idea in here is `SourceId`: the knowledge base is one
 * record on the server, but a person reads it as a handful of separate
 * sources, and the rail, the budget breakdown and the deep links all key off
 * that list. See `lib/sources.ts` for the table itself.
 */
import type {
  GoodsCatalogQuery,
  KbGapChatsQuery,
  KbGapConversationQuery,
  KnowledgeBaseQuery,
  SpecialistsQuery,
} from '~api/generated/knowledge-base/graphql';

// ---------------------------------------------------------------------------
// The Fuely record
// ---------------------------------------------------------------------------

export type FuelyConfigInfo = NonNullable<KnowledgeBaseQuery['bot']['fuelyConfig']>;
export type KnowledgeBaseInfo = FuelyConfigInfo['knowledgeBase'];
export type UsageInfo = FuelyConfigInfo['usage'];
export type FaqEntry = KnowledgeBaseInfo['faqs'][number];
export type WorkingHoursDay = NonNullable<KnowledgeBaseInfo['businessHoursSchedule']['workingHours']>[number];

/** An FAQ the UI can reorder, select and undo — the wire has no entry id, so the store mints one. */
export interface FaqRow extends FaqEntry {
  /** Stable for the lifetime of the store, NOT persisted: the API keys entries by position. */
  key: string;
}

// ---------------------------------------------------------------------------
// The goods catalog
// ---------------------------------------------------------------------------

export type CatalogEntry = GoodsCatalogQuery['bot']['goodsCatalog'][number];
export type CatalogProduct = Extract<CatalogEntry, { __typename: 'GoodsProduct' }>;
export type CatalogService = Extract<CatalogEntry, { __typename: 'GoodsService' }>;
export type CatalogItem = CatalogProduct | CatalogService;

/**
 * `goodsCatalog` returns `DeletedGoodsService` stubs that carry nothing but a
 * `__typename` — a booking can still point at a service that no longer exists.
 * Everything downstream works on live items only.
 */
export function liveCatalogItems(entries: readonly CatalogEntry[]): CatalogItem[] {
  return entries.filter(
    (entry): entry is CatalogItem => entry.__typename === 'GoodsProduct' || entry.__typename === 'GoodsService',
  );
}

// ---------------------------------------------------------------------------
// Specialists
// ---------------------------------------------------------------------------

export type SpecialistInfo = SpecialistsQuery['bot']['specialists'][number];

// ---------------------------------------------------------------------------
// The gap scan
// ---------------------------------------------------------------------------

export type GapChatEdge = KbGapChatsQuery['bot']['contactChatsConnection']['edges'][number];
export type GapContact = GapChatEdge['node'];
export type GapMessage = KbGapConversationQuery['bot']['conversation']['messages']['edges'][number]['node'];

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export interface KnowledgeRole {
  /** `Ai: Edit` — everything on this page writes to the Fuely config. */
  canEdit: boolean;
  /** `Inbox: View` — the Gaps source reads conversations. */
  canReadInbox: boolean;
  loading: boolean;
}
