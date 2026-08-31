/**
 * Local version history for the instructions prompt.
 *
 * There is no history on the server. `fuelyConfigSetAdditionalInstructions`
 * overwrites, the query returns one string, and nothing anywhere remembers
 * what it used to say — which is a genuinely frightening property for the one
 * field that decides how the assistant behaves. Somebody rewrites it, saves,
 * and the previous prompt is gone.
 *
 * So the module keeps its own, in memory: every save pushes the value that was
 * REPLACED, newest first, capped. Two consequences the UI has to say out loud
 * rather than imply:
 *
 *   - it is this browser session only, and a reload empties it;
 *   - restoring loads the old text into the editor as an unsaved draft. It does
 *     not write. Restoring and then closing the page changes nothing.
 *
 * Keyed by bot: one shell can be pointed at another bot without a reload, and
 * offering bot A's prompt as bot B's history would be worse than offering none.
 */
export interface Version {
  value: string;
  /** Epoch ms, supplied by the caller — nothing here reads the clock. */
  at: number;
}

export interface VersionLog {
  /** Newest first. */
  list: () => readonly Version[];
  record: (value: string, at: number) => void;
  clear: () => void;
}

/** Enough to undo an afternoon of edits; short enough that the dialog stays a list. */
export const MAX_VERSIONS = 8;

export function createVersionLog(max: number = MAX_VERSIONS): VersionLog {
  let versions: Version[] = [];
  return {
    list: () => versions,
    record(value, at) {
      /* Blank is not a version worth offering back: "restore" to an empty
         prompt is the one restore nobody wants and everybody mis-clicks. */
      if (value.trim() === '') return;
      if (versions[0]?.value === value) return;
      versions = [{ value, at }, ...versions].slice(0, max);
    },
    clear() {
      versions = [];
    },
  };
}

const logs = new Map<string, VersionLog>();

/** The log for one bot, created on first use and kept for the life of the page. */
export function versionLogFor(botId: string): VersionLog {
  const existing = logs.get(botId);
  if (existing) return existing;
  const log = createVersionLog();
  logs.set(botId, log);
  return log;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'} ago`;

/** "just now" / "4 minutes ago" / "2 hours ago". A session rarely reaches days, but it can. */
export function versionAge(at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), 'hour');
  return plural(Math.floor(elapsed / DAY), 'day');
}

/**
 * One line of the old prompt, for the row a person picks from. Newlines
 * collapse to spaces: a preview that keeps them turns every row into a
 * paragraph and the list stops being scannable.
 */
export function versionPreview(value: string, max = 140): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
