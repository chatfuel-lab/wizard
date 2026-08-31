import { useEffect, useReducer, useRef, type Dispatch } from 'react';
import {
  initialStaffForm,
  isDirty,
  staffDraftOf,
  staffFormReducer,
  type StaffFormAction,
  type StaffFormState,
} from '../lib/staffFormStore';
import type { SpecialistRecord } from '../types';

export interface StaffFormStore {
  state: StaffFormState;
  dispatch: Dispatch<StaffFormAction>;
  dirty: boolean;
}

/**
 * `staffFormReducer` seeded from one specialist record (or null for "New
 * specialist"). A different specialist (or "new") gets a fresh form, dirty or
 * not; the SAME specialist arriving as a fresh record (catalog refresh, a
 * sync-task push) re-seeds only a clean form — what someone is typing is
 * never thrown away.
 */
export function useStaffFormStore(record: SpecialistRecord | null): StaffFormStore {
  const [state, dispatch] = useReducer(staffFormReducer, record, (r) => initialStaffForm(staffDraftOf(r)));
  const recordId = record?.id ?? null;
  const dirty = isDirty(state);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const seededIdRef = useRef(recordId);

  // A different specialist (or "new") → a fresh form, dirty or not. The same
  // specialist arriving as a fresh record (catalog refresh, a sync-task push)
  // re-seeds only a clean form.
  useEffect(() => {
    const switched = seededIdRef.current !== recordId;
    seededIdRef.current = recordId;
    if (switched || !dirtyRef.current) dispatch({ type: 'reset', draft: staffDraftOf(record) });
  }, [record, recordId]);

  return { state, dispatch, dirty };
}
