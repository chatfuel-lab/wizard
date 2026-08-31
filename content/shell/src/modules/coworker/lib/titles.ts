/**
 * What a row in the rail actually says.
 *
 * This is a whole file because the coworker's titles are not names. The API has
 * no rename, so `CoworkerConversation.title` is whatever the server generated
 * from the first user message, and in practice that is:
 *
 * - a **whole sentence**, punctuation and all — "Add a colour consultation, 45
 *   minutes, 80 euros" — which is 46 characters in a 20rem rail;
 * - sometimes the **literal string `"null"`**, because something upstream
 *   stringified a null. `title || 'New conversation'` does not catch that: the
 *   string is truthy, so the rail printed the word "null" as a chat name;
 * - sometimes absent while the first message is already on screen, because the
 *   title is generated after the fact.
 *
 * On top of that sits the operator's own name for the chat, which this module stores in
 * `frontendStateStorage` (see `chatListStore.ts` for why there and not
 * in localStorage). It wins over everything, untouched — they typed it.
 *
 * All of it is one decision with four inputs and one output, so it is one pure
 * function with a test rather than four `||`s spread over the components that
 * would drift the first time one of them renders a row the others do not.
 */

/** Fits the 20rem rail at `text-sm` without truncating mid-word most of the time. */
export const TITLE_MAX = 52;

export const FALLBACK_TITLE = 'New chat';

interface TitleInput {
  /** The operator's own name for the chat, from `frontendStateStorage.title`. */
  operatorTitle?: string | null;
  /** Server-generated from the first user message. May be `"null"`. */
  serverTitle?: string | null;
  /** The first message's content — used while the server has not titled it. */
  preview?: string | null;
}

type TitleSource = 'operator' | 'server' | 'preview' | 'none';

interface ChatTitle {
  text: string;
  source: TitleSource;
}

/**
 * Values the server sends that are not titles.
 *
 * `""` and whitespace are the honest empties; `"null"` and `"undefined"` are
 * the observed stringified ones. Deliberately not a general "looks like junk"
 * heuristic — a chat genuinely called "None" is the operator's business.
 */
const NON_TITLES = new Set(['', 'null', 'undefined']);

export function isServerTitle(title: string | null | undefined): boolean {
  if (typeof title !== 'string') return false;
  return !NON_TITLES.has(title.trim().toLowerCase());
}

/**
 * Truncate on a word boundary, falling back to a hard cut.
 *
 * The boundary is only used when it keeps most of the budget: backing up from
 * 52 characters to the space at 14 turns a title into a fragment, and a hard
 * cut with an ellipsis is more informative than one word.
 */
export function truncateTitle(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  const body = space >= Math.floor(max * 0.6) ? cut.slice(0, space) : cut;
  return `${body.trimEnd()}…`;
}

/**
 * One line out of message content: the first non-empty line, whitespace
 * collapsed. A preview is raw markdown — a fenced block or a bullet list would
 * otherwise arrive in the rail with its newlines intact and blow the row open.
 */
export function oneLine(text: string): string {
  for (const line of text.split('\n')) {
    const collapsed = line.replace(/\s+/g, ' ').trim();
    if (collapsed !== '') return collapsed;
  }
  return '';
}

/**
 * A generated title is a sentence, and a sentence ends in a full stop that a
 * heading does not want. Only the full stop: "How is my pipeline doing?" keeps
 * its question mark, because the question is what the chat is about.
 */
function trimSentence(text: string): string {
  return text.endsWith('.') && !text.endsWith('..') ? text.slice(0, -1) : text;
}

/**
 * The operator's own name for a chat, out of `frontendStateStorage`.
 *
 * The key lives here rather than beside the pin because it is a *title* fact —
 * `conversationTitle` below is the whole rule in one call, and it must be able
 * to answer from a conversation alone.
 */
export const STORAGE_TITLE_KEY = 'title';

export function operatorTitleOf(storage: Record<string, unknown> | null | undefined): string | null {
  /* `Map` is `Record<string, unknown>` on the wire, and the assistant can write
     into the same map, so every read is guarded. */
  const raw = storage?.[STORAGE_TITLE_KEY];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

export function chatTitle(input: TitleInput, max: number = TITLE_MAX): ChatTitle {
  const operator = input.operatorTitle?.trim() ?? '';
  if (operator !== '') return { text: truncateTitle(oneLine(operator), max), source: 'operator' };

  const server = input.serverTitle ?? '';
  if (isServerTitle(server)) {
    return { text: truncateTitle(trimSentence(oneLine(server)), max), source: 'server' };
  }

  const preview = oneLine(input.preview ?? '');
  if (preview !== '') return { text: truncateTitle(trimSentence(preview), max), source: 'preview' };

  return { text: FALLBACK_TITLE, source: 'none' };
}

/**
 * The whole rule, from a conversation — **the module's one answer** to "what is
 * this chat called", for the rail, the ⌘K palette and the thread's own
 * accessible name alike. It can see the rename because the rename is stored on
 * the conversation and not in the message list.
 */
export function conversationTitle(
  state: { title?: string | null; frontendStateStorage?: Record<string, unknown> | null },
  preview?: string | null,
  max: number = TITLE_MAX,
): string {
  return chatTitle(
    { operatorTitle: operatorTitleOf(state.frontendStateStorage), serverTitle: state.title, preview },
    max,
  ).text;
}
