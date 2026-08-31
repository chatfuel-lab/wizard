/**
 * Drafts — the "long text and lists" half of the hybrid save model.
 *
 * A switch, a checkbox or a select saves on change. A prompt, an FAQ list, a
 * product form is edited as a DRAFT: the editor holds `value` and `baseline`,
 * `dirty` is "value ≠ baseline", Save writes, Cancel restores. Drafts live in
 * the editors — but three things need to know about ALL of them at once: ⌘S
 * ("save everything unsaved"), the header badge, and the navigation guard that
 * stops a rail click from throwing away typing.
 *
 * The registry is a plain mutable map, not React state: a keystroke inside one
 * editor must not re-render the workspace. Subscribers get a `touch()`.
 */
import type { SourceId } from './sources';

export interface DraftHandle {
  /** `${source}:${what}` — unique per editor instance. */
  key: string;
  source: SourceId;
  dirty: boolean;
  /** Save the draft; resolves when the write is done (or rejects). */
  save: () => Promise<void>;
  discard: () => void;
}

export interface DraftRegistry {
  register: (handle: DraftHandle) => () => void;
  /** Keys of dirty drafts, registration order. */
  dirtyKeys: () => string[];
  dirtyCount: () => number;
  /** Dirty drafts on one source — the guard for leaving it. */
  dirtyOn: (source: SourceId) => string[];
  /** Save every dirty draft, sequentially: the Fuely config takes one write at a time. */
  saveAll: () => Promise<{ saved: string[]; failed: string[] }>;
  discardAll: () => void;
  subscribe: (listener: () => void) => () => void;
  /** Editors call this when their dirty flag changes so badges update. */
  touch: () => void;
}

export const draftKey = (source: SourceId, what: string): string => `${source}:${what}`;

export function createDraftRegistry(): DraftRegistry {
  const handles = new Map<string, DraftHandle>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const dirty = () => [...handles.values()].filter((handle) => handle.dirty);
  return {
    register(handle) {
      handles.set(handle.key, handle);
      notify();
      return () => {
        /* Only if it is still OURS: a remount registers the new handle first. */
        if (handles.get(handle.key) === handle) handles.delete(handle.key);
        notify();
      };
    },
    dirtyKeys: () => dirty().map((handle) => handle.key),
    dirtyCount: () => dirty().length,
    dirtyOn: (source) =>
      dirty()
        .filter((handle) => handle.source === source)
        .map((handle) => handle.key),
    async saveAll() {
      const saved: string[] = [];
      const failed: string[] = [];
      for (const handle of dirty()) {
        try {
          await handle.save();
          saved.push(handle.key);
        } catch {
          failed.push(handle.key);
        }
      }
      notify();
      return { saved, failed };
    },
    discardAll() {
      for (const handle of dirty()) handle.discard();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    touch: notify,
  };
}

/**
 * What a refetch means for a draft the person is holding.
 *
 *   not dirty, server moved    → adopt it silently
 *   dirty, server unchanged    → keep typing
 *   dirty, server moved        → conflict: "Changed elsewhere · Use theirs / Keep mine"
 */
export type DraftReconcile = 'adopt' | 'keep' | 'conflict';

export function reconcileDraft(dirty: boolean, serverKey: string, baselineKey: string): DraftReconcile {
  if (!dirty) return serverKey === baselineKey ? 'keep' : 'adopt';
  return serverKey === baselineKey ? 'keep' : 'conflict';
}
