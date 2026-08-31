/**
 * The Activity tab's rules: a conversation page turned into thread rows.
 *
 * ## Why this is not the inbox's message layer
 *
 * `Message` is an interface with ~70 implementers across five platforms, and
 * every payload field name is disambiguated by platform prefix. The inbox
 * module models all of it because an operator answers there. A record page does
 * not answer; it shows what was said. So `ContactMessages` unpacks `text` on
 * the nine text-bearing types and nothing else, and everything else is named
 * from its `__typename` — "Image message", "Template message". Deriving the
 * words from the typename rather than from a table is the whole point: a
 * typename this module has never seen still renders as words instead of
 * throwing, and no table has to be kept in step with the schema.
 *
 * A module may not import another module's source (validator pass 10), so none
 * of this is shared with the inbox even where the rule is the same one. Where
 * a rule IS the same one, the comment says so.
 *
 * ## Why identity is `id ?? cursor`
 *
 * `Message.id` is nullable in this schema — it genuinely comes back null — so
 * it is not a key on its own. The edge cursor is not null and is stable within
 * a connection, which makes the pair a usable merge key. The inbox pays for the
 * same fact with a client id it mints itself, because it also has optimistic
 * sends; a read-only tab does not.
 */

// ---------------------------------------------------------------------------
// One message
// ---------------------------------------------------------------------------

export interface MessageSenderLike {
  __typename: string;
  name?: string | null;
}

export interface MessageNodeLike {
  __typename: string;
  id?: string | null;
  sentTime: string;
  sender: MessageSenderLike;
  /** Present only on the text-bearing types this module's operation unpacks. */
  text?: string | null;
}

export interface MessageEdgeLike {
  cursor: string;
  node: MessageNodeLike;
}

/** One row of the tab. `id` and `at` are what `~ui`'s MessageList keys on. */
export interface RecordMessage {
  id: string;
  /** Epoch ms. `MessageList` sorts and buckets days on this. */
  at: number;
  /** The paging cursor this message arrived under. */
  cursor: string;
  direction: 'in' | 'out';
  /** The words, when the message carries any. Null for every other kind. */
  text: string | null;
  /** "Image message" — what to render when `text` is null. */
  kind: string;
  /** Not a bubble: a centred line about the conversation itself. */
  system: boolean;
  /** Printed above an incoming bubble when it is worth printing. */
  senderName: string | null;
}

/**
 * The only uniform direction rule across every message typename:
 * `sender.__typename === 'ContactMessageSender'` means the contact wrote it.
 * The WebWidget typenames carry no In/Out at all, so the name is not enough.
 */
export function messageDirection(sender: MessageSenderLike): 'in' | 'out' {
  return sender.__typename === 'ContactMessageSender' ? 'in' : 'out';
}

/**
 * The name above a bubble, or nothing.
 *
 * `sender.name` is NOT a display name on every sender — seen in the inbox,
 * a contact's is a server placeholder like "contact wa_… sender mock name".
 * Only an `AdminMessageSender` (a colleague) carries a real name, and that is
 * the one worth printing: in a shared inbox, WHICH colleague answered is
 * information. The contact needs no name — the header above says who they are.
 */
export function messageSenderName(sender: MessageSenderLike): string | null {
  if (sender.__typename !== 'AdminMessageSender') return null;
  const name = (sender.name ?? '').trim();
  return name === '' ? null : name;
}

const PLATFORM_PREFIXES = ['WhatsApp', 'WebWidget', 'Instagram', 'Facebook', 'TikTok', 'System'] as const;

/** `ContinueFlowButtonClick` → `Continue flow button click`. */
function humanize(words: string): string {
  const spaced = words
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
  if (spaced === '') return '';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export interface MessageKind {
  /** A `System*` typename is the conversation talking about itself. */
  system: boolean;
  /** What the row prints when there is no text. */
  label: string;
}

/**
 * The words for a message this module does not unpack.
 *
 * Derived, not tabulated: strip the platform prefix, strip `In`/`Out`, strip the
 * `Message` suffix, and say what is left. `WhatsAppInImageMessage` becomes
 * "Image message"; an unknown `FooBarMessage` becomes "Foo bar message" rather
 * than a crash or the literal typename. A system message is not a bubble, so it
 * loses the trailing noun and becomes a line: "Conversation closed".
 */
export function messageKind(typename: string): MessageKind {
  let rest = typename;
  let system = false;
  for (const prefix of PLATFORM_PREFIXES) {
    if (rest.startsWith(prefix)) {
      system = prefix === 'System';
      rest = rest.slice(prefix.length);
      break;
    }
  }
  /* Only when a new word starts right after it. `SystemInternalMessage` keeps
     its "Internal"; `WhatsAppInTextMessage` loses its "In". */
  if (/^In[A-Z]/.test(rest)) rest = rest.slice(2);
  else if (/^Out[A-Z]/.test(rest)) rest = rest.slice(3);
  if (rest.endsWith('Message')) rest = rest.slice(0, -'Message'.length);

  const words = humanize(rest);
  if (words === '') return { system, label: 'Message' };
  return { system, label: system ? words : `${words} message` };
}

/** An edge as the tab consumes it. An unreadable `sentTime` sorts to the epoch, never to NaN. */
export function toRecordMessage(edge: MessageEdgeLike): RecordMessage {
  const parsed = Date.parse(edge.node.sentTime);
  const kind = messageKind(edge.node.__typename);
  const text = typeof edge.node.text === 'string' && edge.node.text !== '' ? edge.node.text : null;
  return {
    id: edge.node.id ?? edge.cursor,
    at: Number.isNaN(parsed) ? 0 : parsed,
    cursor: edge.cursor,
    direction: messageDirection(edge.node.sender),
    text,
    kind: kind.label,
    system: kind.system,
    senderName: messageSenderName(edge.node.sender),
  };
}

export function toRecordMessages(edges: readonly MessageEdgeLike[] | null | undefined): RecordMessage[] {
  return (edges ?? []).map(toRecordMessage);
}

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

/**
 * Oldest first, deduplicated, incoming wins.
 *
 * `MessageList` takes its items oldest first and re-anchors on `threadKey`, so
 * the sort has to happen here rather than being trusted from the connection:
 * the edges arrive newest-first, and a history page merged in without a re-sort
 * would draw yesterday under today.
 */
export function mergeMessages(existing: readonly RecordMessage[], incoming: readonly RecordMessage[]): RecordMessage[] {
  const byId = new Map<string, RecordMessage>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : a.at - b.at));
}

/**
 * The cursor to page history with — the oldest message held.
 *
 * Computed from `sentTime` rather than taken from `pageInfo.startCursor`,
 * because the two disagree in practice and only one of them is checkable here:
 * the connection returns newest-first, so which end `startCursor` names depends
 * on how the server reads the spec. The oldest message this page is showing is
 * a fact, whichever way the cursors run.
 */
export function historyCursor(messages: readonly RecordMessage[]): string | null {
  let oldest: RecordMessage | null = null;
  for (const message of messages) {
    if (!oldest || message.at < oldest.at) oldest = message;
  }
  return oldest ? oldest.cursor : null;
}

/**
 * Did asking for history actually produce any?
 *
 * The guard exists because the operation pages with `before` while the sibling
 * inbox operation, in practice, pages the same connection into
 * history with `after`. If `before` turns out to walk towards the newest
 * message on this deployment, the answer is a page the tab already holds, and
 * without this the "Load older" button would sit there returning the same
 * messages forever. One empty answer retires the button and the tab says the
 * API returned nothing further.
 */
export function historyExhausted(before: readonly RecordMessage[], after: readonly RecordMessage[]): boolean {
  return after.length <= before.length;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** `HH:MM` under a bubble. An unreadable instant prints nothing rather than 1970. */
export function messageTimeLabel(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return '';
  return TIME_FORMAT.format(at);
}

/** The last few messages, newest last — what the Overview card shows. */
export function recentMessages(messages: readonly RecordMessage[], count: number): RecordMessage[] {
  return count <= 0 ? [] : messages.slice(Math.max(0, messages.length - count));
}
