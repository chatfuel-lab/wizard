import { Select, useToast } from '~ui';
import type { SalesStageV2 } from '~api/generated/contacts/graphql';
import { useContactsUndo } from '../../ContactsUndoContext';
import { STAGES, STAGE_META, stageLabel } from '../../lib/contactFields';

export interface StageControlProps {
  stage: SalesStageV2 | null;
  disabled?: boolean;
  onChange: (stage: SalesStageV2) => Promise<void>;
  className?: string;
}

/**
 * The contact's stage.
 *
 * There is no "clear the stage": `contactSetSalesStage` takes a non-null
 * `SalesStageV2`, so a contact that has never been staged can be moved into one
 * of the six and never back to nothing. The empty option is therefore a
 * placeholder rather than a choice — offering "None" would produce a control
 * that cannot do what it says.
 *
 * The undo offer is pushed only when there IS somewhere to go back to. Undo
 * here is a compensating forward mutation, and for a contact whose stage was
 * null there is no mutation that restores null.
 */
export function StageControl({ stage, disabled, onChange, className }: StageControlProps) {
  const undo = useContactsUndo();
  const toast = useToast();

  return (
    <Select
      aria-label="Stage"
      className={className}
      value={stage ?? ''}
      placeholder="No stage"
      disabled={disabled}
      options={STAGES.map((value) => ({ value, label: STAGE_META[value].label }))}
      onChange={(next) => {
        const target = next as SalesStageV2;
        if (target === stage) return;
        const previous = stage;
        void onChange(target)
          .then(() => {
            if (!previous) return;
            undo.push({
              label: `Moved to ${stageLabel(target)} — back to ${stageLabel(previous)}?`,
              run: () => onChange(previous),
            });
          })
          /* A move that failed has to say so. This `Select` is controlled by
             the record, so a refused mutation snaps it back on its own and the
             only evidence left would be a stage that quietly did not change. */
          .catch((err: unknown) => {
            toast.show({
              tone: 'danger',
              title: `Could not move this contact to ${stageLabel(target)}`,
              description: err instanceof Error ? err.message : undefined,
            });
          });
      }}
    />
  );
}
