import type { ModuleClient } from '~api';
import type {
  BookingAvailabilityQuery,
  BookingConfigQuery,
  BookingContactsSearchQuery,
  BookingInfoFragment,
  BookingServicesQuery,
  BookingSpecialistsQuery,
  BookingTaskInfoFragment,
} from '~api/generated/bookings/graphql';

/**
 * The injected client, under the module's local name. Satisfied by the real
 * ChatfuelClient (~api) — this module never constructs one.
 */
export type ApiClient = ModuleClient;

/**
 * One booking as every read, write and subscription returns it (the
 * `BookingInfo` fragment): the `Booking` branch or the Google-Calendar-imported
 * `BookingWithGoogleCalendarRef` branch. Both carry `contact` / `inlineContact`.
 */
export type BookingRecord = BookingInfoFragment;

export type BookingInlineContact = NonNullable<BookingRecord['inlineContact']>;
export type BookingServiceRef = NonNullable<BookingRecord['service']>;
export type BookingSpecialistRef = NonNullable<BookingRecord['specialist']>;

type CatalogEntry = NonNullable<BookingServicesQuery['bot']>['goodsCatalog'][number];
/** A live service — the GoodsService branch of goodsCatalog, full record. */
export type ServiceRecord = Extract<CatalogEntry, { __typename: 'GoodsService' }>;

/** A specialist, full record: profile, schedule, services, Google Calendar state. */
export type SpecialistRecord = NonNullable<BookingSpecialistsQuery['bot']>['specialists'][number];
export type SpecialistSchedule = NonNullable<SpecialistRecord['schedule']>;
export type SpecialistDayHours = NonNullable<SpecialistSchedule['mon']>;

/** One specialist's free start-time periods for one service on one day. */
export type AvailabilityEntry = Extract<
  NonNullable<BookingAvailabilityQuery['bot']>['goodsService'],
  { __typename: 'GoodsService' }
>['bookingAvailableStartTime'][number];

/** A search hit in the wizard's customer step (the BookingContactRef shape). */
export type ContactHit = NonNullable<
  BookingContactsSearchQuery['bot']
>['contactChatsConnection']['edges'][number]['node'];

export type BookingConfig = NonNullable<NonNullable<BookingConfigQuery['bot']>['fuelyConfig']>['booking'];

/** A Google Calendar sync task (the BookingTaskInfo fragment). */
export type SyncTask = BookingTaskInfoFragment;

/**
 * Which wall clock the workspace renders. `botZone` is `bot.timezone` (may be
 * null on a bot that never set one); `zone` is what the grid, the panel and
 * the wizard format in; `source` says why. See `lib/zone.ts`.
 */
export interface DisplayZone {
  botZone: string | null;
  zone: string;
  source: 'bot' | 'local';
}
