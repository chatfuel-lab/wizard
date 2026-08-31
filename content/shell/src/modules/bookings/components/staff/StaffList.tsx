import { useMemo } from 'react';
import { Button, EmptyState, IconPlus, IconUsers, ResourceHeader, Skeleton, Tooltip, type EventChipTone } from '~ui';
import { specialistName } from '../../lib/catalogStore';
import { specialistTone } from '../../lib/colors';
import type { Density } from '../../lib/layout';
import { scheduleSummary } from '../../lib/schedule';
import { taskView } from '../../lib/taskState';
import type { SpecialistRecord } from '../../types';

export interface StaffListProps {
  specialists: readonly SpecialistRecord[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  canManage: boolean;
  density: Density;
  weekStartsOn: number;
}

type CalendarState = 'connected' | 'link' | 'none';

const CALENDAR_LABEL: Record<CalendarState, string> = {
  connected: 'Google Calendar connected',
  link: 'Connection link sent, calendar not connected yet',
  none: 'No Google Calendar',
};

const CALENDAR_DOT: Record<CalendarState, string> = {
  connected: 'bg-success',
  link: 'bg-warning',
  none: 'bg-border-strong',
};

const ROW_PAD: Record<Density, string> = { comfortable: 'py-2.5', compact: 'py-1.5' };

function calendarState(record: SpecialistRecord): CalendarState {
  if (record.connectedGoogleCalendar) return 'connected';
  if (record.googleCalendarConnectionLink) return 'link';
  return 'none';
}

/**
 * The master list: one row per specialist — avatar, name, tone dot (the same
 * colour their bookings wear on the calendar), services count, the hours
 * summary, and a Google Calendar dot (green connected · amber link out ·
 * grey none). Order is the catalog's, which is what makes the tone stable.
 */
export function StaffList({
  specialists,
  loading,
  selectedId,
  onSelect,
  onNew,
  canManage,
  density,
  weekStartsOn,
}: StaffListProps) {
  const order = useMemo(() => specialists.map((s) => s.id), [specialists]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-text-muted">
          {loading && specialists.length === 0
            ? 'Loading…'
            : `${specialists.length} ${specialists.length === 1 ? 'specialist' : 'specialists'}`}
        </span>
        {canManage ? (
          <Button size="xs" variant="ghost" onClick={onNew}>
            <IconPlus size={14} /> Add
          </Button>
        ) : null}
      </div>

      {loading && specialists.length === 0 ? (
        <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading specialists">
          <Skeleton variant="block" height="2.5rem" />
          <Skeleton variant="block" height="2.5rem" />
          <Skeleton variant="block" height="2.5rem" />
        </div>
      ) : specialists.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No specialists yet"
          description="Specialists are who customers book. Each has working hours and the services they offer."
          action={canManage ? <Button onClick={onNew}>Add your first specialist</Button> : undefined}
        />
      ) : (
        <ul role="list" aria-label="Specialists" className="min-h-0 flex-1 overflow-y-auto">
          {specialists.map((record) => {
            const name = specialistName(record.profile);
            const tone = specialistTone(record.id, order);
            const chipTone: EventChipTone = tone === 0 ? 'neutral' : (tone as EventChipTone);
            const cal = calendarState(record);
            const sync = taskView(record.latestGoogleCalendarSyncTask);
            const selected = record.id === selectedId;
            const services = record.services.length;
            return (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => onSelect(record.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex w-full items-center gap-2 border-b border-border px-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${ROW_PAD[density]} ${selected ? 'bg-accent-soft' : ''}`}
                >
                  <ResourceHeader
                    size="md"
                    name={name}
                    avatarSrc={record.profile.logo?.url || null}
                    tone={chipTone}
                    meta={`${services} ${services === 1 ? 'service' : 'services'} · ${scheduleSummary(record.schedule, weekStartsOn)}`}
                    className="min-w-0 flex-1"
                    actions={
                      <Tooltip label={sync?.running ? `${CALENDAR_LABEL[cal]} · ${sync.label}` : CALENDAR_LABEL[cal]}>
                        <span
                          className="flex h-6 w-6 items-center justify-center"
                          aria-label={CALENDAR_LABEL[cal]}
                          role="img"
                        >
                          <span
                            aria-hidden
                            className={`h-2 w-2 rounded-full ${CALENDAR_DOT[cal]} ${sync?.running ? 'animate-pulse' : ''}`}
                          />
                        </span>
                      </Tooltip>
                    }
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
