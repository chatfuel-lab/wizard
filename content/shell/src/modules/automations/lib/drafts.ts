/**
 * Drafts — the "prompts and lists" half of the hybrid save model.
 *
 * A switch or a select saves on change. A prompt, a keyword list, a rules
 * list or a captures list is edited as a DRAFT: the section holds `value` and
 * `baseline`, `dirty` is "value ≠ baseline" by write shape, Save writes,
 * Cancel restores the baseline. Drafts live in the editors, not the store —
 * but three things need to know about ALL of them at once: ⌘S ("save every
 * dirty draft"), the header badge ("2 unsaved"), and the navigation guard.
 * That is the registry: a plain map of key → handle, pure here, provided by
 * `AutomationsDraftContext`.
 *
 * Live updates. When the server value under a draft changes:
 *   - not dirty            → the section adopts it (value = baseline = server);
 *   - dirty, server equals the old baseline → nothing to do;
 *   - dirty, server moved  → `conflict`: the section shows "Changed elsewhere ·
 *                             Use theirs / Keep mine". Saving anyway wins (the
 *                             API is last-write).
 */
export interface DraftHandle {
  /** `${automationId}:${typename}` */
  key: string;
  automationId: string;
  typename: string;
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
  /** Save every dirty draft, sequentially (the API has a per-bot edit lock). */
  saveAll: () => Promise<{ saved: string[]; failed: string[] }>;
  discardAll: () => void;
  /** Dirty drafts on one automation — the guard for closing its card / panel. */
  dirtyOn: (automationId: string) => string[];
  /** Subscribe to registry changes (register / unregister / dirty flips). */
  subscribe: (listener: () => void) => () => void;
  /** Editors call this when their dirty flag changes so badges update. */
  touch: () => void;
}

export const draftKey = (automationId: string, typename: string): string => `${automationId}:${typename}`;

export function createDraftRegistry(): DraftRegistry {
  const handles = new Map<string, DraftHandle>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const dirty = () => [...handles.values()].filter((h) => h.dirty);
  return {
    register(handle) {
      handles.set(handle.key, handle);
      notify();
      return () => {
        if (handles.get(handle.key) === handle) handles.delete(handle.key);
        notify();
      };
    },
    dirtyKeys: () => dirty().map((h) => h.key),
    dirtyCount: () => dirty().length,
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
      return { saved, failed };
    },
    discardAll() {
      for (const handle of dirty()) handle.discard();
      notify();
    },
    dirtyOn: (automationId) =>
      dirty()
        .filter((h) => h.automationId === automationId)
        .map((h) => h.key),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    touch: notify,
  };
}

/** What a live update means for a draft — the pure half of `useSettingDraft`. */
export type DraftReconcile = 'adopt' | 'keep' | 'conflict';

export function reconcileDraft(dirty: boolean, serverKey: string, baselineKey: string): DraftReconcile {
  if (!dirty) return serverKey === baselineKey ? 'keep' : 'adopt';
  return serverKey === baselineKey ? 'keep' : 'conflict';
}
