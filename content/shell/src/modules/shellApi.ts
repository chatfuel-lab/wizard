import { createContext, useContext, useEffect, useId } from 'react';

/**
 * The *runtime* half of the shell ↔ module contract. `types.ts` next door is
 * types only; this file also ships runtime code, and that is the whole reason
 * it exists as a second file: `types.ts` is imported by `lib/route.ts` and
 * by every module, and turning it into a module with side-effect-free-but-real
 * exports would put React into a file that today erases to nothing.
 *
 * Three capabilities live here. Two of them exist for one feature — the
 * Coworker, an assistant that can be asked about the app it is part of:
 *
 *   1. A module can *publish what the operator is looking at*
 *      (`usePublishScreenContext`). The assistant's `get_frontend_state` tool
 *      asks for exactly that and blocks ~10s waiting for the answer.
 *   2. The module can *act on the operator's app* (`ShellBridge`) when the
 *      assistant sends a `CoworkerFrontendAction` — today `navigate` with a
 *      `pathKey`.
 *
 * Neither is coworker-specific in its shape, and neither lets a module reach
 * another module: publishing is write-only into a sink the shell owns, and the
 * bridge only ever resolves against the module registry. Import boundaries
 * (the module boundaries) allow a module to import this file and `./types`, and
 * nothing else outside its own subtree.
 *
 * The third belongs to no feature and is the same shape: a module that caches
 * its data on the device (`registerDeviceCache`) needs to hear when the shell
 * ends the session that data belonged to. Same direction as the other two —
 * the module hands the shell a function and learns nothing about it.
 */

/* -------------------------------------------------------------------------- */
/* Screen context                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The value shape a module may publish. Deliberately the whole JSON grammar and
 * not a flat string map: in practice `coworkerConversationFrontendState
 * SubmitReply(data: Map!)` round-trips nested objects, arrays, numbers and
 * booleans to the model verbatim, so flattening would only lose information.
 */
export type ScreenValue = string | number | boolean | null | ScreenValue[] | { [key: string]: ScreenValue };
export type ScreenDetail = Record<string, ScreenValue>;

/** What the shell knows about the current screen, handed to the dock on demand. */
export interface ScreenSnapshot {
  moduleId: string | null;
  moduleTitle: string | null;
  /** The address bar, verbatim — the model quotes it back and it must be real. */
  url: string;
  params: Record<string, string>;
  /** Merged from every live `usePublishScreenContext` call. */
  detail: ScreenDetail;
  /** Where else the assistant could send the operator. */
  destinations: { id: string; title: string }[];
}

type Sink = (id: string, detail: ScreenDetail | null) => void;

const NO_SINK: Sink = () => {};
const ScreenSinkContext = createContext<Sink>(NO_SINK);

/** Provided by the shell. Absent in an embed, where publishing is a no-op. */
export const ScreenContextProvider = ScreenSinkContext.Provider;

/**
 * Publish what the operator is looking at, for the assistant to read.
 *
 * Call it wherever the answer actually lives — the workspace that knows the
 * view, or the view that knows the row count — as many times as you like; the
 * shell merges every live entry, later mounts winning on a key clash. Pass
 * `null` to publish nothing.
 *
 * The value is keyed by its own JSON, so an inline object literal is fine and
 * does not need memoising: re-publishing only happens when the content changes.
 */
export function usePublishScreenContext(detail: ScreenDetail | null): void {
  const publish = useContext(ScreenSinkContext);
  const id = useId();
  const json = detail === null ? null : JSON.stringify(detail);
  useEffect(() => {
    publish(id, json === null ? null : (JSON.parse(json) as ScreenDetail));
    return () => publish(id, null);
  }, [publish, id, json]);
}

/* -------------------------------------------------------------------------- */
/* Acting on the operator's screen                                            */
/* -------------------------------------------------------------------------- */

/**
 * A `CoworkerFrontendAction` passed through verbatim: `actionType` and
 * `parameters` are free-form strings on the wire, so the vocabulary is the
 * server's, not ours. The shell interprets what it recognises and reports back
 * honestly on what it does not — an unknown action is shown, never guessed at.
 *
 * In practice: `{ actionType: 'navigate', parameters:
 * { pathKey: 'Deals' } }` — a *named destination*, not a URL.
 */
export interface ShellAction {
  actionType: string;
  parameters: Record<string, unknown>;
}

export interface ShellActionResult {
  ok: boolean;
  /** One line for the thread: "Opened Deals" / "I don't know a page called X". */
  label: string;
  /** Present when the action was reversible; restores the previous route. */
  undo?: () => void;
}

export interface ShellBridge {
  snapshot(): ScreenSnapshot;
  run(action: ShellAction): ShellActionResult;
}

const ShellBridgeContext = createContext<ShellBridge | null>(null);

/** Provided by the shell. Absent in an embed, where there is no app to move. */
export const ShellBridgeProvider = ShellBridgeContext.Provider;

/**
 * The app around this module, when there is one.
 *
 * Null in an embed — a module mounted inside somebody else's product has no
 * business reading or rewriting their address bar, and the one caller degrades
 * to saying so rather than pretending it moved.
 */
export function useShellBridge(): ShellBridge | null {
  return useContext(ShellBridgeContext);
}

/* -------------------------------------------------------------------------- */
/* What a module keeps on the device                                          */
/* -------------------------------------------------------------------------- */

/**
 * Drop whatever this module keeps on the device.
 *
 * Some modules cache their data in `localStorage` so a screen paints before the
 * network answers — the flow builder keeps whole flows there, message texts and
 * WhatsApp templates included. That copy belongs to one signed-in person
 * looking at one bot, and nothing in the browser retires it: signing out ends
 * the session and switching bots changes the subject, and the copy outlives
 * both. On a shared machine the next person opens the app and it is still
 * there.
 *
 * A sweep must not throw. Storage itself throws where site data is switched
 * off, and one module's cache is not worth another module's sign-out; the
 * answer is not read either.
 */
export type CacheSweep = () => void;

const sweeps = new Set<CacheSweep>();

/**
 * Register a sweep, and get back the function that unregisters it.
 *
 * Called from a module's descriptor module, which is loaded whether or not the
 * screen behind it ever opens — the cache outlives the screen, so the sweep has
 * to be registered by something that does too.
 */
export function registerDeviceCache(sweep: CacheSweep): () => void {
  sweeps.add(sweep);
  return () => {
    sweeps.delete(sweep);
  };
}

/**
 * Drop every registered cache: the person signed out, or moved to another bot.
 */
export function clearDeviceCaches(): void {
  for (const sweep of sweeps) {
    try {
      sweep();
    } catch {
      /* one module's cache is not worth the caller's next line */
    }
  }
}
