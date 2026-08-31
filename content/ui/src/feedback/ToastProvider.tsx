import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheck, IconClose, IconInfo, IconWarning } from '../icons';
import { initialToastState, toastReducer, type Toast, type ToastTone } from '../lib/app/toast';
import { Portal } from '../overlay/Portal';

export interface ShowToastInput {
  /** Reusing an id updates that toast in place instead of stacking another. */
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms; 0 keeps it until dismissed. Errors default to sticky. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastApi {
  show: (input: ShowToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 5000;

const TONE_ICONS: Record<ToastTone, ReactNode> = {
  info: <IconInfo size={16} />,
  success: <IconCheck size={16} />,
  warning: <IconWarning size={16} />,
  danger: <IconWarning size={16} />,
};

const TONE_ACCENTS: Record<ToastTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

/**
 * Imperative rather than a controlled array.
 *
 * A toast is fired from inside a mutation callback — "moved to Won", with Undo —
 * where there is no render to hang a prop off. Making every module hold a list
 * and a reducer for that would be the same code, eleven times. The state itself
 * is the pure reducer in lib/app/toast.ts, so the rules stay testable.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, initialToastState);
  const counter = useRef(0);

  const api = useMemo<ToastApi>(
    () => ({
      show: (input) => {
        counter.current += 1;
        const id = input.id ?? `toast-${counter.current}`;
        const tone = input.tone ?? 'info';
        dispatch({
          type: 'show',
          toast: {
            id,
            title: input.title,
            description: input.description,
            tone,
            /* Errors stay until acknowledged: an error that vanished after five
               seconds is an error the user never got to read. */
            duration: input.duration ?? (tone === 'danger' ? 0 : DEFAULT_DURATION),
            action: input.action,
          },
        });
        return id;
      },
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={state.toasts} onDismiss={api.dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Throws when there is no provider, rather than returning a silent no-op:
 * a toast that never appears is a bug that hides for weeks.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return api;
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  /* Hover and focus are tracked apart, because they end differently. Hover ends
   * with `pointerleave` — which never fires when the toast under the pointer
   * unmounts, so the count reaching zero resets it. Focus ends with `blur` — which
   * browsers do NOT fire when the focused button is removed from the DOM (the
   * "Undo"/close button dismisses its own toast), so it is re-derived from
   * `document.activeElement` whenever the list changes. Without both, `paused`
   * stuck at true after the first click and every later toast stayed forever. */
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toasts.length === 0) {
      setHovering(false);
      setFocused(false);
      return;
    }
    const region = regionRef.current;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    setFocused(Boolean(region && active && region.contains(active)));
  }, [toasts]);

  const paused = hovering || focused;
  if (toasts.length === 0) return null;

  return (
    <Portal>
      <div
        ref={regionRef}
        role="region"
        aria-label="Notifications"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !regionRef.current?.contains(next)) setFocused(false);
        }}
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 font-sans"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} paused={paused} onDismiss={onDismiss} />
        ))}
      </div>
    </Portal>
  );
}

function ToastRow({ toast, paused, onDismiss }: { toast: Toast; paused: boolean; onDismiss: (id: string) => void }) {
  /* Remaining time is tracked so hovering pauses rather than restarts — a
   * five-second toast should not become fifteen because the pointer crossed it. */
  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());

  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.duration === 0) return;
    if (paused) {
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
      return;
    }
    startedAt.current = Date.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => window.clearTimeout(timer);
  }, [paused, toast.duration, dismiss]);

  return (
    <div
      /* Errors interrupt; everything else waits for a pause in speech. */
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
      className="pointer-events-auto flex items-start gap-2.5 rounded-card border border-border bg-surface-overlay p-3 shadow-overlay animate-slide-in-bottom"
    >
      <span className={`mt-px shrink-0 ${TONE_ACCENTS[toast.tone]}`}>{TONE_ICONS[toast.tone]}</span>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text">{toast.title}</div>
        {toast.description !== undefined ? (
          <div className="mt-0.5 text-xs text-text-muted">{toast.description}</div>
        ) : null}
        {toast.action !== undefined ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismiss();
            }}
            className="mt-1.5 rounded-control text-xs font-medium text-accent transition-colors duration-fast ease-standard hover:text-accent-hover focus-visible:focus-ring"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={dismiss}
        className="-mr-1 -mt-0.5 shrink-0 rounded-chip p-1 text-text-faint transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
