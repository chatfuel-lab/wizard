/**
 * The toast stack, as a pure reducer.
 *
 * ToastProvider is the DOM half; everything that decides what the stack looks
 * like lives here, because the rules that actually bite — re-showing an id,
 * overflowing the cap, never evicting something the user must acknowledge —
 * are the ones worth a test.
 */

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  /** Auto-dismiss delay in ms. 0 means the toast stays until dismissed. */
  duration: number;
  action?: ToastAction;
}

export interface ToastState {
  /** Oldest first — the stack renders in this order and grows downward. */
  toasts: Toast[];
}

export type ToastEvent = { type: 'show'; toast: Toast } | { type: 'dismiss'; id: string } | { type: 'clear' };

/** Beyond this the stack stops being a notification and becomes a wall. */
export const MAX_TOASTS = 4;

export const initialToastState: ToastState = { toasts: [] };

export function toastReducer(state: ToastState, event: ToastEvent): ToastState {
  switch (event.type) {
    case 'show': {
      const existing = state.toasts.findIndex((toast) => toast.id === event.toast.id);
      if (existing !== -1) {
        /* Same id means "update this one", not "stack another". A mutation that
         * retries would otherwise queue five identical failures. */
        const toasts = [...state.toasts];
        toasts[existing] = event.toast;
        return { toasts };
      }

      const toasts = [...state.toasts, event.toast];
      while (toasts.length > MAX_TOASTS) {
        /* Evict the oldest auto-dismissing toast. Sticky ones are sticky
         * because someone has to read them — dropping those to make room for a
         * "Saved" would lose the only copy of an error message. */
        const evictable = toasts.findIndex((toast) => toast.duration > 0);
        toasts.splice(evictable === -1 ? 0 : evictable, 1);
      }
      return { toasts };
    }

    case 'dismiss': {
      const toasts = state.toasts.filter((toast) => toast.id !== event.id);
      return toasts.length === state.toasts.length ? state : { toasts };
    }

    case 'clear':
      return state.toasts.length === 0 ? state : initialToastState;
  }
}
