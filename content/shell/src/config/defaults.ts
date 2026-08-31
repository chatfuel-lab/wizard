/**
 * The deployment's own settings, and the values they have when nobody says
 * otherwise.
 *
 * ## What belongs here
 *
 * A value is a SETTING when it is true of the deployment rather than of the
 * product: a fact about who this app was scaffolded for that the code cannot
 * work out and the person using the app should not have to. It is NOT a setting
 * when the app already has a way to ask — a user preference, a bot attribute,
 * the API's own answer — because a second way to say the same thing is a second
 * answer to disagree with the first.
 *
 * That test is why this file is short. The week's first day is a preference and
 * falls back to the locale; a specialist's working hours are edited in the
 * bookings UI; which attribute holds a deal's amount is BOUND against what the
 * bot really carries, name then alias then case-insensitively, rather than
 * declared. None of those belong here, and putting them here would take a
 * question the app answers well and freeze one answer to it.
 *
 * ## How it is changed
 *
 * Not here. `config/app.ts` next to this file holds the overrides and is the
 * deployment's own — the wizard writes it once and `update` never touches it,
 * the same bargain `.env` gets. This file is the upstream's and does move, so
 * an app that took the defaults keeps getting them.
 */

export interface AppConfig {
  /**
   * The currency a money amount is shown in when the record itself does not
   * say — a deal with an amount and no `deal currency` attribute, a contact
   * with the same. An ISO 4217 code; it is handed to `Intl.NumberFormat`, so a
   * code it does not know throws where the number would have been.
   */
  currency: string;

  /**
   * Where a day or week calendar opens, as minutes past midnight, when there
   * is nothing in it to scroll to. 480 is 08:00 — an hour before the working
   * day this product's defaults assume, so the first appointment is not
   * against the top edge.
   */
  calendarScrollMinute: number;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  currency: 'EUR',
  calendarScrollMinute: 8 * 60,
};
