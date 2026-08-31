import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Button, IconChevronLeft, Stepper, usesHour12, type StepperStep } from '~ui';
import { useCatalog } from '../../BookingsCatalogContext';
import { useSettings } from '../../BookingsSettingsContext';
import { useAvailability } from '../../hooks/useAvailability';
import { useWizardCreate } from '../../hooks/useWizardCreate';
import { useWizardFocus } from '../../hooks/useWizardFocus';
import { useWizardStore } from '../../hooks/useWizardStore';
import type { NewBookingPrefill } from '../../lib/bookingsParams';
import {
  bookableServices,
  serviceById,
  specialistById,
  specialistName,
  specialistsForService,
} from '../../lib/catalogStore';
import { wizardHost, type Band } from '../../lib/layout';
import type { LabelOptions } from '../../lib/panelForm';
import {
  STEP_LABELS,
  WIZARD_STEPS,
  canGoTo,
  nextStep,
  prevStep,
  stepProblem,
  stepStatuses,
  stepValid,
  type WizardAction,
  type WizardOpenInput,
  type WizardStep,
} from '../../lib/wizardStore';
import { NOW_TICK_MS, dayKeyInZone, wallClock, zonedInstant } from '../../lib/zone';
import type { BookingRecord, DisplayZone } from '../../types';
import { ConfirmStep } from './ConfirmStep';
import { CustomerPicker } from './CustomerPicker';
import { DayStep } from './DayStep';
import { ServiceStep } from './ServiceStep';
import { SpecialistStep } from './SpecialistStep';
import { TimeStep } from './TimeStep';
import { WizardFrame } from './WizardFrame';

export interface NewBookingWizardProps {
  open: boolean;
  /** From `?new=…` or a grid drag; every field optional. */
  prefill: NewBookingPrefill | null;
  onClose: () => void;
  /** The created record — the workspace opens it in the panel. */
  onCreated: (booking: BookingRecord) => void;
  band: Band;
  zone: DisplayZone;
  todayKey: string;
  weekStartsOn: number;
  canEdit: boolean;
}

/**
 * The "New booking" wizard: service → specialist → day → time (real
 * availability) → customer → confirm. State and rules are `lib/wizardStore.ts`,
 * bound to the open/close lifecycle by `hooks/useWizardStore.ts`; this wires
 * the steps, the availability cache, the keyboard (Enter advances when the
 * step is valid; Escape closes through the overlay; the Stepper goes back),
 * the focus (`hooks/useWizardFocus.ts`) and the create itself
 * (`hooks/useWizardCreate.ts`), which ends with `onCreated` opening the panel
 * on the new record.
 *
 * Always mounted by the workspace; the overlay mounts the body only while
 * open, and every open resets the state from the prefill.
 */
export function NewBookingWizard({
  open,
  prefill,
  onClose,
  onCreated,
  band,
  zone,
  todayKey,
  weekStartsOn,
  canEdit,
}: NewBookingWizardProps) {
  const catalog = useCatalog();
  const settings = useSettings();

  const botZone = zone.botZone;
  const countryCode = settings.state.countryCode;

  const openInput = useCallback((): WizardOpenInput => {
    const service = serviceById(catalog.state, prefill?.service);
    const specialist = specialistById(catalog.state, prefill?.specialist);
    let span: WizardOpenInput['span'] = null;
    if (prefill?.start && prefill.end) {
      const start = new Date(prefill.start).getTime();
      const end = new Date(prefill.end).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start)
        span = { start, end, dayKey: dayKeyInZone(start, botZone ?? 'UTC') };
    }
    return {
      service: service
        ? { id: service.id, durationMinutes: Math.max(5, Math.round(service.durationSeconds / 60)) }
        : null,
      specialistId: specialist?.id ?? null,
      span,
      contactId: prefill?.contact ?? null,
      todayKey,
      countryCode,
    };
  }, [catalog.state, prefill, botZone, todayKey, countryCode]);

  const catalogLoaded = catalog.state.loadedAt !== null;
  const { state, dispatch } = useWizardStore(open, openInput, catalogLoaded, countryCode);

  // "Now", refreshed while open (past starts hide, "already passed" warns).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => window.clearInterval(timer);
  }, [open]);

  const labels = useMemo<LabelOptions>(() => ({ hour12: usesHour12(), todayKey }), [todayKey]);

  // Catalog views of the current choices.
  const services = useMemo(() => bookableServices(catalog.state), [catalog.state]);
  const hiddenServices = catalog.state.services.length - services.length;
  const serviceId = state.service.kind === 'service' ? state.service.id : null;
  const service = serviceById(catalog.state, serviceId);
  const offering = useMemo(
    () => (serviceId ? specialistsForService(catalog.state, serviceId) : catalog.state.specialists),
    [catalog.state, serviceId],
  );
  const chosenSpecialist = specialistById(
    catalog.state,
    state.time?.specialistId ?? (state.specialist.kind === 'one' ? state.specialist.id : null),
  );
  const schedulesFor = useMemo(
    () =>
      state.specialist.kind === 'one'
        ? [specialistById(catalog.state, state.specialist.id)?.schedule]
        : offering.map((sp) => sp.schedule),
    [state.specialist, catalog.state, offering],
  );

  // The availability cache lives here, above the steps, so it survives step changes and re-opens.
  const availability = useAvailability(open ? serviceId : null, state.dayKey, botZone);

  // ---- step handlers ------------------------------------------------------

  const chooseService = useCallback(
    (choice: Extract<WizardAction, { type: 'serviceChosen' }>['choice']) => {
      dispatch({ type: 'serviceChosen', choice });
      // A specialist who does not offer the new service falls back to "anyone".
      if (state.specialist.kind === 'one' && choice.kind === 'service') {
        const still = specialistsForService(catalog.state, choice.id).some(
          (sp) => sp.id === (state.specialist as { id: string }).id,
        );
        if (!still) dispatch({ type: 'specialistChosen', choice: { kind: 'anyone' } });
      }
      dispatch({ type: 'next' });
    },
    [state.specialist, catalog.state, dispatch],
  );

  const chooseSpecialist = useCallback(
    (choice: Extract<WizardAction, { type: 'specialistChosen' }>['choice']) => {
      dispatch({ type: 'specialistChosen', choice });
      dispatch({ type: 'next' });
    },
    [dispatch],
  );

  const chooseDay = useCallback(
    (dayKey: string) => {
      dispatch({ type: 'dayChosen', dayKey });
      // A custom or prefilled span keeps its wall clock on the new day.
      if (state.time && state.time.source !== 'slot' && state.dayKey !== dayKey) {
        const minute = wallClock(state.time.start, zone.zone).minuteOfDay;
        const start = zonedInstant(dayKey, minute, zone.zone);
        dispatch({
          type: 'timeChosen',
          time: { ...state.time, start, end: start + (state.time.end - state.time.start) },
        });
      }
      dispatch({ type: 'next' });
    },
    [state.time, state.dayKey, zone.zone, dispatch],
  );

  // ---- create -------------------------------------------------------------

  const create = useWizardCreate({ state, dispatch, botZone, zone, labels, onCreated });

  // ---- focus: each step lands on its first control -------------------------

  const { setBodyEl, firstControlRef } = useWizardFocus({
    open,
    step: state.step,
    catalogLoaded,
    availabilityEntries: availability.entries,
  });

  // ---- keyboard: Enter advances when the step is valid ----------------------

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.shiftKey ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      const target = event.target as HTMLElement;
      // Controls that own Enter (buttons, links, textareas, open lists, native selects) keep it.
      if (target.closest('button, a, textarea, select, [role="listbox"], [role="option"], [aria-expanded="true"]'))
        return;
      if (!stepValid(state, state.step)) return;
      event.preventDefault();
      if (state.step === 'confirm') void create();
      else dispatch({ type: 'next' });
    },
    [state, create, dispatch],
  );

  // ---- render -------------------------------------------------------------

  const statuses = stepStatuses(state);
  const steps: StepperStep[] = WIZARD_STEPS.map((step) => ({
    id: step,
    label: STEP_LABELS[step],
    status: statuses[step],
  }));
  const problem = stepProblem(state, state.step);
  const back = prevStep(state.step);
  const forward = nextStep(state.step);
  const compact = band === 'compact';
  const currentIndex = WIZARD_STEPS.indexOf(state.step);
  const summaryOf = (step: WizardStep): string | null => {
    switch (step) {
      case 'service':
        return state.service.kind === 'service'
          ? (service?.title ?? null)
          : state.service.kind === 'none'
            ? 'No service'
            : null;
      case 'specialist':
        return state.specialist.kind === 'one'
          ? specialistName(specialistById(catalog.state, state.specialist.id)?.profile ?? { firstName: 'Specialist' })
          : state.specialist.kind === 'anyone'
            ? 'Anyone'
            : null;
      default:
        return null;
    }
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 text-xs text-text-muted">{problem && state.step !== 'service' ? problem : null}</div>
      <div className="flex items-center gap-2">
        {back ? (
          <Button variant="ghost" onClick={() => dispatch({ type: 'back' })}>
            Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
        {state.step === 'confirm' ? (
          <Button
            variant="primary"
            onClick={() => void create()}
            loading={state.submitting}
            disabled={!canEdit || !stepValid(state, 'confirm')}
          >
            Create booking
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => dispatch({ type: 'next' })}
            disabled={!forward || !stepValid(state, state.step)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <WizardFrame
      open={open}
      onClose={onClose}
      title="New booking"
      fullscreen={wizardHost(band) === 'fullscreen'}
      footer={footer}
      initialFocusRef={firstControlRef}
    >
      <div
        ref={setBodyEl}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="@container flex min-h-full flex-col gap-4 outline-none"
      >
        {!canEdit ? (
          <div className="rounded-card border border-border bg-surface-sunken px-3 py-2 text-sm text-text-muted">
            Your role can look, but not book — the Create button stays off.
          </div>
        ) : null}
        {compact ? (
          <div className="flex items-center gap-2 text-sm">
            {back ? (
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                aria-label={`Back to ${STEP_LABELS[back]}`}
                onClick={() => dispatch({ type: 'back' })}
              >
                <IconChevronLeft />
              </Button>
            ) : null}
            <span className="font-medium text-text">{STEP_LABELS[state.step]}</span>
            <span className="text-text-faint">
              · step {currentIndex + 1} of {WIZARD_STEPS.length}
            </span>
          </div>
        ) : (
          <Stepper
            steps={steps.map((s) => ({ ...s, description: summaryOf(s.id as WizardStep) ?? undefined }))}
            current={state.step}
            onStepClick={(id) => canGoTo(state, id as WizardStep) && dispatch({ type: 'goTo', step: id as WizardStep })}
            aria-label="New booking steps"
          />
        )}

        <div className="min-h-0 flex-1">
          {state.step === 'service' ? (
            <ServiceStep
              services={services}
              hiddenCount={hiddenServices}
              choice={state.service}
              onChoose={chooseService}
              loading={catalog.state.loading && catalog.state.loadedAt === null}
            />
          ) : state.step === 'specialist' ? (
            <SpecialistStep
              specialists={offering}
              serviceTitle={service?.title ?? null}
              choice={state.specialist}
              onChoose={chooseSpecialist}
              weekStartsOn={weekStartsOn}
            />
          ) : state.step === 'day' ? (
            <DayStep
              value={state.dayKey}
              onChoose={chooseDay}
              todayKey={todayKey}
              weekStartsOn={weekStartsOn}
              schedules={schedulesFor}
              who={
                state.specialist.kind === 'one'
                  ? specialistName(
                      specialistById(catalog.state, state.specialist.id)?.profile ?? { firstName: 'the specialist' },
                    )
                  : offering.length === 1
                    ? specialistName(offering[0]!.profile)
                    : 'the team'
              }
            />
          ) : state.step === 'time' && state.dayKey ? (
            <TimeStep
              service={state.service}
              specialist={state.specialist}
              offering={offering}
              dayKey={state.dayKey}
              availability={availability}
              time={state.time}
              customTime={state.customTime}
              onTime={(time) => {
                dispatch({ type: 'timeChosen', time });
                // A slot is decisive (Cal.com's flow): choose and advance. A custom time is typed, so it stays.
                if (time.source === 'slot') dispatch({ type: 'next' });
              }}
              onCustomTimeToggle={(on) => dispatch({ type: 'customTimeToggled', on })}
              zone={zone}
              todayKey={todayKey}
              now={now}
              labels={labels}
            />
          ) : state.step === 'customer' ? (
            <CustomerPicker state={state} dispatch={dispatch} skippable />
          ) : state.step === 'confirm' ? (
            <ConfirmStep
              state={state}
              service={service}
              specialist={chosenSpecialist}
              zone={zone}
              todayKey={todayKey}
              labels={labels}
            />
          ) : (
            <p className="text-sm text-text-muted">Pick a day first.</p>
          )}
        </div>
      </div>
    </WizardFrame>
  );
}
