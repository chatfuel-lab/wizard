import { useCallback, useRef, useState } from 'react';

/**
 * Supports both `value`/`onChange` and `defaultValue` on the same component.
 *
 * Controlled wins whenever `value` is not undefined; the internal state is kept
 * in sync anyway, so a component that starts controlled and later drops the
 * prop does not snap back to its original default.
 */
export function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;

  /* Keep the latest callback in a ref so setValue stays referentially stable —
   * it ends up in the dep array of effects all over the overlay components. */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const controlledRef = useRef(isControlled);
  controlledRef.current = isControlled;

  const setValue = useCallback((next: T) => {
    if (!controlledRef.current) setUncontrolled(next);
    onChangeRef.current?.(next);
  }, []);

  return [value, setValue];
}
