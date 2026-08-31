/**
 * Writing, changing and removing a bot-wide default value.
 *
 * The per-field flow list that used to sit beside this went with the Fields
 * drawer: `usedInFlows` costs one query per field, and the catalog already
 * answers `flowsCount` in the table for nothing. `ContactFieldUsage` stays in
 * the skill, documented, for anyone who wants the names themselves.
 */
import { useCallback, useState } from 'react';
import {
  BotAttributeDeleteDefaultDocument,
  BotAttributeSetDefaultDocument,
  BotAttributeUpdateDefaultDocument,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import { defaultAction } from '../lib/fields';
import type { CatalogEntry } from './useAttributeCatalog';

export interface FieldDefaultApi {
  saving: boolean;
  error: string | null;
  /** Resolves true on success; the caller closes its dialog on true only. */
  apply: (entry: CatalogEntry, next: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Writing, changing and removing a bot-wide default value.
 *
 * Three mutations, one entry point, because the caller has one control: which
 * of the three fires is decided by what is there now and what was typed
 * (`defaultAction`), not by three buttons the user has to choose between.
 *
 * There is no undo for this. `botAttributeDeleteDefaultVal` would restore the
 * previous state, but the damage a default does is to what every filter MEANS
 * while it is set, and "undo" on a toast that is already gone is not a promise
 * this module can keep — so the confirm dialog is where the cost is paid,
 * spelled out in `defaultConsequence`.
 */
export function useFieldDefault(): FieldDefaultApi {
  const { client, botId } = useContacts();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const apply = useCallback(
    async (entry: CatalogEntry, next: string): Promise<boolean> => {
      const action = defaultAction(entry, next);
      setSaving(true);
      setError(null);
      try {
        /* Branched rather than picking a document into a variable: the three
           operations return three differently named fields, so a union of the
           typed documents infers nothing useful for `mutate`. */
        if (action === 'remove') {
          await client.mutate(BotAttributeDeleteDefaultDocument, { botID: botId, attributeName: entry.name });
        } else if (action === 'set') {
          await client.mutate(BotAttributeSetDefaultDocument, {
            botID: botId,
            attributeName: entry.name,
            defaultValue: next.trim(),
          });
        } else {
          await client.mutate(BotAttributeUpdateDefaultDocument, {
            botID: botId,
            attributeName: entry.name,
            defaultValue: next.trim(),
          });
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The server refused the default value');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [client, botId],
  );

  return { saving, error, apply, clearError };
}
