import { useCallback } from 'react';
import { useToast } from '~ui';
import { useKnowledgeUndo } from '../../KnowledgeBaseUndoContext';
import { useKnowledge } from '../../KnowledgeBaseStoreContext';
import { useKnowledgeDraft } from '../../hooks/useKnowledgeDraft';
import { messageFor } from '../../lib/errors';
import { FIELD_META, warnFor, type BusinessField } from '../../lib/profileFields';
import { ProfileField } from './ProfileField';
import { SectionSaveBar } from './SectionSaveBar';

export interface ProfileFieldRowProps {
  field: BusinessField;
  /** The value the store currently holds for this field. */
  serverValue: string;
  canEdit: boolean;
}

/**
 * One field of the business profile, as a draft.
 *
 * The row owns the draft, the write and the undo offer; the page owns the one
 * Save button, which reaches every row through the draft registry. That split
 * is why each field is a component rather than a `useKnowledgeDraft` call in a
 * loop inside the page — hooks in a loop over a constant array happen to work
 * and stop working the moment the array is filtered.
 *
 * Undo is a compensating write of the previous string through the same setter
 * (`lib/undo.ts`): the server keeps no history, so there is nothing to revert
 * to except a value we still remember.
 */
export function ProfileFieldRow({ field, serverValue, canEdit }: ProfileFieldRowProps) {
  const store = useKnowledge();
  const undo = useKnowledgeUndo();
  const toast = useToast();
  const meta = FIELD_META[field];

  const write = useCallback(
    async (value: string, previous: string) => {
      await store.saveField(field, value);

      const revert = () => {
        void store.saveField(field, previous).catch((failure: unknown) => {
          toast.show({ title: 'Could not undo', description: messageFor(failure), tone: 'danger' });
        });
      };
      undo.push({ kind: 'field', field, label: meta.label, at: Date.now() }, revert);
      toast.show({
        title: `${meta.label} saved`,
        tone: 'success',
        /* Not `undo.run`: this callback was built in an earlier render and that
           `run` still closes over the previous pending entry. Clearing (stable)
           and reverting directly is the same thing without the staleness. */
        action: {
          label: 'Undo',
          onClick: () => {
            undo.clear();
            revert();
          },
        },
      });
    },
    [store, undo, toast, field, meta.label],
  );

  const draft = useKnowledgeDraft('profile', field, serverValue, write);

  return (
    <ProfileField
      field={field}
      value={draft.value}
      onChange={draft.set}
      disabled={!canEdit}
      warning={warnFor(field, draft.value)}
      footer={
        <SectionSaveBar
          dirty={false}
          error={draft.error}
          conflict={draft.conflict}
          onUseTheirs={draft.useTheirs}
          onKeepMine={draft.keepMine}
          canEdit={canEdit}
          divider={false}
        />
      }
    />
  );
}
