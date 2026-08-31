import { useCallback, type KeyboardEvent } from 'react';
import { Alert, Avatar, Button, PageBody } from '~ui';
import { useCatalog } from '../../BookingsCatalogContext';
import { useBookings } from '../../BookingsContext';
import { useStaffFormStore } from '../../hooks/useStaffFormStore';
import { useStaffMutations } from '../../hooks/useStaffMutations';
import { specialistName } from '../../lib/catalogStore';
import { errorCode, errorMessage } from '../../lib/errors';
import {
  canSave,
  formError,
  hasErrors,
  specialistInputOfDraft,
  staffDraftOf,
  validateStaffDraft,
} from '../../lib/staffFormStore';
import type { DisplayZone, SpecialistRecord } from '../../types';
import { DangerZone } from './DangerZone';
import { GoogleCalendarSection } from './GoogleCalendarSection';
import { HoursSection } from './HoursSection';
import { ProfileSection } from './ProfileSection';
import { ServicesSection } from './ServicesSection';

export interface SpecialistDetailProps {
  /** The specialist being edited, or null for "New specialist". */
  record: SpecialistRecord | null;
  canManage: boolean;
  weekStartsOn: number;
  zone: DisplayZone;
  /** After a save lands; `wasNew` → the view navigates to the new id. */
  onSaved: (record: SpecialistRecord, wasNew: boolean) => void;
  onDeleted: () => void;
  onGoToServices: () => void;
}

/**
 * The detail pane: a FORM over a copy of the record (`lib/staffFormStore.ts`,
 * bound by `hooks/useStaffFormStore.ts`), Save / Reset in a sticky header,
 * sections below. The write is one full-replace `specialistUpdate` (or
 * `specialistCreate`); the response is adopted by the catalog and the form
 * re-seeds from it. A failed save keeps the draft and shows the API's code
 * under the field it names.
 */
export function SpecialistDetail({
  record,
  canManage,
  weekStartsOn,
  zone,
  onSaved,
  onDeleted,
  onGoToServices,
}: SpecialistDetailProps) {
  const { client, botId } = useBookings();
  const catalog = useCatalog();
  const mutations = useStaffMutations();
  const { state, dispatch, dirty } = useStaffFormStore(record);
  const recordId = record?.id ?? null;

  const save = useCallback(async () => {
    if (!canManage || state.saving) return;
    dispatch({ type: 'attempted' });
    if (hasErrors(validateStaffDraft(state.draft))) return;
    dispatch({ type: 'saveStarted' });
    try {
      const saved = await mutations.saveSpecialist(recordId, specialistInputOfDraft(state.draft));
      dispatch({ type: 'saveSucceeded', draft: staffDraftOf(saved) });
      onSaved(saved, recordId === null);
    } catch (err) {
      dispatch({ type: 'saveFailed', code: errorCode(err), message: errorMessage(err) });
    }
  }, [canManage, state.saving, state.draft, mutations, recordId, onSaved, dispatch]);

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
  };

  const name = record ? specialistName(record.profile) : 'New specialist';
  const draftName = specialistName({ firstName: state.draft.firstName, lastName: state.draft.lastName });
  const readOnly = !canManage;
  const topError = formError(state);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      onKeyDown={onKeyDown}
      aria-label={record ? `Edit ${name}` : 'New specialist'}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-gutter py-2">
        <Avatar src={state.draft.logo?.url ?? null} name={state.draft.firstName ? draftName : name} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-text">
            {state.draft.firstName.trim() ? draftName : name}
          </div>
          <div className="text-xs text-text-muted">
            {dirty ? 'Unsaved changes' : record ? 'Saved' : 'Not saved yet'}
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dirty || state.saving}
              onClick={() => dispatch({ type: 'reset', draft: staffDraftOf(record) })}
            >
              Reset
            </Button>
            <Button type="submit" size="sm" disabled={!canSave(state)} loading={state.saving}>
              {record ? 'Save' : 'Create'}
            </Button>
          </div>
        ) : null}
      </div>

      <PageBody measure="form">
        <div className="flex flex-col gap-4">
          {!canManage ? (
            <Alert tone="info" title="Read only">
              Your role can see specialists but not change them — editing needs the Ai · Edit permission on this bot.
            </Alert>
          ) : null}
          {topError ? <Alert tone="danger">{topError}</Alert> : null}
          <ProfileSection
            state={state}
            dispatch={dispatch}
            readOnly={readOnly}
            botId={botId}
            uploadFile={client.uploadFile}
          />
          <ServicesSection
            state={state}
            dispatch={dispatch}
            services={catalog.state.services}
            readOnly={readOnly}
            onGoToServices={onGoToServices}
          />
          <HoursSection
            state={state}
            dispatch={dispatch}
            readOnly={readOnly}
            weekStartsOn={weekStartsOn}
            botZone={zone.botZone}
          />
          {record ? (
            <>
              <GoogleCalendarSection record={record} readOnly={readOnly} mutations={mutations} zone={zone.zone} />
              <DangerZone record={record} readOnly={readOnly} mutations={mutations} onDeleted={onDeleted} />
            </>
          ) : (
            <p className="text-xs text-text-faint">Google Calendar can be connected once the specialist is created.</p>
          )}
        </div>
      </PageBody>
    </form>
  );
}
