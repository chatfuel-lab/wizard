/**
 * The country list behind the wizard's "Country" select — the ISO 3166-1
 * alpha-2 codes the API's `CountryCode` scalar takes, named through
 * `Intl.DisplayNames` (the code itself when the engine has no names). The
 * default is the bot's `countryCode`; a phone typed without `+` is read by
 * the server against it (`BookingInlineContactInput.countryCode`).
 */

const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';

export const COUNTRY_CODES: readonly string[] = CODES.split(' ');

export interface CountryOption {
  value: string;
  label: string;
}

let cached: CountryOption[] | null = null;

/** "Germany (DE)" per code, sorted by name; the code alone where the engine cannot name it. Computed once. */
export function countryOptions(locale?: string): CountryOption[] {
  if (cached && !locale) return cached;
  let names: { of: (code: string) => string | undefined } | null = null;
  try {
    names = new Intl.DisplayNames([locale ?? 'en'], { type: 'region' });
  } catch {
    names = null;
  }
  const out = COUNTRY_CODES.map((code) => {
    let name: string | undefined;
    try {
      name = names?.of(code);
    } catch {
      name = undefined;
    }
    return { value: code, label: name && name !== code ? `${name} (${code})` : code };
  }).sort((a, b) => a.label.localeCompare(b.label));
  if (!locale) cached = out;
  return out;
}

export function isCountryCode(code: string | null | undefined): code is string {
  return typeof code === 'string' && COUNTRY_CODES.includes(code.toUpperCase());
}
