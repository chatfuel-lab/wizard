import { attributeMap, currencyOf, formatMoney, readValue, type AttributeEntryLike } from './dealFieldValue';
import type { DealFieldBindings } from './dealFieldBinding';

/**
 * Column money, and the honesty that has to travel with it.
 *
 * `contactDealsByStages` gives a server-truthful COUNT per stage, and there is
 * no aggregation API of any kind for attribute values — so every sum here is
 * over the cards actually loaded. A bare "€96,400" on a column holding 21 deals
 * of which 12 are loaded is a lie, which is why `coverage` exists and why the
 * component never renders the amount without it.
 */

export interface ColumnRollup {
  /** Summed amount, or null when nothing summable was found. */
  amount: number | null;
  currency: string;
  /** Cards that contributed an amount. */
  counted: number;
  /** Cards loaded in this column. */
  loaded: number;
  /** Server-truth count for the column. */
  total: number;
  /** Deals whose amounts are in different currencies — a sum would be a wrong number. */
  mixedCurrencies: boolean;
  /** Cards holding an amount this module cannot read. */
  unreadable: number;
}

export interface RollupCard {
  attributes: readonly AttributeEntryLike[];
  /** `UnavailableContact` is excluded from every figure here — see below. */
  __typename?: string;
}

export function rollupColumn(cards: readonly RollupCard[], bindings: DealFieldBindings, total: number): ColumnRollup {
  const amountName = bindings.amount.name;
  const currencyName = bindings.currency.name;

  let sum = 0;
  let counted = 0;
  let loaded = 0;
  let unreadable = 0;
  const currencies = new Set<string>();

  for (const card of cards) {
    // A restricted contact is counted in the server's `total` — we are told it
    // exists — but never in the money: we cannot read its fields, and showing
    // an amount for a card the user is not allowed to see is worse than a gap.
    if (card.__typename === 'UnavailableContact') continue;
    loaded += 1;
    const values = attributeMap(card.attributes);
    const raw = values[amountName];
    if (raw === undefined || raw.trim() === '') continue;
    const value = readValue('money', raw);
    if (value.parsed === null) {
      unreadable += 1;
      continue;
    }
    sum += value.parsed;
    counted += 1;
    currencies.add(currencyOf(values, currencyName));
  }

  const mixedCurrencies = currencies.size > 1;
  return {
    amount: counted === 0 || mixedCurrencies ? null : sum,
    currency: currencies.size === 1 ? [...currencies][0]! : '',
    counted,
    loaded,
    total,
    mixedCurrencies,
    unreadable,
  };
}

/**
 * The same figures across several columns at once — the strip above the board.
 *
 * Deliberately built by concatenating the cards and summing the totals rather
 * than by adding up per-column rollups: a currency conflict has to be visible
 * *across* columns too, and adding pre-summed amounts would hide it.
 */
export function rollupGroup(
  columns: readonly { cards: readonly RollupCard[]; total: number }[],
  bindings: DealFieldBindings,
): ColumnRollup {
  return rollupColumn(
    columns.flatMap((column) => column.cards),
    bindings,
    columns.reduce((sum, column) => sum + column.total, 0),
  );
}

/** The money, or a refusal to print a wrong number. Null means render nothing. */
export function rollupAmountLabel(rollup: ColumnRollup, locale?: string): string | null {
  if (rollup.mixedCurrencies) return 'Mixed currencies';
  if (rollup.amount === null) return null;
  return formatMoney(rollup.amount, rollup.currency, locale);
}

/**
 * `12 of 21` whenever the sum does not cover the whole column — because a deal
 * is beyond the loaded page, or because it has no amount at all. Null only when
 * every deal in the column contributed.
 */
export function rollupCoverage(rollup: ColumnRollup): string | null {
  if (rollup.counted === 0) return null;
  if (rollup.counted >= rollup.total && rollup.loaded >= rollup.total) return null;
  return `${rollup.counted} of ${rollup.total}`;
}

/** The long form, for a title attribute. */
export function rollupExplanation(rollup: ColumnRollup): string {
  const parts: string[] = [];
  if (rollup.mixedCurrencies) {
    parts.push('Deals in this column use more than one currency, so they are not summed.');
  }
  parts.push(
    `Summed over ${rollup.counted} of ${rollup.total} deals (${rollup.loaded} loaded). ` +
      'There is no aggregation API — only loaded deals can be counted.',
  );
  if (rollup.unreadable > 0) {
    parts.push(
      `${rollup.unreadable} deal${rollup.unreadable === 1 ? ' has an amount' : 's have amounts'} ` +
        'that could not be read.',
    );
  }
  return parts.join(' ');
}
