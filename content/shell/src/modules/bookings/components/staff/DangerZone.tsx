import { useState } from 'react';
import { Button, Card, ConfirmDialog, IconTrash } from '~ui';
import type { StaffMutations } from '../../hooks/useStaffMutations';
import { specialistName } from '../../lib/catalogStore';
import { errorMessage } from '../../lib/errors';
import type { SpecialistRecord } from '../../types';

export interface DangerZoneProps {
  record: SpecialistRecord;
  readOnly: boolean;
  mutations: StaffMutations;
  /** After the delete lands — the view leaves the detail pane. */
  onDeleted: () => void;
}

/** Delete the specialist. Not undoable: there is no restore mutation, so it asks first. */
export function DangerZone({ record, readOnly, mutations, onDeleted }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const name = specialistName(record.profile);
  return (
    <Card
      title="Danger zone"
      description="Bookings that reference this specialist keep the name and show it as deleted; nothing on the calendar is removed."
    >
      <div>
        <Button variant="dangerGhost" size="sm" disabled={readOnly} onClick={() => setOpen(true)}>
          <IconTrash size={14} /> Delete specialist
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${name}?`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await mutations.deleteSpecialist(record);
          } catch (err) {
            throw new Error(errorMessage(err), { cause: err });
          }
          onDeleted();
        }}
      >
        <p>
          {name} disappears from the calendar's columns, the wizard and the filters. Their existing bookings stay and
          show “{name}
          (deleted)”. This cannot be undone.
        </p>
      </ConfirmDialog>
    </Card>
  );
}
