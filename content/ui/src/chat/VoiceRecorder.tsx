import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { IconMic, IconSend, IconStop, IconTrash, IconWarning } from '../icons';
import {
  barHeight,
  canRecord,
  canSendRecording,
  formatElapsed,
  INITIAL_RECORDER_STATE,
  MAX_RECORDING_MS,
  pushLevel,
  recorderHint,
  recorderReducer,
  remainingWarning,
  type RecorderEvent,
  type RecorderState,
} from '../lib/chat/recorder';
import { Spinner } from '../primitives/Spinner';

export interface VoiceClip {
  blob: Blob;
  /** What the recorder actually produced — not what was asked for. */
  mimeType: string;
  durationMs: number;
}

export interface VoiceRecorderProps {
  onSend: (clip: VoiceClip) => void | Promise<void>;
  /** The operator threw the clip away. The clip itself is already gone. */
  onCancel?: () => void;
  /**
   * `click` — click to start, click to stop, then send or discard.
   * `hold` — press and hold, release to send, slide off the button to cancel.
   *
   * Both, because they suit different messages: hold is right for the
   * two-second aside every messenger trained people to expect, and click is
   * the only one that works for a minute of instructions or for anybody who
   * cannot hold a button down.
   */
  mode?: 'click' | 'hold';
  /** Hard cap. The recorder stops itself here and keeps what it has. */
  maxMs?: number;
  /** Container formats to try, best first. */
  mimeTypes?: readonly string[];
  /** The composer is unavailable — no permission, the window has closed. */
  disabled?: boolean;
  /** Why it is disabled. Shown instead of the recorder's own hint. */
  disabledHint?: string;
  /**
   * How the microphone is obtained. Defaults to `getUserMedia({ audio: true })`.
   *
   * Injected for the same reason `rafThrottle`'s scheduler is: everything
   * interesting about this component happens on paths that do not exist
   * outside a browser, and a refusal is one of them. With this, the gallery can
   * show `denied` and `unsupported` as they really render — a rejection whose
   * `name` is `NotAllowedError` or `SecurityError` is a block, anything else is
   * a browser that cannot do this — instead of a screenshot of them.
   */
  requestStream?: () => Promise<MediaStream>;
  className?: string;
}

const DEFAULT_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'] as const;

/** A press this short is a mis-click, not a voice note. */
const MIN_HOLD_MS = 500;

/** How far off the button counts as "slid away to cancel", px. */
const SLIDE_CANCEL_PX = 48;

/**
 * Whether this browser could record at all, asked without touching the
 * microphone.
 *
 * Answerable statically, and worth asking on mount: without it the control
 * looks live on a browser that has no `MediaRecorder` and only admits it after
 * the first click. A missing API is not a permission, so nothing is prompted
 * and nobody is interrupted by the question.
 */
function browserCanRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function defaultRequestStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('This browser has no microphone API.'));
  }
  if (typeof MediaRecorder === 'undefined') {
    return Promise.reject(new Error('This browser cannot record audio.'));
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

/** Rejections that mean "blocked", as opposed to "impossible". */
function refusalFor(error: unknown): { phase: 'denied' | 'unsupported'; reason: string } {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return {
      phase: 'denied',
      reason: 'Microphone access is blocked. Allow it in your browser settings to record a voice note.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return { phase: 'unsupported', reason: 'No microphone was found on this device.' };
  }
  const message = error instanceof Error && error.message !== '' ? error.message : 'This browser cannot record audio.';
  return { phase: 'unsupported', reason: message };
}

function pickMimeType(candidates: readonly string[]): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * A voice note, captured.
 *
 * ## Why this is a design-system component and not module code
 *
 * Because the honest failure is most of the work, and it is the same failure
 * everywhere. `coworkerConversationSendAudioMessage` is a real mutation with a
 * real upload behind it, and a person can refuse the microphone, be on a
 * browser without `MediaRecorder`, or be inside an iframe that never asked for
 * the permission. Each of those produces a button that looks fine and does
 * nothing — the one failure this design system refuses to ship — and each is
 * fifty lines of
 * `getUserMedia` error names that a module would get partly right.
 *
 * The state machine, its refusals and every format decision are in
 * `lib/chat/recorder.ts` with tests. What is left here is the part that genuinely
 * needs a browser: `getUserMedia`, `MediaRecorder`, an `AnalyserNode` for the
 * meter, and the pointer gestures.
 *
 * ## Two rules the devices impose
 *
 * `MediaRecorder.stop()` is asynchronous — the clip exists when `dataavailable`
 * has fired, not when stop returns — which is why `stopping` and `ready` are
 * different states and why the send button is dead between them.
 *
 * The tracks have to be stopped by hand. A `MediaStream` left running holds the
 * microphone open, and the browser shows the operator a recording indicator on
 * a dashboard that is not recording anything. Every exit from this component,
 * including unmounting mid-recording, goes through `teardown`.
 */
export function VoiceRecorder({
  onSend,
  onCancel,
  mode = 'click',
  maxMs = MAX_RECORDING_MS,
  mimeTypes = DEFAULT_MIME_TYPES,
  disabled = false,
  disabledHint,
  requestStream = defaultRequestStream,
  className = '',
}: VoiceRecorderProps) {
  const [state, dispatch] = useReducer(
    (previous: RecorderState, event: RecorderEvent) => recorderReducer(previous, event, { maxMs }),
    INITIAL_RECORDER_STATE,
  );
  const [levels, setLevels] = useState<number[]>(() => pushLevel([], 0));
  const [tooShort, setTooShort] = useState(false);
  const [slidingOff, setSlidingOff] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clipRef = useRef<VoiceClip | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  /* A start is abandoned by bumping this: the permission prompt can be
     answered long after the operator gave up, and the stream that arrives then
     belongs to nobody. */
  const sessionRef = useRef(0);
  const autoSendRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Hand the microphone back.
   *
   * Called the moment the clip exists, not when it is sent: `MediaRecorder.stop()`
   * does not stop the tracks, so a recorder that waited for the operator to
   * decide would leave the browser's recording indicator lit over a review row
   * that is recording nothing. That indicator is a promise to the person; it has
   * to be true.
   */
  const releaseDevices = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    analyserRef.current = null;
    void audioRef.current?.close().catch(() => {});
    audioRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        /* Already stopping; nothing to undo. */
      }
    }
    releaseDevices();
  }, [releaseDevices]);

  /* The microphone must not outlive the component. Without this, closing the
     panel mid-recording leaves the browser's recording indicator lit. */
  useEffect(() => () => teardown(), [teardown]);

  /* A browser that cannot record says so before it is asked to. Skipped when
     the caller injected its own stream source: passing one is a statement that
     it can get a stream, and probing the globals would override that. */
  useEffect(() => {
    if (requestStream !== defaultRequestStream) return;
    if (browserCanRecord()) return;
    dispatch({ type: 'refused', phase: 'unsupported', reason: 'This browser cannot record audio.' });
  }, [requestStream]);

  const tick = useCallback(() => {
    frameRef.current = requestAnimationFrame(tick);
    dispatch({ type: 'tick', elapsedMs: Date.now() - startedAtRef.current });

    const analyser = analyserRef.current;
    if (!analyser) return;
    const samples = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const centred = (sample - 128) / 128;
      sum += centred * centred;
    }
    /* Root mean square, scaled: speech sits around 0.1 RMS and a meter that
       showed it as a tenth of full height would look broken. */
    const rms = Math.sqrt(sum / samples.length);
    setLevels((previous) => pushLevel(previous, Math.min(rms * 3, 1)));
  }, []);

  const start = useCallback(async () => {
    if (disabled || !canRecord(state) || state.phase !== 'idle') return;
    setTooShort(false);
    setSlidingOff(false);
    autoSendRef.current = false;
    clipRef.current = null;
    chunksRef.current = [];
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    dispatch({ type: 'request' });

    let stream: MediaStream;
    try {
      stream = await requestStream();
    } catch (error) {
      if (sessionRef.current === session) dispatch({ type: 'refused', ...refusalFor(error) });
      return;
    }

    /* The operator gave up while the prompt was open. Their answer arrived for
       a recording that no longer exists, so hand the microphone straight back. */
    if (sessionRef.current !== session) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    const mimeType = pickMimeType(mimeTypes);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (error) {
      for (const track of stream.getTracks()) track.stop();
      dispatch({ type: 'refused', ...refusalFor(error) });
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      if (sessionRef.current !== session) return;
      const type = recorder.mimeType || mimeType || 'audio/webm';
      clipRef.current = {
        blob: new Blob(chunksRef.current, { type }),
        mimeType: type,
        durationMs: Date.now() - startedAtRef.current,
      };
      releaseDevices();
      dispatch({ type: 'clip' });
    };

    /* The analyser is a nicety and must never be the reason recording fails —
       an AudioContext can be refused by an autoplay policy the recorder is not
       subject to. Without it the meter simply sits on its floor. */
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      audioRef.current = context;
      analyserRef.current = analyser;
    } catch {
      audioRef.current = null;
      analyserRef.current = null;
    }

    startedAtRef.current = Date.now();
    setLevels(pushLevel([], 0));
    recorder.start();
    dispatch({ type: 'granted' });
    frameRef.current = requestAnimationFrame(tick);
  }, [disabled, mimeTypes, releaseDevices, requestStream, state, tick]);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    autoSendRef.current = false;
    clipRef.current = null;
    chunksRef.current = [];
    teardown();
    dispatch({ type: 'cancel' });
    onCancel?.();
  }, [onCancel, teardown]);

  const stop = useCallback(() => {
    dispatch({ type: 'stop' });
  }, []);

  /* One place calls `MediaRecorder.stop()`, and it is here rather than in the
     handler: the cap in the reducer also reaches `stopping`, and a recording
     that ran out of time has to end the same way one the operator ended does. */
  useEffect(() => {
    if (state.phase !== 'stopping') return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    /* No recorder to stop means no clip is coming. Reaching `ready` anyway
       would offer a send button with nothing behind it. */
    else cancel();
  }, [state.phase, cancel]);

  const send = useCallback(() => {
    const clip = clipRef.current;
    if (!clip || !canSendRecording(state)) return;
    clipRef.current = null;
    chunksRef.current = [];
    teardown();
    dispatch({ type: 'reset' });
    void onSend(clip);
  }, [onSend, state, teardown]);

  /* Hold mode sends on release rather than showing a review row: the gesture
     already said "send", and a confirmation step after it is the thing that
     makes voice notes feel slow. */
  useEffect(() => {
    if (state.phase === 'ready' && autoSendRef.current) {
      autoSendRef.current = false;
      send();
    }
  }, [state.phase, send]);

  /* Escape abandons a recording, wherever focus is. It is the one gesture that
     has to work while a pointer is captured by the hold button. */
  useEffect(() => {
    if (state.phase !== 'recording' && state.phase !== 'requesting') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, cancel]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'hold' || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    void start();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'hold' || state.phase !== 'recording') return;
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    /* Distance to the button's box, not to its centre: a wide button should
       not cancel because the thumb drifted to its own edge. */
    const dx = Math.max(box.left - event.clientX, 0, event.clientX - box.right);
    const dy = Math.max(box.top - event.clientY, 0, event.clientY - box.bottom);
    setSlidingOff(Math.hypot(dx, dy) > SLIDE_CANCEL_PX);
  };

  const onPointerUp = () => {
    if (mode !== 'hold') return;
    if (state.phase === 'requesting') {
      cancel();
      return;
    }
    if (state.phase !== 'recording') return;
    if (slidingOff) {
      cancel();
      return;
    }
    if (state.elapsedMs < MIN_HOLD_MS) {
      cancel();
      setTooShort(true);
      return;
    }
    autoSendRef.current = true;
    stop();
  };

  const hint = disabled ? disabledHint : (recorderHint(state) ?? (tooShort ? 'Hold to record.' : null));
  const blocked = disabled || !canRecord(state);
  const active = state.phase === 'recording' || state.phase === 'stopping' || state.phase === 'ready';

  if (!active) {
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          disabled={blocked}
          aria-label={mode === 'hold' ? 'Hold to record a voice note' : 'Record a voice note'}
          /* The reason travels with the control, so a disabled button says why
             on hover as well as in the line under it. */
          title={hint ?? undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (mode === 'hold' ? cancel() : undefined)}
          onClick={mode === 'click' ? () => void start() : undefined}
          className="flex size-9 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint disabled:hover:bg-transparent"
        >
          {state.phase === 'requesting' ? (
            <Spinner size={16} />
          ) : blocked && !disabled ? (
            <IconWarning size={16} />
          ) : (
            <IconMic size={16} />
          )}
        </button>
        {hint ? (
          <span className={`text-micro ${blocked && !disabled ? 'text-warning' : 'text-text-muted'}`}>{hint}</span>
        ) : null}
      </div>
    );
  }

  const warning = remainingWarning(state, { maxMs });
  const ready = state.phase === 'ready';

  return (
    <div
      role="group"
      aria-label={ready ? 'Voice note ready to send' : 'Recording a voice note'}
      className={`flex min-w-0 items-center gap-2 rounded-control border px-2 py-1.5 ${
        slidingOff ? 'border-danger bg-danger-soft' : 'border-border bg-surface-raised'
      } ${className}`}
    >
      <button
        type="button"
        onClick={cancel}
        aria-label="Discard the recording"
        className="flex size-7 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-danger-soft hover:text-danger focus-visible:focus-ring"
      >
        <IconTrash size={14} />
      </button>

      {/* One announcement per phase change, which is the whole of what a reader
          who cannot see the meter needs: it started, it stopped, it is ready. */}
      <span aria-live="polite" className="sr-only">
        {state.phase === 'recording' ? 'Recording' : state.phase === 'stopping' ? 'Finishing' : 'Voice note ready'}
      </span>

      {ready ? null : (
        <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-danger motion-reduce:animate-none" />
      )}

      {/* NOT a live region. It changes sixty times a second, and a screen
          reader reading a stopwatch out loud is the recorder shouting over the
          person using it. The phase does the announcing, below. */}
      <span className="shrink-0 tabular-nums text-meta text-text">{formatElapsed(state.elapsedMs)}</span>

      {/* The meter scrolls left to right: a row of bars that all move together
          is a level, but it gives no sense that time is passing, which is the
          one thing somebody holding a button down wants to see. */}
      <span aria-hidden className="flex h-5 min-w-0 flex-1 items-center gap-px overflow-hidden">
        {levels.map((level, index) => (
          <span
            key={index}
            style={{ height: `${ready ? 18 : barHeight(level)}%` }}
            className={`w-full min-w-0.5 rounded-full transition-[height] duration-instant ease-standard ${
              ready ? 'bg-border-strong' : 'bg-accent'
            }`}
          />
        ))}
      </span>

      {warning ? <span className="shrink-0 text-micro text-warning">{warning}</span> : null}

      {ready ? (
        <button
          type="button"
          onClick={send}
          disabled={!canSendRecording(state)}
          aria-label="Send the voice note"
          className="flex size-7 shrink-0 items-center justify-center rounded-control bg-accent text-accent-fg transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-accent/40"
        >
          <IconSend size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          disabled={state.phase !== 'recording'}
          aria-label="Stop recording"
          className="flex size-7 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-text transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint"
        >
          {state.phase === 'stopping' ? <Spinner size={12} /> : <IconStop size={12} />}
        </button>
      )}
    </div>
  );
}
