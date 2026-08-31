import type { ModuleClient } from '~api';
import type {
  DealGetQuery,
  DealsColumnQuery,
  DealsExportTaskQuery,
  DealsTableChatsQuery,
  DealsTeamQuery,
  SalesStageV2,
} from '~api/generated/deals/graphql';

/** The injected client — this module never constructs one. */
export type ApiClient = ModuleClient;

/** One kanban card (the DealContact fragment shape). */
export type DealCard = NonNullable<DealsColumnQuery['bot']>['contactDealsConnection']['edges'][number]['node'];

export type Stage = SalesStageV2;

/** One deal in the detail panel — everything on the card plus the platform. */
export type DealRecord = NonNullable<DealGetQuery['bot']>['contact'];

/** A row of `contact.attributes`. */
export type DealAttribute = DealRecord['attributes'][number];

export type DealTeamMember = NonNullable<DealsTeamQuery['bot']>['members'][number];

/**
 * Derived aliases for the views that do not exist yet. They live here rather
 * than in a view's own file so a view can be developed without editing this
 * one — a view that needs a further derived type declares it in its own
 * `lib/*.ts`.
 *
 * `DealsTableRow` is the same `DealContact` fragment the board uses:
 * `contactChatsConnection` and `contactsConnection` both return a
 * `ContactConnection`, so a card and a row are the same record seen twice.
 */
export type DealsTableRow = NonNullable<DealsTableChatsQuery['bot']>['contactChatsConnection']['edges'][number]['node'];

/** A CSV export in flight. Cancel takes `data.id`, NOT `id` — they differ. */
export type DealsExportTask = NonNullable<DealsExportTaskQuery['getTask']>;
