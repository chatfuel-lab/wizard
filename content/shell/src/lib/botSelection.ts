/**
 * Which workspace and which bot the app is looking at.
 *
 * A Chatfuel account is a tree — workspaces, each holding bots — and the app
 * moves around it: the topbar picks a workspace, then a bot inside it. Nothing
 * about that lives in `.env` any more, because the tree changes without anybody
 * redeploying; a bot created this morning has to be usable this afternoon.
 *
 * So the answer is assembled from three sources, in this order of authority:
 * what the person last chose (localStorage), what the wizard wrote as the
 * starting point (an env var), and what the account actually has right now.
 * The last one is the referee: a stored id whose bot has since been deleted is
 * not an error state to show, it is a stale note to drop.
 *
 * Kept free of React so the rules can be read — and tested — on their own.
 */

import { clearDeviceCaches } from '../modules/shellApi';

export interface WorkspaceOption {
  id: string;
  title: string;
  bots: Array<{ id: string; title: string }>;
}

export interface Selection {
  workspaceId: string;
  botId: string;
}

export interface ResolveSelectionInput {
  /** The account's workspaces. Empty while the query is still out. */
  workspaces: readonly WorkspaceOption[];
  /** What was last chosen here, if anything. */
  stored: Partial<Selection>;
  /** VITE_CHATFUEL_WORKSPACE_ID — the workspace the wizard opened on. */
  defaultWorkspaceId: string;
}

/**
 * The selection to render. `botId` is '' only when nothing can fill it — the
 * list has not arrived, or the chosen workspace genuinely holds no bots.
 */
export function resolveSelection({ workspaces, stored, defaultWorkspaceId }: ResolveSelectionInput): Selection {
  if (workspaces.length === 0) {
    // Nothing to check the stored ids against yet. Handing them back unchanged
    // is what lets a returning visitor mount straight into their last bot
    // instead of watching a spinner for one round trip.
    return { workspaceId: stored.workspaceId ?? defaultWorkspaceId, botId: stored.botId ?? '' };
  }

  const byId = (id: string | undefined) => workspaces.find((w) => w.id === id);
  const workspace =
    byId(stored.workspaceId) ??
    // The bot outlives the workspace id: with no stored workspace, or one the
    // account no longer has, the remembered bot names where it lives now — a
    // bot can be moved between workspaces, and following it is the more
    // faithful restore than dropping the whole choice.
    (stored.botId ? workspaces.find((w) => w.bots.some((b) => b.id === stored.botId)) : undefined) ??
    byId(defaultWorkspaceId) ??
    workspaces.find((w) => w.bots.length > 0) ??
    workspaces[0]!;

  const bot = workspace.bots.find((b) => b.id === stored.botId) ?? workspace.bots[0];
  return { workspaceId: workspace.id, botId: bot?.id ?? '' };
}

/**
 * The workspace list as the picker shows it, with same-named ones told apart.
 *
 * Chatfuel does not require a workspace title to be unique, and it makes them
 * collide by itself: creating a bot without naming a workspace leaves a
 * throwaway one called "My Workspace" behind, so an account that has done that
 * a few times offers several identical entries. What distinguishes them is
 * what is inside, so that is what gets appended — and only when it has to be,
 * because a title that already stands alone needs no help. The id is the last
 * resort, for workspaces that are alike all the way down.
 */
export function workspaceOptions(workspaces: readonly WorkspaceOption[]): Array<{ id: string; title: string }> {
  const tally = (titles: readonly string[]) => {
    const counts = new Map<string, number>();
    for (const title of titles) counts.set(title, (counts.get(title) ?? 0) + 1);
    return (title: string) => counts.get(title) ?? 0;
  };

  const byTitle = tally(workspaces.map((w) => w.title));
  const named = workspaces.map((w) => ({
    workspace: w,
    title: byTitle(w.title) > 1 ? `${w.title} — ${w.bots.map((b) => b.title).join(', ') || 'no bots'}` : w.title,
  }));

  const byNamed = tally(named.map((entry) => entry.title));
  return named.map(({ workspace, title }) => ({
    id: workspace.id,
    title: byNamed(title) > 1 ? `${title} · ${workspace.id.slice(-6)}` : title,
  }));
}

const WORKSPACE_KEY = 'chatfuel.workspace';
const BOT_KEY = 'chatfuel.bot';

/**
 * The last choice, or an empty object.
 *
 * Storage can throw rather than be absent — a browser with site data switched
 * off answers the property access itself with a SecurityError — so every call
 * is guarded. Losing the memory of a choice is not worth a blank screen.
 */
export function readStoredSelection(): Partial<Selection> {
  try {
    const workspaceId = localStorage.getItem(WORKSPACE_KEY) ?? undefined;
    const botId = localStorage.getItem(BOT_KEY) ?? undefined;
    return { workspaceId: workspaceId || undefined, botId: botId || undefined };
  } catch {
    return {};
  }
}

export function writeStoredSelection(selection: Selection): void {
  try {
    /* Another bot is another subject, and what modules cached on the device is
       the last one's — read before the write, because after it there is nothing
       left to compare against. */
    const previousBot = localStorage.getItem(BOT_KEY);
    if (previousBot && previousBot !== selection.botId) clearDeviceCaches();
    localStorage.setItem(WORKSPACE_KEY, selection.workspaceId);
    // A workspace holding no bots is still a choice worth remembering; writing
    // an empty bot id would make the next visit read it back as a real one.
    if (selection.botId) localStorage.setItem(BOT_KEY, selection.botId);
    else localStorage.removeItem(BOT_KEY);
  } catch {
    /* the choice lasts this session instead */
  }
}
