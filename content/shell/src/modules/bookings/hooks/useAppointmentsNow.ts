import { useEffect, useState } from 'react';
import { NOW_TICK_MS } from '../lib/zone';

/**
 * The instant the appointments list splits upcoming from past on. The
 * workspace has its own minute tick for `todayKey`, but the frozen view props
 * carry the day, not the instant — and the split has to be on the instant
 * (a booking that ended an hour ago is past even though it is today).
 */
export function useAppointmentsNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
