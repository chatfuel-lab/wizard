/**
 * The deal-field convention, in one editable file.
 *
 * The Chatfuel API has no Deal entity and the bundled SDL is a downloaded
 * snapshot, so a deal's money and dates live in **custom contact
 * attributes**. `contactAttributeUpdate` is documented "Create or update
 * custom contact attribute" — writing is what defines one. Rename the
 * `attributeName`s here and the whole module follows.
 *
 * What the API does with them, which is what the convention rests on:
 * none of these names is reserved; a written attribute shows up in
 * `bot.botAttributes` immediately; and names that do not exist yet are
 * silently omitted from `contact.attributes(names:)` rather than erroring —
 * which is why the board can ask for all of them from the first render.
 *
 * There is no rename mutation. Changing an `attributeName` after data exists
 * orphans that data; add the old name to `aliases` instead.
 */
import { APP_CONFIG } from '../../shellConfig';

export type DealFieldKey = 'amount' | 'currency' | 'closeDate' | 'company' | 'probability' | 'source' | 'lostReason';

/** Decides parsing, the input control, and how the value is rendered. */
export type DealFieldKind = 'money' | 'currency' | 'date' | 'percent' | 'text';

export interface DealFieldSpec {
  key: DealFieldKey;
  /** The custom attribute name written to the API. */
  attributeName: string;
  label: string;
  kind: DealFieldKind;
  /** Read-only fallbacks, so an attribute created by hand in the dashboard still resolves. */
  aliases: readonly string[];
  placeholder?: string;
}

/** Used when a deal has an amount but no currency of its own. */
export const DEFAULT_CURRENCY = APP_CONFIG.currency;

export const DEAL_FIELDS: readonly DealFieldSpec[] = [
  {
    key: 'amount',
    attributeName: 'deal amount',
    label: 'Amount',
    kind: 'money',
    aliases: ['deal_amount', 'dealAmount', 'amount', 'deal value'],
    placeholder: '1500.50',
  },
  {
    key: 'currency',
    attributeName: 'deal currency',
    label: 'Currency',
    kind: 'currency',
    aliases: ['deal_currency', 'currency'],
    placeholder: DEFAULT_CURRENCY,
  },
  {
    key: 'closeDate',
    attributeName: 'deal close date',
    label: 'Close date',
    kind: 'date',
    aliases: ['deal_close_date', 'close date', 'expected close date'],
  },
  {
    key: 'company',
    attributeName: 'deal company',
    label: 'Company',
    kind: 'text',
    aliases: ['deal_company', 'company', 'organization'],
  },
  {
    key: 'probability',
    attributeName: 'deal probability',
    label: 'Probability',
    kind: 'percent',
    aliases: ['deal_probability', 'probability'],
    placeholder: '40',
  },
  {
    key: 'source',
    attributeName: 'deal source',
    label: 'Source',
    kind: 'text',
    aliases: ['deal_source', 'source', 'lead source'],
  },
  {
    key: 'lostReason',
    attributeName: 'deal lost reason',
    label: 'Lost reason',
    kind: 'text',
    aliases: ['deal_lost_reason', 'lost reason'],
  },
];

const BY_KEY = new Map(DEAL_FIELDS.map((spec) => [spec.key, spec]));

export function dealField(key: DealFieldKey): DealFieldSpec {
  const spec = BY_KEY.get(key);
  if (!spec) throw new Error(`Unknown deal field: ${key}`);
  return spec;
}

/** The configured names, before any alias the catalog resolves. */
export const DEAL_FIELD_NAMES: readonly string[] = DEAL_FIELDS.map((spec) => spec.attributeName);

/** Shown on the card and summed in the column rollup. */
export const CARD_FIELDS: readonly DealFieldKey[] = ['amount', 'closeDate'];
