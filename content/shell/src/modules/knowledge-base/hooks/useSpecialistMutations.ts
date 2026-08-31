import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  SpecialistCreateDocument,
  SpecialistDeleteDocument,
  SpecialistUpdateDocument,
  type SpecialistInfoInput,
} from '~api/generated/knowledge-base/graphql';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { messageFor } from '../lib/errors';
import { specialistName } from '../lib/catalogStore';
import type { SpecialistInfo } from '../types';

export interface SpecialistMutations {
  create: (info: SpecialistInfoInput) => Promise<SpecialistInfo | null>;
  update: (id: string, info: SpecialistInfoInput) => Promise<SpecialistInfo>;
  remove: (record: SpecialistInfo) => Promise<void>;
}

/**
 * The Team mirror's writes — reachable only when the bookings module is NOT
 * installed (see `lib/mirror.ts`).
 *
 * NO UNDO here, and that is a decision rather than an omission: a specialist
 * re-created from a snapshot would come back with a new id, and every booking
 * that pointed at the old one would keep pointing at a `DeletedSpecialist`.
 * Restoring the row would look like it worked and quietly leave the calendar
 * wrong, so the delete asks first and means it.
 *
 * Create and delete answer with the whole specialist list; update answers with
 * the one record (and, unlike the catalog's update, WITH nothing missing —
 * the fragment covers the type completely).
 */
export function useSpecialistMutations(): SpecialistMutations {
  const { client, botId } = useKnowledgeBase();
  const catalog = useCatalog();
  const toast = useToast();

  const create = useCallback<SpecialistMutations['create']>(
    async (info) => {
      const before = new Set(catalog.state.specialists.map((specialist) => specialist.id));
      const data = await client.mutate(SpecialistCreateDocument, { botID: botId, info });
      const specialists = data.specialistCreate.specialists;
      catalog.applySpecialists(specialists);
      toast.show({ title: `${info.profile.firstName} added`, tone: 'success', duration: 3000 });
      return specialists.find((specialist) => !before.has(specialist.id)) ?? null;
    },
    [client, botId, catalog, toast],
  );

  const update = useCallback<SpecialistMutations['update']>(
    async (id, info) => {
      const data = await client.mutate(SpecialistUpdateDocument, { botID: botId, specialistID: id, info });
      const saved = data.specialistUpdate;
      catalog.applySpecialists(
        catalog.state.specialists.map((specialist) => (specialist.id === saved.id ? saved : specialist)),
      );
      toast.show({
        id: `specialist-saved-${id}`,
        title: `${specialistName(saved)} saved`,
        tone: 'success',
        duration: 3000,
      });
      return saved;
    },
    [client, botId, catalog, toast],
  );

  const remove = useCallback<SpecialistMutations['remove']>(
    async (record) => {
      const name = specialistName(record);
      try {
        const data = await client.mutate(SpecialistDeleteDocument, { botID: botId, specialistID: record.id });
        catalog.applySpecialists(data.specialistDelete.specialists);
        toast.show({
          title: `${name} deleted`,
          description: 'Bookings made with them keep their name.',
          tone: 'info',
          duration: 4000,
        });
      } catch (error) {
        toast.show({ title: `Could not delete ${name}`, description: messageFor(error), tone: 'danger' });
        throw error;
      }
    },
    [client, botId, catalog, toast],
  );

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
