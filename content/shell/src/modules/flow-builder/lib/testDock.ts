/**
 * The Test dock's own decisions, as pure functions: where it may float, how big
 * it is, what the device remembers about it, and what a refused start says.
 *
 * `lib/layout.ts` in this module is the CANVAS auto-layout algorithm, which is
 * why the band constant lives here instead.
 */
import { hasErrorCode } from '~api';
import type { Band, FloatingDockSize } from '~ui';

/**
 * Below this the dock is a bottom drawer rather than a floating window: at
 * 600px the canvas has no rectangle to spare, and a window covering most of it
 * is not a window. The same call the block palette makes about its own island.
 */
export const TEST_DOCK_INLINE_FROM: Band = 'narrow';

/** Big enough for a WhatsApp buttons message and its buttons without a scroll. */
export const DEFAULT_DOCK_SIZE: FloatingDockSize = { width: 352, height: 480 };
export const MIN_DOCK_SIZE: FloatingDockSize = { width: 288, height: 320 };

/** What the dock covers on the right, so a fit does not park a block under it. */
export const dockInset = (size: FloatingDockSize): number => size.width + 12 * 2;

// ---------------------------------------------------------------------------
// What the device remembers
// ---------------------------------------------------------------------------

export const DOCK_STATE_KEY = 'chatfuel.flow-builder.test-dock.v1';

export interface DockState {
  open: boolean;
  size: FloatingDockSize;
}

export const DEFAULT_DOCK_STATE: DockState = { open: true, size: DEFAULT_DOCK_SIZE };

/** The subset of `Storage` this file touches; a `Map`-backed fake satisfies it in tests. */
export interface DockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Everything read back is untrusted — it is whatever some past version of this
 * app wrote. A shape that is not the shape gets the default, never a throw, and
 * the size is clamped so a remembered 4000px window cannot paint off-canvas
 * after a build changed the minimum.
 */
export function readDockState(storage: DockStorage | undefined): DockState {
  if (!storage) return DEFAULT_DOCK_STATE;
  let raw: string | null;
  try {
    raw = storage.getItem(DOCK_STATE_KEY);
  } catch {
    return DEFAULT_DOCK_STATE;
  }
  if (!raw) return DEFAULT_DOCK_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_DOCK_STATE;
    const record = parsed as Record<string, unknown>;
    const size = record.size as Record<string, unknown> | undefined;
    return {
      open: typeof record.open === 'boolean' ? record.open : DEFAULT_DOCK_STATE.open,
      size: clampDockSize({
        width: typeof size?.width === 'number' ? size.width : DEFAULT_DOCK_SIZE.width,
        height: typeof size?.height === 'number' ? size.height : DEFAULT_DOCK_SIZE.height,
      }),
    };
  } catch {
    return DEFAULT_DOCK_STATE;
  }
}

export function writeDockState(storage: DockStorage | undefined, state: DockState): void {
  if (!storage) return;
  try {
    storage.setItem(DOCK_STATE_KEY, JSON.stringify(state));
  } catch {
    /* A full or blocked storage costs the reader a remembered size, nothing more. */
  }
}

export function clampDockSize(size: FloatingDockSize): FloatingDockSize {
  return {
    width: Math.max(MIN_DOCK_SIZE.width, Math.round(size.width)),
    height: Math.max(MIN_DOCK_SIZE.height, Math.round(size.height)),
  };
}

// ---------------------------------------------------------------------------
// Why a start was refused
// ---------------------------------------------------------------------------

/** The flow has no starting point, so `previewResponsesStartInFlow` has nothing to run. */
export const NO_STARTING_POINT = 'FlowStartingPointBlockDoesNotExist';

const TEST_ERRORS: Record<string, string> = {
  [NO_STARTING_POINT]: 'This flow has no starting point, so there is nothing to run.',
  ScopeNotConnectedToBot: 'This channel is not connected to the bot, so it cannot be tested.',
  InternalServerError: 'The server could not handle that — try again.',
};

/**
 * Whether the sentence on screen is the no-starting-point one.
 *
 * The state machine keeps the MESSAGE, not the error — everything downstream of
 * a failed start is a sentence a person reads — so the one refusal the dock can
 * offer a fix for is recognised by the sentence it produced. One table, one
 * comparison, and no error object smuggled through the hook to be re-inspected.
 */
export const isNoStartingPoint = (message: string | null): boolean =>
  message !== null && message === TEST_ERRORS[NO_STARTING_POINT];

export function testErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  for (const [code, message] of Object.entries(TEST_ERRORS)) if (hasErrorCode(err, code)) return message;
  return err instanceof Error ? err.message || fallback : String(err ?? fallback);
}
