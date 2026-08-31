import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, EmptyState, IconUsers, Skeleton, SplitPane } from '~ui';
import { useCatalog } from '../BookingsCatalogContext';
import { SpecialistDetail } from '../components/staff/SpecialistDetail';
import { StaffList } from '../components/staff/StaffList';
import { specialistById } from '../lib/catalogStore';
import { masterDetail } from '../lib/layout';
import type { SpecialistRecord } from '../types';
import type { BookingsViewProps } from './types';

/**
 * Staff: master–detail over the catalog's specialists. `?s=` is the selected
 * id or `new`; from `wide` up the list and the detail sit side by side
 * (`SplitPane`), below that the detail replaces the list and a back control
 * appears. The data is the shared catalog (no fetch of its own); the writes
 * are in `hooks/useStaffMutations.ts` and `hooks/useGoogleCalendarSync.ts`.
 */
export function StaffView({
  params,
  onParams,
  band,
  role,
  zone,
  weekStartsOn,
  density,
  onCount,
  onBusy,
  refreshToken,
}: BookingsViewProps) {
  const catalog = useCatalog();
  const { specialists, loading, error } = catalog.state;
  const selected = params.s;
  const record: SpecialistRecord | null = useMemo(
    () => (selected && selected !== 'new' ? specialistById(catalog.state, selected) : null),
    [catalog.state, selected],
  );
  const isNew = selected === 'new';

  useEffect(
    () => onCount(loading && specialists.length === 0 ? null : specialists.length),
    [onCount, loading, specialists.length],
  );
  useEffect(() => onBusy(loading), [onBusy, loading]);
  const refresh = catalog.refresh;
  useEffect(() => {
    if (refreshToken > 0) refresh();
  }, [refreshToken, refresh]);

  // A stale `?s=` (deleted elsewhere, or a typo) shows the empty detail rather than a broken one.
  const missing = Boolean(selected && !isNew && !loading && specialists.length > 0 && !record);

  const select = useCallback((id: string | null) => onParams({ s: id }), [onParams]);
  const goToServices = useCallback(() => onParams({ view: 'services' }), [onParams]);
  const onSaved = useCallback(
    (saved: SpecialistRecord, wasNew: boolean) => {
      if (wasNew) select(saved.id);
    },
    [select],
  );
  const onDeleted = useCallback(() => select(null), [select]);

  const showing = selected ? 'detail' : 'side';
  const split = masterDetail(band) === 'split';

  const detail = isNew ? (
    <SpecialistDetail
      key="new"
      record={null}
      canManage={role.canManage}
      weekStartsOn={weekStartsOn}
      zone={zone}
      onSaved={onSaved}
      onDeleted={onDeleted}
      onGoToServices={goToServices}
    />
  ) : record ? (
    <SpecialistDetail
      key={record.id}
      record={record}
      canManage={role.canManage}
      weekStartsOn={weekStartsOn}
      zone={zone}
      onSaved={onSaved}
      onDeleted={onDeleted}
      onGoToServices={goToServices}
    />
  ) : selected && loading ? (
    <div className="flex flex-col gap-3 p-gutter" aria-busy="true" aria-label="Loading specialist">
      <Skeleton variant="block" height="3rem" />
      <Skeleton variant="block" height="12rem" />
    </div>
  ) : missing ? (
    <EmptyState
      icon={<IconUsers />}
      title="That specialist is gone"
      description="It may have been deleted in another tab."
      action={
        <Button variant="secondary" onClick={() => select(null)}>
          Back to the list
        </Button>
      }
    />
  ) : split ? (
    <EmptyState
      icon={<IconUsers />}
      title={specialists.length === 0 && !loading ? 'Add your first specialist' : 'Pick a specialist'}
      description={
        specialists.length === 0 && !loading
          ? 'Specialists are who customers book — each with working hours, services and, optionally, a Google Calendar.'
          : 'Their profile, services, working hours and Google Calendar open here.'
      }
      action={
        role.canManage && specialists.length === 0 && !loading ? (
          <Button onClick={() => select('new')}>Add specialist</Button>
        ) : undefined
      }
    />
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <Alert
          tone="danger"
          title="Could not load specialists"
          className="m-gutter mb-0"
          action={
            <Button size="sm" variant="secondary" onClick={() => catalog.refresh()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      <SplitPane
        side={
          <StaffList
            specialists={specialists}
            loading={loading}
            selectedId={record?.id ?? null}
            onSelect={select}
            onNew={() => select('new')}
            canManage={role.canManage}
            density={density}
            weekStartsOn={weekStartsOn}
          />
        }
        sideLabel="Specialists"
        sideWidth="list"
        collapseBelow="wide"
        showing={showing}
        onShowingChange={(next) => next === 'side' && select(null)}
      >
        {detail}
      </SplitPane>
    </div>
  );
}
