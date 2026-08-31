/**
 * `GET /v1/projects/{ref}/api-keys?reveal=true` answers with a mix of the new
 * publishable/secret keys (`type: 'publishable' | 'secret'`, values
 * `sb_publishable_…` / `sb_secret_…`) and the legacy JWT pair (`type:
 * 'legacy'`, `name: 'anon' | 'service_role'`). Prefer the new kind; the legacy
 * pair is deprecated (end of 2026) but still accepted everywhere this wizard
 * uses them.
 */
export interface ManagementApiKey {
  id?: string;
  name?: string;
  type?: 'publishable' | 'secret' | 'legacy' | string;
  api_key?: string | null;
  /** Some responses carry the value under a hashed/other field when not revealed. */
  hash?: string | null;
  description?: string | null;
}

export type AnonKeyKind = 'publishable' | 'legacy';
export type SecretKeyKind = 'secret' | 'legacy';

export interface PickedKeys {
  anonKey: string;
  anonKeyKind: AnonKeyKind;
  secretKey?: string;
  secretKeyKind?: SecretKeyKind;
}

const value = (key: ManagementApiKey | undefined): string | undefined =>
  key?.api_key && key.api_key.length > 0 ? key.api_key : undefined;

/**
 * anon slot = `type === 'publishable'` (first one) else legacy `name === 'anon'`;
 * secret slot = `type === 'secret'` (first one) else legacy `name === 'service_role'`.
 * Throws when no anon-capable key is present — the app cannot run without one.
 */
export function pickKeys(keys: ManagementApiKey[]): PickedKeys {
  const publishable = keys.find((k) => k.type === 'publishable' && value(k));
  const legacyAnon = keys.find((k) => (k.type === 'legacy' || !k.type) && k.name === 'anon' && value(k));
  const secret = keys.find((k) => k.type === 'secret' && value(k));
  const legacyService = keys.find((k) => (k.type === 'legacy' || !k.type) && k.name === 'service_role' && value(k));

  const anon = publishable ?? legacyAnon;
  if (!anon) {
    throw new Error(
      'No anon / publishable API key was returned for the project (need projects read on the token; is the project healthy?)',
    );
  }
  const picked: PickedKeys = {
    anonKey: value(anon)!,
    anonKeyKind: publishable ? 'publishable' : 'legacy',
  };
  const secretKey = secret ?? legacyService;
  if (secretKey) {
    picked.secretKey = value(secretKey)!;
    picked.secretKeyKind = secret ? 'secret' : 'legacy';
  }
  return picked;
}

/** Best-effort classification of a pasted anon key (manual path). */
export function classifyAnonKey(key: string): AnonKeyKind | 'unknown' {
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (/^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+$/.test(key)) return 'legacy';
  return 'unknown';
}
