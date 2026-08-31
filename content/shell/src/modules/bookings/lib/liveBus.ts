/**
 * One live channel, many sinks.
 *
 * The three booking subscriptions are BOT-WIDE (no filter arguments), so
 * deals' "each view owns its channel" would open three sockets per mounted
 * range store for the same stream. Instead the workspace subscribes once and
 * publishes every event on this bus; each range store, the panel's detail
 * store and the availability cache subscribe to the bus. Own-mutation echoes
 * are published too (`origin: 'own'`), so a create/update/delete reconciles
 * through exactly the path a teammate's would — one idempotent path, not two.
 *
 * Pure and synchronous: `publish` calls every listener in registration order;
 * a listener that throws does not stop the others (a broken sink is a bug in
 * that sink, not a reason to lose an event elsewhere).
 */
import type { LiveEvent } from './rangeStore';

export type BusEvent = LiveEvent | { kind: 'reconnect' };

export type BusListener = (event: BusEvent) => void;

export interface LiveBus {
  subscribe: (listener: BusListener) => () => void;
  publish: (event: BusEvent) => void;
  /** Listener count — for tests and the live dot. */
  size: () => number;
}

export function createLiveBus(): LiveBus {
  const listeners = new Set<BusListener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(event) {
      for (const listener of Array.from(listeners)) {
        try {
          listener(event);
        } catch {
          /* a sink's failure is its own */
        }
      }
    },
    size: () => listeners.size,
  };
}

/** The days (in a zone) an event touches — both ends of a move, so both are invalidated. */
export function touchedDays(
  before: { startTime: string; endTime: string } | null,
  after: { startTime: string; endTime: string } | null,
  dayKeyOf: (ms: number) => string,
): string[] {
  const days = new Set<string>();
  for (const rec of [before, after]) {
    if (!rec) continue;
    const start = new Date(rec.startTime).getTime();
    const end = new Date(rec.endTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    days.add(dayKeyOf(start));
    // A booking crossing midnight touches its end day too; step by day until past the end.
    for (let t = start + 86_400_000; t < end + 86_400_000; t += 86_400_000) days.add(dayKeyOf(Math.min(t, end - 1)));
  }
  return Array.from(days);
}
