/**
 * The state machine behind a voice note, and the reasons it can refuse.
 *
 * ## Why this is a machine and not three booleans
 *
 * Recording has a permission prompt in the middle of it. Between the click and
 * the first byte there is a state where the browser is asking the person for
 * the microphone, they have not answered, and the recorder is neither idle nor
 * recording — and a second click during that gap must not start a second
 * stream. There is a matching gap at the end: `MediaRecorder.stop()` is
 * asynchronous, and the clip does not exist until `dataavailable` has fired, so
 * "the operator pressed send" and "there is something to send" are different
 * moments. Booleans model neither gap, which is how a recorder ends up with two
 * live streams or a send button that posts an empty file.
 *
 * Three of the seven states are refusals, and they are states rather than an
 * error string because they are *permanent for this page*: a browser with no
 * `MediaRecorder` will not grow one, and a microphone blocked in the site
 * settings stays blocked until the person changes it in the browser's own UI,
 * which no amount of clicking the button will do. The control has to say so.
 * The rule — "a disabled control with a reason, never a dead button" —
 * is the whole point of separating `denied` from `unsupported`: the wording is
 * different, and only one of the two is worth trying again.
 *
 * ## Why it is here and not in the component
 *
 * vitest in this repository is node-only by choice: no jsdom, no
 * `MediaRecorder`, no `getUserMedia`. A machine whose only path runs through
 * browser globals is a machine with no test, and the transitions above are
 * exactly the ones that break silently. So the rules are a reducer over plain
 * values, and `chat/VoiceRecorder.tsx` is the part that owns the devices.
 */

export type RecorderPhase =
  /** Nothing has happened yet, or the last clip was dealt with. */
  | 'idle'
  /** The browser is asking for the microphone. */
  | 'requesting'
  /** Capturing. */
  | 'recording'
  /** Stop was called; the clip has not arrived yet. */
  | 'stopping'
  /** There is a clip, and the operator has not sent or discarded it. */
  | 'ready'
  /** The microphone was refused, and it stays refused until site settings change. */
  | 'denied'
  /** This browser cannot record at all. */
  | 'unsupported';

export interface RecorderState {
  phase: RecorderPhase;
  /** Milliseconds captured. Survives into `ready` so the clip can show its length. */
  elapsedMs: number;
  /**
   * Why a refusal happened, in words for the operator. Present exactly when
   * the phase is `denied` or `unsupported`; a component that shows it
   * unconditionally therefore cannot show a stale reason.
   */
  reason?: string;
}

export type RecorderEvent =
  /** The operator asked to record. */
  | { type: 'request' }
  /** The stream arrived. */
  | { type: 'granted' }
  /** The stream did not arrive. */
  | { type: 'refused'; phase: 'denied' | 'unsupported'; reason: string }
  /** A frame of elapsed time. Absolute, not a delta — see the reducer. */
  | { type: 'tick'; elapsedMs: number }
  /** The operator asked to stop and keep it. */
  | { type: 'stop' }
  /** The clip arrived. */
  | { type: 'clip' }
  /** The operator threw it away, or slid off the hold button. */
  | { type: 'cancel' }
  /** The clip was sent; back to the start. */
  | { type: 'reset' };

export const INITIAL_RECORDER_STATE: RecorderState = { phase: 'idle', elapsedMs: 0 };

/** Two minutes. Long enough for any instruction, short enough to upload. */
export const MAX_RECORDING_MS = 120_000;

export interface RecorderRules {
  /** Hard cap; the recorder stops itself here. Default `MAX_RECORDING_MS`. */
  maxMs?: number;
}

/**
 * The transition table.
 *
 * Two properties worth stating, because both are load-bearing and neither is
 * obvious from the case list:
 *
 * 1. **A refusal is terminal.** `denied` and `unsupported` accept nothing but
 *    `reset`, and the component never sends one. Retrying `getUserMedia` after
 *    a block shows no prompt and rejects instantly, so a button that "tries
 *    again" is a button that does nothing while looking like it did something.
 * 2. **`tick` carries the absolute elapsed time**, not an increment. The
 *    component measures against a start timestamp, so a frame the browser
 *    skipped — a background tab, a long paint — does not shorten the clip. A
 *    reducer that accumulated deltas would drift against the audio it labels,
 *    and a voice note whose caption says 0:11 when the file is 0:14 is the
 *    kind of wrong nobody reports and everybody notices.
 */
export function recorderReducer(state: RecorderState, event: RecorderEvent, rules: RecorderRules = {}): RecorderState {
  const maxMs = rules.maxMs ?? MAX_RECORDING_MS;

  switch (event.type) {
    case 'request':
      /* Only from a standing start. A second click while the permission
         prompt is up must not open a second stream. */
      return state.phase === 'idle' ? { phase: 'requesting', elapsedMs: 0 } : state;

    case 'granted':
      return state.phase === 'requesting' ? { phase: 'recording', elapsedMs: 0 } : state;

    case 'refused':
      return { phase: event.phase, elapsedMs: 0, reason: event.reason };

    case 'tick': {
      if (state.phase !== 'recording') return state;
      const elapsedMs = Math.max(0, event.elapsedMs);
      /* At the cap the recorder stops itself, keeping what it has. Silently
         discarding two minutes of someone's voice would be worse than any
         upload it saves. */
      if (elapsedMs >= maxMs) return { phase: 'stopping', elapsedMs: maxMs };
      return elapsedMs === state.elapsedMs ? state : { ...state, elapsedMs };
    }

    case 'stop':
      if (state.phase === 'requesting') return INITIAL_RECORDER_STATE;
      return state.phase === 'recording' ? { ...state, phase: 'stopping' } : state;

    case 'clip':
      /* A clip can only land after a stop. One that arrives in any other phase
         belongs to a recording the operator already cancelled. */
      return state.phase === 'stopping' ? { ...state, phase: 'ready' } : state;

    case 'cancel':
      return state.phase === 'denied' || state.phase === 'unsupported' ? state : INITIAL_RECORDER_STATE;

    case 'reset':
      return INITIAL_RECORDER_STATE;
  }
}

/** Whether the microphone is live right now — the meter and the timer run off this. */
export function isCapturing(state: RecorderState): boolean {
  return state.phase === 'recording';
}

/** Whether there is something the operator could send. */
export function canSendRecording(state: RecorderState): boolean {
  return state.phase === 'ready' && state.elapsedMs > 0;
}

/** Whether the control accepts a press at all. */
export function canRecord(state: RecorderState): boolean {
  return state.phase !== 'denied' && state.phase !== 'unsupported';
}

/**
 * The words under a control that will not do anything.
 *
 * Null when the control works, so the caller renders the hint or does not
 * rather than choosing between a reason and an empty string.
 */
export function recorderHint(state: RecorderState): string | null {
  switch (state.phase) {
    case 'denied':
      return state.reason ?? 'Microphone access is blocked. Allow it in your browser settings to record.';
    case 'unsupported':
      return state.reason ?? 'This browser cannot record audio.';
    default:
      return null;
  }
}

/**
 * Elapsed time as a clock.
 *
 * `m:ss`, growing to `mm:ss` on its own: a voice note is short, and a leading
 * zero on the minutes makes 0:07 read as a duration rather than a timestamp.
 * Rounded DOWN, because a counter that shows 0:01 before a second has passed
 * makes the first tick look like a stutter.
 */
export function formatElapsed(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const total = Math.floor(safe / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * What is left before the cap, for the countdown a recorder shows near the end.
 *
 * Null while there is plenty of time — the warning only earns its place in the
 * last ten seconds, and a countdown running for two minutes is a stopwatch
 * telling someone to hurry up.
 */
export function remainingWarning(state: RecorderState, rules: RecorderRules = {}): string | null {
  const maxMs = rules.maxMs ?? MAX_RECORDING_MS;
  if (state.phase !== 'recording') return null;
  const left = maxMs - state.elapsedMs;
  if (left > 10_000) return null;
  return `${Math.max(0, Math.ceil(left / 1000))}s left`;
}

/* ----------------------------------------------------------------- meter */

/** How many bars the level meter draws. Odd, so there is a middle one. */
export const METER_BARS = 21;

/**
 * A rolling window of levels, newest last.
 *
 * The meter scrolls rather than pulsing in place: a row of bars that all rise
 * and fall together is a level, but it is not a recording — it gives no sense
 * that time is passing, which is the one thing a person holding a button down
 * wants to know. A window of the last N readings drawn left to right does.
 *
 * Fixed length from the first call, so the meter is full width immediately and
 * does not grow into its box while someone is talking into it.
 */
export function pushLevel(history: readonly number[], level: number, size = METER_BARS): number[] {
  const clamped = Number.isFinite(level) ? Math.min(Math.max(level, 0), 1) : 0;
  if (history.length < size) {
    /* First call: fill the window so the meter starts at full width. */
    const filled = history.length === 0 ? Array.from({ length: size - 1 }, () => 0) : [...history];
    return [...filled, clamped].slice(-size);
  }
  return [...history.slice(history.length - size + 1), clamped];
}

/**
 * A level as a percentage of the meter's height.
 *
 * The floor is not decoration: a meter that reaches zero has gaps in it, and a
 * gap in a waveform reads as "the recording dropped out" rather than "nobody
 * was speaking". The curve is a square root, which is the usual correction for
 * an amplitude read linearly — quiet speech is most of what a microphone hears
 * and a linear meter leaves it flat against the floor.
 */
export function barHeight(level: number, floor = 12): number {
  const clamped = Number.isFinite(level) ? Math.min(Math.max(level, 0), 1) : 0;
  return Math.round(floor + (100 - floor) * Math.sqrt(clamped));
}
