import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrafts } from '../AutomationsDraftContext';
import { draftKey, reconcileDraft } from '../lib/drafts';
import { sameUpdate, stableJson } from '../lib/settingValue';
import type { KnownSettingTypename, SettingUpdate } from '../types';

/** Any setting's write shape. */
export type DraftValue = SettingUpdate['update'];

export interface DraftApi<V extends DraftValue> {
  value: V;
  baseline: V;
  dirty: boolean;
  /** The server moved under a dirty draft. */
  conflict: boolean;
  saving: boolean;
  /** Inline error from the last save, or null. */
  error: string | null;
  set: (next: V | ((prev: V) => V)) => void;
  save: () => Promise<void>;
  discard: () => void;
  /** Conflict resolution: take the server's value as the new baseline and value. */
  useTheirs: () => void;
  /** Conflict resolution: keep editing mine (clears the flag; Save still wins). */
  keepMine: () => void;
}

/**
 * One draft section (see `lib/drafts.ts` for the model). `serverValue` is the
 * write-shape of the setting as the store currently holds it — the caller
 * passes `settingUpdateInput(setting).update`. `write` performs the save (the
 * mutations hook's `saveSetting`); this hook owns dirty / conflict / error and
 * registers itself so ⌘S, the badge and the guard see it.
 */
export function useSettingDraft<V extends DraftValue>(
  automationId: string,
  typename: KnownSettingTypename,
  serverValue: V,
  write: (value: V) => Promise<void>,
): DraftApi<V> {
  const registry = useDrafts();
  const [baseline, setBaseline] = useState<V>(serverValue);
  const [value, setValue] = useState<V>(serverValue);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = !sameUpdate(value, baseline);

  // Live reconciliation.
  const serverKey = stableJson(serverValue);
  const baselineKey = stableJson(baseline);
  useEffect(() => {
    const what = reconcileDraft(dirty, serverKey, baselineKey);
    if (what === 'adopt') {
      setBaseline(serverValue);
      setValue(serverValue);
      setConflict(false);
    } else if (what === 'conflict') {
      setConflict(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const set = useCallback<DraftApi<V>['set']>((next) => {
    setError(null);
    setValue((prev) => (typeof next === 'function' ? (next as (p: V) => V)(prev) : next));
  }, []);

  const valueRef = useRef(value);
  valueRef.current = value;
  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await write(valueRef.current);
      setBaseline(valueRef.current);
      setConflict(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
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

  // Registry membership + dirty notification.
  const key = draftKey(automationId, typename);
  const saveRef = useRef(save);
  saveRef.current = save;
  const discardRef = useRef(discard);
  discardRef.current = discard;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const handle = {
      key,
      automationId,
      typename,
      get dirty() {
        return dirtyRef.current;
      },
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    };
    return registry.register(handle);
  }, [registry, key, automationId, typename]);
  useEffect(() => {
    registry.touch();
  }, [registry, dirty]);

  return useMemo(
    () => ({ value, baseline, dirty, conflict, saving, error, set, save, discard, useTheirs, keepMine }),
    [value, baseline, dirty, conflict, saving, error, set, save, discard, useTheirs, keepMine],
  );
}
