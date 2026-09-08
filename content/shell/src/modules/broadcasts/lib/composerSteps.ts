/**
 * Which composer step is done, which is next, and where a verdict belongs.
 *
 * The composer walks five steps — name, message, audience, schedule, review —
 * over one draft, and the address says which is open. When it says nothing
 * the first step that is not done is the one to open, and that question is
 * answered here, from the record alone, so the frame, the stepper marks and
 * the review's "what is still missing" all agree.
 *
 * Done means what the SERVER would accept: the message step is complete when
 * the payload carries an approved template and no verdict names it, the
 * audience step when no segment error stands, the schedule step when no
 * time verdict stands and the first send is still ahead. The one check the
 * client makes on its own is the past-time one — a draft made this morning
 * and opened tonight has a stale first send the server has not re-read yet,
 * and the stepper should not call it done.
 *
 * A one-time draft has no schedule: its step is always done, so a fresh
 * one-time draft walks name → message → audience → review.
 */
import { BroadcastRepeatType, type Weekday } from '~api/generated/broadcasts/graphql';
import { COMPOSER_STEPS, type ComposerStep } from './broadcastsParams';
import type { CampaignProblem, CampaignRecord } from './campaign';
import { problemArea, problemText, type ProblemArea } from './errors';
import { datesAtTime, toCorrectedWeekdays, toDisplayWeekdays, type CampaignSchedule } from './schedule';
import { dayKeyInZone, wallClock, zonedInstant } from './zone';

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';

export const STEP_LABELS: Record<ComposerStep, string> = {
  name: 'Name',
  message: 'Message',
  audience: 'Audience',
  schedule: 'Schedule',
  review: 'Review',
};

/**
 * What the workspace names a draft before its first step does. A draft still
 * carrying it has not been named, whatever the string says; the constant is
 * repeated here rather than imported because the workspace is above this
 * module's lib and the lib may not reach up.
 */
export const UNNAMED = 'Untitled campaign';

export const isNamed = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed !== '' && trimmed.toLowerCase() !== UNNAMED.toLowerCase();
};

/** The verdicts a step prints — the entry point's, the message's and the segment's, by area. */
export function problemsOfStep(record: CampaignRecord, step: ComposerStep): CampaignProblem[] {
  const area: ProblemArea | null =
    step === 'message' ? 'message' : step === 'audience' ? 'audience' : step === 'schedule' ? 'schedule' : null;
  if (area === null) return [];
  const own = record.problems.filter((problem) => problemArea(problem.code) === area);
  if (area === 'audience') {
    for (const code of record.audience.errors) own.push({ code, paramName: null, buttonId: null });
  }
  return own;
}

/** Verdicts that belong to no step — the flow itself is broken (no message block, no connection). */
export const campaignProblems = (record: CampaignRecord): CampaignProblem[] =>
  record.problems.filter((problem) => problemArea(problem.code) === 'campaign');

export function stepValid(record: CampaignRecord, step: ComposerStep, now: number): boolean {
  switch (step) {
    case 'name':
      return isNamed(record.name);
    case 'message': {
      const template = record.payload?.template ?? null;
      if (!template || template.status !== 'Approved') return false;
      return problemsOfStep(record, 'message').length === 0;
    }
    case 'audience':
      return problemsOfStep(record, 'audience').length === 0;
    case 'schedule': {
      if (record.isOneTime) return true;
      if (!record.schedule) return false;
      if (problemsOfStep(record, 'schedule').length > 0) return false;
      return record.schedule.at > now;
    }
    case 'review':
      return (
        campaignProblems(record).length === 0 &&
        COMPOSER_STEPS.filter((other) => other !== 'review').every((other) => stepValid(record, other, now))
      );
  }
}

/** The step to open when the address names none: the first not done, or the review when all are. */
export function firstInvalidStep(record: CampaignRecord, now: number): ComposerStep {
  return COMPOSER_STEPS.find((step) => step !== 'review' && !stepValid(record, step, now)) ?? 'review';
}

/**
 * The stepper's marks. A step with a verdict against it is an error whether
 * or not it is open; the open one is current; done ones are complete; the
 * rest are ahead.
 */
export function stepStatus(record: CampaignRecord, step: ComposerStep, current: ComposerStep, now: number): StepStatus {
  if (step === current) return 'current';
  if (problemsOfStep(record, step).length > 0) return 'error';
  return stepValid(record, step, now) ? 'complete' : 'upcoming';
}

export const nextStep = (step: ComposerStep): ComposerStep | null =>
  COMPOSER_STEPS[COMPOSER_STEPS.indexOf(step) + 1] ?? null;

export const prevStep = (step: ComposerStep): ComposerStep | null =>
  COMPOSER_STEPS[COMPOSER_STEPS.indexOf(step) - 1] ?? null;

/** Every standing verdict as sentences, grouped by the step that fixes it, for the review. */
export function verdictsByStep(record: CampaignRecord): { step: ComposerStep | null; sentences: string[] }[] {
  const out: { step: ComposerStep | null; sentences: string[] }[] = [];
  for (const step of COMPOSER_STEPS) {
    const sentences = problemsOfStep(record, step).map((problem) => problemText(problem.code, problem.paramName));
    if (sentences.length > 0) out.push({ step, sentences });
  }
  const loose = campaignProblems(record).map((problem) => problemText(problem.code, problem.paramName));
  if (loose.length > 0) out.push({ step: null, sentences: loose });
  return out;
}

// ---------------------------------------------------------------------------
// The schedule step: what is on screen, and what to write
// ---------------------------------------------------------------------------

export type RepeatKind = CampaignSchedule['repeat'];

export const REPEAT_LABELS: Record<RepeatKind, string> = {
  once: 'Once',
  weekdays: 'Weekdays',
  everyNDays: 'Every N days',
  dates: 'On dates',
};

/** Above 1000 the server answers a bare error; the control stops well short of it. */
export const EVERY_N_DAYS_MAX = 365;
/** The server's own cap on `repeatOnCertainDates`. */
export const DATES_MAX = 500;

/** The schedule as the controls hold it: wall-clock pieces in the display zone, weekdays as SHOWN. */
export interface ScheduleDraft {
  dayKey: string;
  minuteOfDay: number;
  repeat: RepeatKind;
  weekdays: Weekday[];
  everyNDays: number;
  /** Day keys, in the display zone. */
  dates: string[];
}

/** The stored schedule, opened in the display zone. */
export function scheduleDraftOf(schedule: CampaignSchedule, zone: string): ScheduleDraft {
  const clock = wallClock(schedule.at, zone);
  return {
    dayKey: clock.dayKey,
    minuteOfDay: clock.minuteOfDay,
    repeat: schedule.repeat,
    weekdays: schedule.repeat === 'weekdays' ? toDisplayWeekdays(schedule.weekdays, schedule.at, zone) : [],
    everyNDays: schedule.repeat === 'everyNDays' ? (schedule.everyNDays ?? 1) : 1,
    dates: schedule.repeat === 'dates' ? schedule.dates.map((at) => dayKeyInZone(at, zone)) : [],
  };
}

export type ScheduleWrite =
  | { kind: 'repeatType'; repeatType: BroadcastRepeatType }
  | { kind: 'weekdays'; weekdays: Weekday[] }
  | { kind: 'everyNDays'; everyNDays: number }
  | { kind: 'dates'; dates: string[] }
  | { kind: 'firstSendTime'; firstSendTime: string; correctedWeekdays: Weekday[] };

const REPEAT_TYPES: Record<RepeatKind, BroadcastRepeatType> = {
  once: BroadcastRepeatType.Never,
  weekdays: BroadcastRepeatType.Weekdays,
  everyNDays: BroadcastRepeatType.EveryNDays,
  dates: BroadcastRepeatType.OnCertainDates,
};

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item) => b.includes(item));

/**
 * The setters to send for what changed, in the order the server needs them:
 * the repeat type, then its list, then the first send time LAST with the
 * corrected weekday list riding along — the time moved, so the days may
 * have. `storedWeekdays` is the element's raw list whatever the repeat type,
 * because the server keeps it across type changes and expects the corrected
 * form with every first-send-time write while it is non-empty.
 */
export function planScheduleWrites(
  stored: CampaignSchedule,
  storedWeekdays: readonly Weekday[],
  draft: ScheduleDraft,
  zone: string,
): { at: number; writes: ScheduleWrite[] } {
  const at = zonedInstant(draft.dayKey, draft.minuteOfDay, zone);
  const writes: ScheduleWrite[] = [];
  const repeatChanged = draft.repeat !== stored.repeat;
  if (repeatChanged) writes.push({ kind: 'repeatType', repeatType: REPEAT_TYPES[draft.repeat] });

  let corrected: Weekday[] = [...storedWeekdays];
  switch (draft.repeat) {
    case 'weekdays': {
      corrected = toCorrectedWeekdays(draft.weekdays, at, zone);
      if (repeatChanged || !sameSet(corrected, storedWeekdays)) writes.push({ kind: 'weekdays', weekdays: corrected });
      break;
    }
    case 'everyNDays': {
      const every = Math.max(1, Math.min(EVERY_N_DAYS_MAX, Math.round(draft.everyNDays)));
      if (repeatChanged || stored.repeat !== 'everyNDays' || stored.everyNDays !== every)
        writes.push({ kind: 'everyNDays', everyNDays: every });
      break;
    }
    case 'dates': {
      const dates = datesAtTime(draft.dates.slice(0, DATES_MAX), draft.minuteOfDay, zone).sort((a, b) => a - b);
      const before = stored.repeat === 'dates' ? stored.dates : [];
      if (repeatChanged || dates.length !== before.length || dates.some((date, index) => date !== before[index]))
        writes.push({ kind: 'dates', dates: dates.map((date) => new Date(date).toISOString()) });
      break;
    }
    case 'once':
      break;
  }

  const timeChanged = Number.isNaN(at) ? false : at !== stored.at;
  const weekdaysWritten = writes.some((write) => write.kind === 'weekdays');
  if (!Number.isNaN(at) && (timeChanged || weekdaysWritten)) {
    writes.push({ kind: 'firstSendTime', firstSendTime: new Date(at).toISOString(), correctedWeekdays: corrected });
  }
  return { at, writes };
}
