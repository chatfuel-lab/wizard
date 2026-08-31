import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DurationInput,
  EmptyState,
  IconClock,
  IconWarning,
  Skeleton,
  TimeInput,
  formatHHmm,
  parseHHmm,
} from '~ui';
import type { Availability } from '../../hooks/useAvailability';
import { specialistName } from '../../lib/catalogStore';
import { dayLabel, minuteLabel, type LabelOptions } from '../../lib/panelForm';
import {
  groupSlots,
  noSlotsReason,
  slotInstant,
  slotsFor,
  type NoSlotsReason,
  type Slot,
  type SlotPart,
} from '../../lib/slots';
import {
  isOutsideSchedule,
  slotToTime,
  wantedSpecialistIds,
  type ServiceChoice,
  type SpecialistChoice,
  type WizardTime,
} from '../../lib/wizardStore';
import { dayKeyInZone, wallClock, zonedInstant } from '../../lib/zone';
import type { DisplayZone, SpecialistRecord } from '../../types';

export interface TimeStepProps {
  service: ServiceChoice;
  specialist: SpecialistChoice;
  /** Specialists offering the service (everyone when no service) — the ones "anyone" spans. */
  offering: readonly SpecialistRecord[];
  dayKey: string;
  /** `useAvailability(serviceId, dayKey, botZone)` — owned by the wizard so the cache outlives this step. */
  availability: Availability;
  time: WizardTime | null;
  customTime: boolean;
  onTime: (time: WizardTime) => void;
  onCustomTimeToggle: (on: boolean) => void;
  zone: DisplayZone;
  todayKey: string;
  now: number;
  labels: LabelOptions;
}

const PART_LABELS: Record<SlotPart, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

/**
 * Step 4: when. Real availability — `BookingAvailability` for the service ×
 * the day (`useAvailability`), sliced into starts by `slotsFor` (inclusive-end
 * start periods, bot-zone `HH:mm`) and grouped morning / afternoon / evening.
 * "Anyone" shows the union across the specialists offering the service, each
 * chip saying who takes it ("with Maria"). Today hides starts already gone.
 * A slot click chooses AND advances (the wizard's `onTime` does that for
 * `source: 'slot'`); the stepper is the way back.
 *
 * Every chip prints the DISPLAY zone's clock; when that is not the bot's, the
 * bot time rides along in small print, because the schedule the slot came
 * from is in bot time and the customer will be told the bot time.
 *
 * "Custom time" is the operator's escape hatch — a typed start and duration,
 * with a warning when it falls outside the specialist's hours (allowed by the
 * API; the warning is the whole safeguard). No service picked → custom only,
 * since availability needs a service to slice for.
 */
export function TimeStep({
  service,
  specialist,
  offering,
  dayKey,
  availability,
  time,
  customTime,
  onTime,
  onCustomTimeToggle,
  zone,
  todayKey,
  now,
  labels,
}: TimeStepProps) {
  const botZone = zone.botZone ?? 'UTC';
  const serviceId = service.kind === 'service' ? service.id : null;
  const duration = service.kind === 'service' ? service.durationMinutes : null;

  const offeringIds = useMemo(() => offering.map((sp) => sp.id), [offering]);
  const wanted = useMemo(() => wantedSpecialistIds(specialist, offeringIds), [specialist, offeringIds]);
  const nameOf = useCallback(
    (id: string | null) => {
      const sp = offering.find((s) => s.id === id);
      return sp ? specialistName(sp.profile) : 'Unassigned';
    },
    [offering],
  );
  // Chips have room for a first name only.
  const firstNameOf = useCallback(
    (id: string | null) => {
      const sp = offering.find((s) => s.id === id);
      return sp ? sp.profile.firstName.trim() || specialistName(sp.profile) : 'Unassigned';
    },
    [offering],
  );

  // Today in the bot zone hides starts already gone; the API has no "now".
  const notBefore = dayKeyInZone(now, botZone) === dayKey ? wallClock(now, botZone).minuteOfDay : null;

  const slots = useMemo<Slot[]>(
    () => (availability.entries ? slotsFor(availability.entries, { specialistIds: wanted, notBefore }) : []),
    [availability.entries, wanted, notBefore],
  );
  const groups = useMemo(() => groupSlots(slots), [slots]);
  const reason: NoSlotsReason | null =
    availability.entries && slots.length === 0 ? noSlotsReason(availability.entries, wanted) : null;
  const allPassed = availability.entries !== null && slots.length === 0 && reason === null;

  const showsBotTime = zone.botZone !== null && zone.botZone !== zone.zone;
  const chipLabel = (slot: Slot) => {
    const at = slotInstant(dayKey, slot.minute, botZone);
    return minuteLabel(wallClock(at, zone.zone).minuteOfDay, labels);
  };
  const isSelected = (slot: Slot) =>
    time?.source === 'slot' && time.start === slotInstant(dayKey, slot.minute, botZone);

  const customOnly = serviceId === null;
  const showCustom = customOnly || customTime;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm text-text">
          <span className="font-medium">{dayLabel(dayKey, { ...labels, todayKey })}</span>
          <span className="text-text-muted">
            {' '}
            · {specialist.kind === 'one' ? `with ${nameOf(specialist.id)}` : 'anyone'}
            {duration !== null ? ` · ${duration} min` : ''}
          </span>
        </div>
        {!customOnly ? (
          <Button
            size="sm"
            variant={customTime ? 'secondary' : 'ghost'}
            aria-pressed={customTime}
            onClick={() => onCustomTimeToggle(!customTime)}
          >
            <IconClock size={14} />
            Custom time
          </Button>
        ) : null}
      </div>

      {!customOnly ? (
        availability.loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading free slots">
            <Skeleton variant="text" className="w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} variant="block" className="h-8 w-16" />
              ))}
            </div>
          </div>
        ) : availability.error ? (
          <Alert
            tone="danger"
            title="Could not load free slots"
            action={
              <Button size="sm" variant="secondary" onClick={availability.refetch}>
                Retry
              </Button>
            }
          >
            {availability.error}
          </Alert>
        ) : slots.length > 0 ? (
          <div className="space-y-3" aria-live="polite">
            {availability.stale ? <p className="text-xs text-text-faint">Refreshing free slots…</p> : null}
            {groups.map((group) => (
              <div key={group.part}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {PART_LABELS[group.part]}
                </h4>
                <div role="radiogroup" aria-label={`${PART_LABELS[group.part]} slots`} className="flex flex-wrap gap-2">
                  {group.slots.map((slot) => {
                    const selected = isSelected(slot);
                    const who = specialist.kind === 'one' ? null : firstNameOf(slot.specialistIds[0] ?? null);
                    return (
                      <button
                        key={slot.minute}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onTime(slotToTime(dayKey, slot, duration ?? 30, botZone, specialist))}
                        className={`flex min-w-16 flex-col items-center rounded-control border px-2.5 py-1.5 text-sm tabular-nums transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
                          selected
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border bg-surface-raised text-text'
                        }`}
                      >
                        <span className="font-medium">{chipLabel(slot)}</span>
                        {showsBotTime ? (
                          <span className="text-micro text-text-faint">{formatHHmm(slot.minute)} bot</span>
                        ) : null}
                        {who ? <span className="text-micro text-text-muted">with {who}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : customTime ? null : (
          <NoSlots
            reason={reason}
            allPassed={allPassed}
            specialist={specialist}
            offering={offering}
            nameOf={nameOf}
            onCustom={() => onCustomTimeToggle(true)}
          />
        )
      ) : null}

      {showCustom ? (
        <CustomTime
          dayKey={dayKey}
          time={time}
          duration={duration}
          specialist={specialist}
          offering={offering}
          zone={zone}
          now={now}
          customOnly={customOnly}
          nameOf={nameOf}
          onTime={onTime}
        />
      ) : null}
    </div>
  );
}

function NoSlots({
  reason,
  allPassed,
  specialist,
  offering,
  nameOf,
  onCustom,
}: {
  reason: NoSlotsReason | null;
  allPassed: boolean;
  specialist: SpecialistChoice;
  offering: readonly SpecialistRecord[];
  nameOf: (id: string | null) => string;
  onCustom: () => void;
}) {
  const one = specialist.kind === 'one' ? specialist.id : null;
  const who = one ? nameOf(one) : 'Nobody offering this service';
  const staffHref = one ? `/bookings/staff?s=${encodeURIComponent(one)}` : '/bookings/staff';
  const custom = (
    <Button size="sm" variant="secondary" onClick={onCustom}>
      Enter a time anyway
    </Button>
  );
  const staffLink = (label: string) => (
    <a
      href={staffHref}
      className="inline-flex h-8 items-center rounded-control px-3 text-sm text-accent hover:underline focus-visible:focus-ring"
    >
      {label}
    </a>
  );
  const actions = (link: string | null) => (
    <div className="flex flex-wrap justify-center gap-2">
      {link ? staffLink(link) : null}
      {custom}
    </div>
  );
  if (allPassed)
    return (
      <EmptyState
        icon={<IconClock />}
        title="No more free slots today"
        description="Every remaining start has passed. Pick another day, or enter a time."
        action={actions(null)}
      />
    );
  switch (reason) {
    case 'no-schedule':
      return (
        <EmptyState
          icon={<IconClock />}
          title={`${who} has no working hours yet`}
          description="Availability needs a weekly schedule. Set one up in Staff, or enter a time yourself."
          action={actions('Set up in Staff')}
        />
      );
    case 'day-off':
      return (
        <EmptyState
          icon={<IconClock />}
          title={one ? `${who} does not work this day` : 'A day off for everyone offering this'}
          description="Pick another day, or enter a time outside the schedule."
          action={actions(null)}
        />
      );
    case 'fully-booked':
      return (
        <EmptyState
          icon={<IconClock />}
          title="Fully booked"
          description="Every start this day is taken. Pick another day, or overlap on purpose with a custom time."
          action={actions(null)}
        />
      );
    case 'no-specialists':
      return (
        <EmptyState
          icon={<IconClock />}
          title={offering.length === 0 ? 'No specialist offers this service' : `${who} is not offering this service`}
          description="Assign the service to a specialist in Staff, or enter a time and leave the booking unassigned."
          action={actions('Open Staff')}
        />
      );
    default:
      return (
        <EmptyState
          icon={<IconClock />}
          title="No free slots"
          description="Pick another day, or enter a time."
          action={actions(null)}
        />
      );
  }
}

function CustomTime({
  dayKey,
  time,
  duration,
  specialist,
  offering,
  zone,
  now,
  customOnly,
  nameOf,
  onTime,
}: {
  dayKey: string;
  time: WizardTime | null;
  duration: number | null;
  specialist: SpecialistChoice;
  offering: readonly SpecialistRecord[];
  zone: DisplayZone;
  now: number;
  customOnly: boolean;
  nameOf: (id: string | null) => string;
  onTime: (time: WizardTime) => void;
}) {
  // The local draft: a start `HH:mm` in the display zone and a duration. Seeded from the current time when there is one.
  const seed = time && (time.source !== 'slot' || customOnly) ? time : null;
  const [start, setStart] = useState<string | null>(() =>
    seed ? formatHHmm(wallClock(seed.start, zone.zone).minuteOfDay) : null,
  );
  const [minutes, setMinutes] = useState<number | null>(() =>
    seed ? Math.round((seed.end - seed.start) / 60_000) : duration,
  );

  // Re-issue the instants whenever the draft or the day changes.
  useEffect(() => {
    const minute = start ? parseHHmm(start) : null;
    if (minute === null || !minutes || minutes <= 0) return;
    const at = zonedInstant(dayKey, minute, zone.zone);
    const end = at + minutes * 60_000;
    if (time && time.source === 'custom' && time.start === at && time.end === end) return;
    const specialistId = specialist.kind === 'one' ? specialist.id : null;
    onTime({ start: at, end, specialistId, source: 'custom' });
    // `time` is compared, not depended on: it is what this effect writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, minutes, dayKey, zone.zone, specialist]);

  const botZone = zone.botZone ?? 'UTC';
  const draft = time?.source === 'custom' ? time : null;
  const warnings: string[] = [];
  if (draft) {
    if (draft.start < now) warnings.push('This time has already passed.');
    if (specialist.kind === 'one') {
      const sp = offering.find((s) => s.id === specialist.id);
      if (sp && isOutsideSchedule(sp.schedule, draft.start, draft.end, botZone))
        warnings.push(`Outside ${nameOf(sp.id)}’s working hours.`);
    } else if (
      offering.length > 0 &&
      offering.every((sp) => isOutsideSchedule(sp.schedule, draft.start, draft.end, botZone))
    ) {
      warnings.push('Outside every specialist’s working hours — the booking will be unassigned.');
    }
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-sunken p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-text-muted">
            Start{zone.botZone && zone.botZone !== zone.zone ? ` (${zone.zone})` : ''}
          </span>
          <TimeInput value={start} onChange={setStart} step={15} aria-label="Start time" />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-text-muted">Duration</span>
          <DurationInput value={minutes} onChange={setMinutes} aria-label="Duration" size="sm" />
        </div>
      </div>
      {draft && zone.botZone && zone.botZone !== zone.zone ? (
        <p className="text-xs text-text-faint">
          {formatHHmm(wallClock(draft.start, botZone).minuteOfDay)} –{' '}
          {formatHHmm(wallClock(draft.end, botZone).minuteOfDay)} in bot time ({zone.botZone}).
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <div role="status" className="flex items-start gap-2 text-xs text-warning">
          <IconWarning size={14} className="mt-0.5 shrink-0" />
          <span>{warnings.join(' ')} The API allows it; this is only a warning.</span>
        </div>
      ) : null}
      {customOnly ? (
        <p className="text-xs text-text-faint">
          No service was picked, so there is no availability to offer — enter the time.
        </p>
      ) : null}
    </div>
  );
}
