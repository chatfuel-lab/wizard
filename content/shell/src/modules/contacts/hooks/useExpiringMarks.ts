import { useEffect, useMemo, useState } from 'react';
import { ARRIVED_MS, FLASH_MS } from '../lib/contactsStore';
import { freshStamps, nextExpiry } from '../lib/tableSelection';

export interface ExpiringMarks {
  /** Rolled-back rows still worth flashing. */
  flash: Record<string, number>;
  /** Live arrivals still worth marking. */
  arrived: Record<string, number>;
}

/** The marks that expire on their own: rollback flashes and live arrivals. */
export function useExpiringMarks(
  flashStamps: Readonly<Record<string, number>>,
  arrivedStamps: Readonly<Record<string, number>>,
): ExpiringMarks {
  const [tick, setTick] = useState(0);

  const now = Date.now();
  /* `tick` is the timed repaint: it re-runs the sweep even when two renders
     land in the same millisecond and `now` cannot tell them apart. */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` is the timed repaint: it re-runs the sweep when `now` cannot tell two renders apart
  const flash = useMemo(() => freshStamps(flashStamps, now, FLASH_MS), [flashStamps, now, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` is the timed repaint: it re-runs the sweep when `now` cannot tell two renders apart
  const arrived = useMemo(() => freshStamps(arrivedStamps, now, ARRIVED_MS), [arrivedStamps, now, tick]);

  useEffect(() => {
    /* The reducer expires stamps on its next action, and a single failure in a
       quiet list produces no next action — so the view times its own repaint. */
    const flashIn = nextExpiry(flashStamps, Date.now(), FLASH_MS);
    const arrivedIn = nextExpiry(arrivedStamps, Date.now(), ARRIVED_MS);
    const delays = [flashIn, arrivedIn].filter((value): value is number => value !== null);
    if (delays.length === 0) return undefined;
    const timer = setTimeout(() => setTick((n) => n + 1), Math.min(...delays) + 16);
    return () => clearTimeout(timer);
  }, [flashStamps, arrivedStamps, tick]);

  return { flash, arrived };
}
