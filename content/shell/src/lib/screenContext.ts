import type { ScreenDetail } from '../modules/shellApi';

/**
 * The sink behind `usePublishScreenContext`.
 *
 * Deliberately not React state. Publishing happens on every filter change, every
 * selection, every page of rows — and nobody re-renders when it does. The only
 * reader is the assistant, once, when its `get_frontend_state` tool fires and
 * blocks for ~10 seconds waiting for an answer. So the sink is a plain Map the
 * shell holds in a ref, and `read()` is called at that moment and no other.
 *
 * Entries are keyed by `useId()`, so a workspace and the view inside it can both
 * publish; later mounts win a key clash, which is the right precedence — the
 * view knows more than the workspace that hosts it.
 */
export interface ScreenSink {
  publish(id: string, detail: ScreenDetail | null): void;
  read(): ScreenDetail;
  /** For tests and for the "what is being shared" chip. */
  size(): number;
}

export function createScreenSink(): ScreenSink {
  const entries = new Map<string, ScreenDetail>();
  return {
    publish(id, detail) {
      if (detail === null) entries.delete(id);
      else entries.set(id, detail);
    },
    read() {
      const merged: ScreenDetail = {};
      for (const detail of entries.values()) Object.assign(merged, detail);
      return merged;
    },
    size: () => entries.size,
  };
}
