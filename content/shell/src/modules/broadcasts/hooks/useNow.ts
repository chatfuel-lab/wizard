import { useEffect, useState } from 'react';
import { NOW_TICK_MS } from '../lib/zone';

/** "Now", moving once a minute — enough for a next-send column and a past-time check. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
