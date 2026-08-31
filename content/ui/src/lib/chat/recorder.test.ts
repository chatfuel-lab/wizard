import { describe, expect, it } from 'vitest';
import {
  barHeight,
  canRecord,
  canSendRecording,
  formatElapsed,
  INITIAL_RECORDER_STATE,
  isCapturing,
  MAX_RECORDING_MS,
  METER_BARS,
  pushLevel,
  recorderHint,
  recorderReducer,
  remainingWarning,
  type RecorderEvent,
  type RecorderState,
} from './recorder';

/** Drive the machine the way the component does. */
function run(events: RecorderEvent[], from: RecorderState = INITIAL_RECORDER_STATE, maxMs?: number): RecorderState {
  return events.reduce((state, event) => recorderReducer(state, event, maxMs ? { maxMs } : {}), from);
}

const RECORDING = run([{ type: 'request' }, { type: 'granted' }]);

describe('the happy path', () => {
  it('walks idle → requesting → recording → stopping → ready', () => {
    let state = INITIAL_RECORDER_STATE;
    expect(state.phase).toBe('idle');
    state = recorderReducer(state, { type: 'request' });
    expect(state.phase).toBe('requesting');
    state = recorderReducer(state, { type: 'granted' });
    expect(state.phase).toBe('recording');
    state = recorderReducer(state, { type: 'tick', elapsedMs: 3200 });
    state = recorderReducer(state, { type: 'stop' });
    expect(state.phase).toBe('stopping');
    state = recorderReducer(state, { type: 'clip' });
    expect(state).toEqual({ phase: 'ready', elapsedMs: 3200 });
  });

  it('keeps the length so the clip can say how long it is', () => {
    const ready = run([{ type: 'tick', elapsedMs: 7400 }, { type: 'stop' }, { type: 'clip' }], RECORDING);
    expect(formatElapsed(ready.elapsedMs)).toBe('0:07');
    expect(canSendRecording(ready)).toBe(true);
  });

  it('goes back to idle once the clip is sent', () => {
    const sent = run(
      [{ type: 'tick', elapsedMs: 2000 }, { type: 'stop' }, { type: 'clip' }, { type: 'reset' }],
      RECORDING,
    );
    expect(sent).toEqual(INITIAL_RECORDER_STATE);
  });
});

describe('the gaps a boolean would miss', () => {
  it('will not open a second stream while the permission prompt is up', () => {
    const twice = run([{ type: 'request' }, { type: 'request' }]);
    expect(twice.phase).toBe('requesting');
  });

  it('does not become sendable until the clip has actually arrived', () => {
    const recorded = recorderReducer(RECORDING, { type: 'tick', elapsedMs: 2000 });
    const stopping = recorderReducer(recorded, { type: 'stop' });
    expect(stopping.phase).toBe('stopping');
    expect(canSendRecording(stopping)).toBe(false);
    expect(canSendRecording(recorderReducer(stopping, { type: 'clip' }))).toBe(true);
  });

  it('will not send a clip with nothing in it', () => {
    /* A press and an immediate release: the phase reaches `ready` and there is
       still nothing to post. */
    const empty = run([{ type: 'stop' }, { type: 'clip' }], RECORDING);
    expect(empty.phase).toBe('ready');
    expect(canSendRecording(empty)).toBe(false);
  });

  it('drops a clip that belongs to a recording the operator cancelled', () => {
    const cancelled = run([{ type: 'stop' }, { type: 'cancel' }], RECORDING);
    expect(cancelled).toEqual(INITIAL_RECORDER_STATE);
    expect(recorderReducer(cancelled, { type: 'clip' })).toEqual(INITIAL_RECORDER_STATE);
  });

  it('abandons a request the operator gave up on before it was answered', () => {
    const abandoned = run([{ type: 'request' }, { type: 'stop' }]);
    expect(abandoned).toEqual(INITIAL_RECORDER_STATE);
  });
});

describe('refusals', () => {
  it('separates a blocked microphone from a browser that cannot record', () => {
    const denied = recorderReducer(INITIAL_RECORDER_STATE, {
      type: 'refused',
      phase: 'denied',
      reason: 'Microphone access was blocked.',
    });
    expect(denied.phase).toBe('denied');
    expect(recorderHint(denied)).toBe('Microphone access was blocked.');

    const unsupported = recorderReducer(INITIAL_RECORDER_STATE, {
      type: 'refused',
      phase: 'unsupported',
      reason: 'This browser cannot record audio.',
    });
    expect(recorderHint(unsupported)).toBe('This browser cannot record audio.');
  });

  it('is terminal — a retry after a block shows no prompt and would do nothing', () => {
    const denied = run([{ type: 'refused', phase: 'denied', reason: 'blocked' }]);
    expect(run([{ type: 'request' }], denied).phase).toBe('denied');
    expect(run([{ type: 'cancel' }], denied).phase).toBe('denied');
    expect(canRecord(denied)).toBe(false);
    /* Only an explicit reset clears it, and nothing sends one. */
    expect(run([{ type: 'reset' }], denied)).toEqual(INITIAL_RECORDER_STATE);
  });

  it('has no reason to show while the control works', () => {
    expect(recorderHint(INITIAL_RECORDER_STATE)).toBeNull();
    expect(recorderHint(RECORDING)).toBeNull();
    expect(canRecord(INITIAL_RECORDER_STATE)).toBe(true);
  });
});

describe('elapsed time', () => {
  it('takes the absolute elapsed time, so a skipped frame does not shorten the clip', () => {
    /* A background tab delivers no frames for two seconds; the next tick still
       reports the true elapsed time rather than one frame's worth. */
    const state = run(
      [
        { type: 'tick', elapsedMs: 500 },
        { type: 'tick', elapsedMs: 2500 },
      ],
      RECORDING,
    );
    expect(state.elapsedMs).toBe(2500);
  });

  it('returns the same object when the tick changed nothing', () => {
    const ticked = recorderReducer(RECORDING, { type: 'tick', elapsedMs: 1000 });
    expect(recorderReducer(ticked, { type: 'tick', elapsedMs: 1000 })).toBe(ticked);
  });

  it('ignores a tick that arrives after the stop', () => {
    const stopping = recorderReducer(RECORDING, { type: 'stop' });
    expect(recorderReducer(stopping, { type: 'tick', elapsedMs: 99_000 })).toBe(stopping);
  });

  it('stops itself at the cap, keeping what it has', () => {
    const capped = recorderReducer(RECORDING, { type: 'tick', elapsedMs: MAX_RECORDING_MS + 5000 });
    expect(capped).toEqual({ phase: 'stopping', elapsedMs: MAX_RECORDING_MS });
  });

  it('honours a shorter cap the caller set', () => {
    const capped = run([{ type: 'tick', elapsedMs: 6000 }], RECORDING, 5000);
    expect(capped).toEqual({ phase: 'stopping', elapsedMs: 5000 });
  });
});

describe('formatElapsed', () => {
  it('reads as a clock, with the leading zero on the seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7400)).toBe('0:07');
    expect(formatElapsed(61_000)).toBe('1:01');
    expect(formatElapsed(605_000)).toBe('10:05');
  });

  it('rounds down, so the first tick is not a stutter', () => {
    expect(formatElapsed(999)).toBe('0:00');
    expect(formatElapsed(1999)).toBe('0:01');
  });

  it('shows a clock for nonsense rather than NaN', () => {
    expect(formatElapsed(Number.NaN)).toBe('0:00');
    expect(formatElapsed(-1)).toBe('0:00');
  });
});

describe('remainingWarning', () => {
  it('stays quiet until the last ten seconds', () => {
    expect(remainingWarning(run([{ type: 'tick', elapsedMs: 1000 }], RECORDING))).toBeNull();
    expect(remainingWarning(run([{ type: 'tick', elapsedMs: 112_000 }], RECORDING))).toBe('8s left');
  });

  it('says nothing when nothing is recording', () => {
    expect(remainingWarning(INITIAL_RECORDER_STATE)).toBeNull();
    expect(isCapturing(INITIAL_RECORDER_STATE)).toBe(false);
    expect(isCapturing(RECORDING)).toBe(true);
  });
});

describe('the level meter', () => {
  it('starts full width so it does not grow into its box mid-sentence', () => {
    expect(pushLevel([], 0.5)).toHaveLength(METER_BARS);
    expect(pushLevel([], 0.5).at(-1)).toBe(0.5);
  });

  it('scrolls, newest last', () => {
    let history = pushLevel([], 0.1, 3);
    history = pushLevel(history, 0.2, 3);
    history = pushLevel(history, 0.3, 3);
    expect(history).toEqual([0.1, 0.2, 0.3]);
    expect(pushLevel(history, 0.4, 3)).toEqual([0.2, 0.3, 0.4]);
  });

  it('clamps whatever the analyser reports', () => {
    expect(pushLevel([], 5, 2).at(-1)).toBe(1);
    expect(pushLevel([], -5, 2).at(-1)).toBe(0);
    expect(pushLevel([], Number.NaN, 2).at(-1)).toBe(0);
  });

  it('never draws a zero-height bar — a gap reads as a dropout', () => {
    expect(barHeight(0)).toBe(12);
    expect(barHeight(1)).toBe(100);
    /* Square-rooted, so quiet speech is visible rather than flat. */
    expect(barHeight(0.25)).toBeGreaterThan(barHeight(0.25 * 0.5));
    expect(barHeight(0.25)).toBe(56);
  });
});
