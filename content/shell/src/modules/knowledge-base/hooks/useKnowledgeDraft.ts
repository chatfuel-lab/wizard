import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrafts } from '../KnowledgeBaseDraftContext';
import { draftKey, reconcileDraft } from '../lib/drafts';
import { messageFor } from '../lib/errors';
import type { SourceId } from '../lib/sources';

export interface KnowledgeDraft<V> {
  value: V;
  /** What the server held when this draft was started or last saved. */
  baseline: V;
  dirty: boolean;
  /** The record moved under a dirty draft — a refetch, a reconnect, somebody else. */
  conflict: boolean;
  saving: boolean;
  /** Inline message from the last save, already translated by `lib/errors`. */
  error: string | null;
  set: (next: V | ((previous: V) => V)) => void;
  save: () => Promise<void>;
  discard: () => void;
  /** Conflict resolution: take the server's value as both baseline and value. */
  useTheirs: () => void;
  /** Conflict resolution: keep editing mine (clears the flag; Save still wins). */
  keepMine: () => void;
}

/**
 * One draft editor, registered with the module's draft registry.
 *
 * The registry is what makes ⌘S, the header's unsaved badge and the
 * leave-this-source guard work, so every draft on a page joins it — including
 * the ones whose Save button is somebody else's (the profile page has one bar
 * for seven drafts).
 *
 * `write` is handed the value AND the baseline it is replacing, because every
 * caller here needs the old value to push an undo entry, and closing over
 * `baseline` from the render would hand the compensating write whatever was on
 * screen when the callback was built rather than what was actually saved.
 *
 * `identity` collapses a value to a comparable string: a string is itself, a
 * week of opening hours is `weekHoursIdentity`. Without it `dirty` would be
 * object identity, and every server response would look like an edit.
 */
export function useKnowledgeDraft<V>(
  source: SourceId,
  what: string,
  serverValue: V,
  write: (value: V, baseline: V) => Promise<void>,
  identity: (value: V) => string = String,
): KnowledgeDraft<V> {
  const registry = useDrafts();
  const [baseline, setBaseline] = useState<V>(serverValue);
  const [value, setValue] = useState<V>(serverValue);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverKey = identity(serverValue);
  const baselineKey = identity(baseline);
  const dirty = identity(value) !== baselineKey;

  /* Live reconciliation: adopt a server change nobody is competing with, flag
     one that lands under typing. Keyed on the server's value only — re-running
     this when `dirty` flips would adopt the value the person is editing. */
  useEffect(() => {
    const decision = reconcileDraft(dirty, serverKey, baselineKey);
    if (decision === 'adopt') {
      setBaseline(serverValue);
      setValue(serverValue);
      setConflict(false);
    } else if (decision === 'conflict') {
      setConflict(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const set = useCallback<KnowledgeDraft<V>['set']>((next) => {
    setError(null);
    setValue((previous) => (typeof next === 'function' ? (next as (p: V) => V)(previous) : next));
  }, []);

  /* Refs, not deps: `save` is called from the registry (⌘S, the guard) long
     after the render that produced it. */
  const valueRef = useRef(value);
  valueRef.current = value;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  const save = useCallback(async () => {
    const next = valueRef.current;
    const previous = baselineRef.current;
    setSaving(true);
    setError(null);
    try {
      await write(next, previous);
      setBaseline(next);
      setConflict(false);
    } catch (failure) {
      setError(messageFor(failure));
      /* Rethrown so `saveAll` counts it as failed and the guard does not
         navigate away from an edit that did not land. */
      throw failure;
    } finally {
      setSaving(false);
    }
  }, [write]);

  const discard = useCallback(() => {
    setValue(baseline);
    setError(null);
    setConflict(false);
  }, [baseline]);

  const useTheirs = useCallback(() => {
    setBaseline(serverValue);
    setValue(serverValue);
    setConflict(false);
  }, [serverValue]);

  const keepMine = useCallback(() => {
    setBaseline(serverValue);
    setConflict(false);
  }, [serverValue]);

  // Registry membership, and a nudge whenever the dirty flag moves.
  const key = draftKey(source, what);
  const saveRef = useRef(save);
  saveRef.current = save;
  const discardRef = useRef(discard);
  discardRef.current = discard;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    return registry.register({
      key,
      source,
      get dirty() {
        return dirtyRef.current;
      },
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    });
  }, [registry, key, source]);
  useEffect(() => {
    registry.touch();
  }, [registry, dirty]);

  return useMemo(
    () => ({ value, baseline, dirty, conflict, saving, error, set, save, discard, useTheirs, keepMine }),
    [value, baseline, dirty, conflict, saving, error, set, save, discard, useTheirs, keepMine],
  );
}
