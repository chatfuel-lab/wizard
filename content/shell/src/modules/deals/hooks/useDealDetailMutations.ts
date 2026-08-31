import { useMemo } from 'react';
import {
  DealAssignAiDocument,
  DealAssignDocument,
  DealClearFieldDocument,
  DealRenameDocument,
  DealSetFieldDocument,
  DealSetNoteDocument,
  DealSetStageDocument,
  DealUnassignDocument,
  type SalesStageV2,
} from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { DealPatch } from './useDealDetail';

export interface DealDetailMutations {
  /** An empty value DELETES the attribute — writing "" would keep it alive and counted. */
  setField: (attrName: string, value: string) => Promise<void>;
  rename: (name: string) => Promise<void>;
  setNote: (note: string) => Promise<void>;
  /**
   * The panel moves a deal itself rather than reaching into the board: it is
   * open over the table and the forecast too, and the board's own subscription
   * echoes the move back within a batch.
   */
  setStage: (stage: SalesStageV2) => Promise<void>;
  assign: (userAccountId: string) => Promise<void>;
  assignAI: () => Promise<void>;
  unassign: () => Promise<void>;
}

/**
 * Panel writes. Every one of these mutations answers with the contact itself,
 * so there is nothing optimistic to reconcile — the response *is* the new
 * record, and `apply` merges it.
 *
 * `onFieldCreated` fires after a write that may have brought a brand new
 * attribute into existence, so the catalog can re-bind and the field stops
 * showing as unbound.
 */
export function useDealDetailMutations(
  contactId: string | null,
  fieldNames: string[],
  apply: (patch: DealPatch) => void,
  onFieldCreated: () => void,
): DealDetailMutations {
  const { client } = useDeals();

  return useMemo(() => {
    const required = (): string => {
      if (!contactId) throw new Error('No deal is open');
      return contactId;
    };

    return {
      async setField(attrName, value) {
        const id = required();
        const trimmed = value.trim();
        if (trimmed === '') {
          const data = await client.mutate(DealClearFieldDocument, {
            contactID: id,
            attrName,
            fieldNames,
          });
          apply(data.contactAttributeDelete);
          return;
        }
        const data = await client.mutate(DealSetFieldDocument, {
          contactID: id,
          attrName,
          attrValue: trimmed,
          fieldNames,
        });
        apply(data.contactAttributeUpdate);
        onFieldCreated();
      },
      async rename(name) {
        const data = await client.mutate(DealRenameDocument, { contactID: required(), name });
        apply(data.contactUpdateName);
      },
      async setNote(note) {
        const data = await client.mutate(DealSetNoteDocument, {
          contactID: required(),
          note: note.trim() === '' ? null : note,
        });
        apply(data.contactSetNote);
      },
      async setStage(stage) {
        const data = await client.mutate(DealSetStageDocument, {
          contactID: required(),
          stage,
        });
        apply(data.contactSetSalesStage);
      },
      async assign(userAccountId) {
        const data = await client.mutate(DealAssignDocument, {
          contactID: required(),
          assigneeID: userAccountId,
          fieldNames,
        });
        apply(data.contactSetAssignee);
      },
      async assignAI() {
        const data = await client.mutate(DealAssignAiDocument, {
          contactID: required(),
          fieldNames,
        });
        apply(data.contactSetFuelyAIAssignee);
      },
      async unassign() {
        const data = await client.mutate(DealUnassignDocument, {
          contactID: required(),
          fieldNames,
        });
        apply(data.contactRemoveAssignee);
      },
    };
  }, [client, contactId, fieldNames, apply, onFieldCreated]);
}
