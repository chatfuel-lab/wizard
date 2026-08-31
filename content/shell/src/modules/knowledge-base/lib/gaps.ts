/**
 * The questions the assistant could not answer, as pure functions.
 *
 * This is the honest local version of the "unresolved questions" report every
 * AI-support product ships. Chatfuel exposes no clustering, no embeddings, no
 * retrieval scores and no LLM this UI could call, so everything below is
 * LEXICAL: it compares the words a customer typed against the words another
 * customer typed, and against the words already in the FAQ. It is a word
 * overlap, it is described to the reader as a word overlap, and the numbers it
 * prints are counts of real conversations - never a confidence.
 *
 * What the API does give us:
 *   - `unhandledSwitchToHuman` on a contact: the automation gave up and no
 *     operator has opened the chat yet;
 *   - the sender KIND of every message (`ContactMessageSender` /
 *     `AutomationMessageSender` / `AdminMessageSender`);
 *   - the text of a message, when it IS text. The schema splits every channel
 *     into an inbound and an outbound type, so the slim fragment has to select
 *     `text` on both halves - it does, which is what makes the assistant's
 *     hand-off line quotable. What stays unreadable is a reply that was never
 *     text: a template, an image, a button set. The algorithm never depends on
 *     any of it (it keys off the sender kind); only the sample the reader
 *     expands does, and that says so in words instead of showing a blank.
 *
 * Every threshold in here is a named constant with the reason next to it.
 */
import type { FaqRow } from '../types';
import type { IgnoredGap } from './gapsStorage';

// ---------------------------------------------------------------------------
// Wire shapes, structurally
// ---------------------------------------------------------------------------

/**
 * What this file needs off a message. `GapMessage` satisfies it: the generated
 * union carries `text` on the five inbound text shapes and nothing on the
 * rest, which is exactly an optional property. Declared structurally so the
 * tests can build a thread out of object literals instead of out of a
 * 60-member union.
 */
export interface GapMessageLike {
  readonly id?: string | null;
  readonly sentTime: string;
  readonly sender: { readonly __typename: string };
  readonly text?: string;
}

/** What this file needs off a contact row. `GapContact` satisfies it. */
export interface GapContactLike {
  readonly unhandledSwitchToHuman: boolean;
  readonly assignee?: { readonly __typename: string } | null;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/**
 * Two questions are the same question when their content words overlap by a
 * Dice coefficient of at least this - "they share half of everything the two
 * of them say".
 *
 * 0.5 rather than a stricter number because the real pairs are short and
 * differ by one word each: {gift, card, sell} against {gift, card, buy,
 * online} scores 0.57 and must merge, while {parking, nearby} against
 * {delivery} scores 0 and must not. Dice rather than Jaccard because Jaccard
 * punishes exactly the case that matters here - a four-word question against a
 * three-word one - and the same pair scores 0.4 there, below any threshold
 * that still separates unrelated questions.
 */
export const CLUSTER_SIMILARITY = 0.5;

/**
 * A cluster counts as ALREADY ANSWERED at this similarity against an existing
 * FAQ question. Higher than the clustering bar on purpose: merging two
 * phrasings of one question costs nothing, but calling a genuine gap "already
 * answered" hides the work, so it takes a stronger match to earn.
 */
export const ANSWERED_SIMILARITY = 0.6;

/** Below this length a token is left alone by the plural fold - see `fold`. */
export const FOLD_MIN_LENGTH = 4;

/**
 * A customer message longer than this is truncated when it becomes a question.
 * It is what seeds the FAQ draft, and the draft travels in the URL; a
 * three-paragraph message is also not a question anybody is going to answer
 * verbatim.
 */
export const MAX_QUESTION_LENGTH = 300;

// ---------------------------------------------------------------------------
// Senders
// ---------------------------------------------------------------------------

export type GapSenderKind = 'contact' | 'assistant' | 'human' | 'other';

/**
 * `other` is the platform's own app senders (`WhatsappBusinessAppSender` and
 * friends). They are neither the customer nor a reply on behalf of the
 * business, so they are skipped rather than treated as either.
 */
export function senderKind(message: GapMessageLike): GapSenderKind {
  switch (message.sender.__typename) {
    case 'ContactMessageSender':
      return 'contact';
    case 'AutomationMessageSender':
      return 'assistant';
    case 'AdminMessageSender':
      return 'human';
    default:
      return 'other';
  }
}

/** The message's text when the fragment carries it - see the file header. */
export function messageText(message: GapMessageLike): string | null {
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  return text === '' ? null : text;
}

/**
 * Did this chat go to a human?
 *
 * `unhandledSwitchToHuman` is the direct signal but it goes FALSE the moment an
 * operator opens the chat, so it only ever sees hand-offs nobody has touched
 * yet. A human assignee catches a second slice - the ones an operator picked
 * up - and nothing catches a hand-off that was opened and then reassigned back
 * to the AI. The view says so out loud rather than implying the sweep is a
 * census.
 */
export function isFlagged(contact: GapContactLike): boolean {
  return contact.unhandledSwitchToHuman || contact.assignee?.__typename === 'PublicUserAccount';
}

// ---------------------------------------------------------------------------
// The question that preceded the hand-off
// ---------------------------------------------------------------------------

export interface HandoffQuestion {
  /** The customer's own words, truncated at MAX_QUESTION_LENGTH. */
  question: string;
  /** Epoch ms of that message. */
  askedAt: number;
  /** The assistant's reply, when this platform's fragment carries text. */
  handoff: string | null;
  /** Epoch ms of the reply that ended the customer's turn, when there was one. */
  handoffAt: number | null;
  /** A human operator has already written something after the question. */
  answeredByHuman: boolean;
}

const parseTime = (raw: string): number => {
  const at = Date.parse(raw);
  return Number.isFinite(at) ? at : 0;
};

/**
 * Walk a NEWEST-FIRST thread and pull out the question the assistant gave up
 * on.
 *
 * The customer's turn ends at the newest message from the business - the
 * assistant, or an operator who got there first. The question is the newest
 * customer message OLDER than that, which is the point: a customer who writes
 * "hello? anyone?" after the hand-off must not overwrite the question they
 * actually asked. A thread with no business reply at all ends nowhere, and
 * then the newest customer message is the question.
 *
 * The hand-off LINE is looked up separately, as the newest assistant message
 * after the question - not as "the message that ended the turn". Those are the
 * same message right up until an operator has already replied, and then the
 * newest business message is the human's answer while the assistant's "let me
 * find someone" sits one row below it. Showing the operator's reply under
 * "what the assistant said" would be a straight lie about who wrote it.
 *
 * Returns null when there is no customer text to read: an all-assistant thread,
 * a thread of images, a thread whose only customer messages are newer than the
 * hand-off.
 */
export function findHandoffQuestion(messages: readonly GapMessageLike[]): HandoffQuestion | null {
  const turnEnd = messages.findIndex((message) => {
    const kind = senderKind(message);
    return kind === 'assistant' || kind === 'human';
  });

  const questionAt = messages.findIndex(
    (message, index) => index > turnEnd && senderKind(message) === 'contact' && messageText(message) !== null,
  );
  if (questionAt === -1) return null;

  const question = messageText(messages[questionAt]!)!;
  const reply = messages.slice(0, questionAt).find((message) => senderKind(message) === 'assistant') ?? null;

  return {
    question: question.length > MAX_QUESTION_LENGTH ? `${question.slice(0, MAX_QUESTION_LENGTH).trimEnd()}…` : question,
    askedAt: parseTime(messages[questionAt]!.sentTime),
    handoff: reply ? messageText(reply) : null,
    handoffAt: reply ? parseTime(reply.sentTime) : null,
    /* Anything newer than the question written by an operator. The chat may
     * still be worth an FAQ - a person answered it BY HAND, which is the cost
     * this page exists to remove - but it is not waiting on anyone. */
    answeredByHuman: messages.slice(0, questionAt).some((message) => senderKind(message) === 'human'),
  };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/*
 * Function words, question words, greetings and politeness - the words that
 * appear in every question and therefore separate none of them. Content verbs
 * ("ship", "book", "cost") are deliberately NOT in here.
 */
const STOPWORD_LIST = `a about an and any are as at be been but by can could did do does doesnt dont for from get got had has have hello hey hi how i if im in is it its ive just me much my no not of ok okay on or our please so some thank thanks that the their them then there these they this to us was we were what whats when where which who why will with would you your yours u ur`;

const STOPWORDS = new Set(STOPWORD_LIST.split(' '));

/**
 * Lowercase, drop punctuation, collapse whitespace. `\p{L}\p{N}` rather than
 * `a-z0-9`: customers write in whatever alphabet they write in, and an ASCII
 * character class would eat every accented letter - "cafe?" is a question,
 * "caf " is not.
 */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Crude plural fold: drop one trailing "s".
 *
 * It is not a stemmer and does not try to be. What matters for clustering is
 * that the fold is DETERMINISTIC and applied to both sides of every
 * comparison - "canvas" folding to "canva" is linguistically wrong and
 * completely harmless, because the other side folds the same way. What it buys
 * is the case that breaks the whole feature without it: "gift cards" against
 * "gift card" scores 0.28 unfolded and 0.57 folded.
 *
 * Guards: under FOLD_MIN_LENGTH the fold does more harm than good ("is", "as"),
 * and "ss" is never a plural ("address").
 */
function fold(token: string): string {
  if (token.length < FOLD_MIN_LENGTH) return token;
  if (!token.endsWith('s') || token.endsWith('ss')) return token;
  return token.slice(0, -1);
}

/** Content words of one question: normalised, stopwords dropped, folded, deduped. */
export function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of normalizeText(text).split(' ')) {
    if (word === '' || STOPWORDS.has(word)) continue;
    const token = fold(word);
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/**
 * Sørensen-Dice over two token sets: 2·|A∩B| / (|A|+|B|).
 *
 * Two empty sets score 0, not 1. A question made entirely of stopwords ("hi?")
 * has nothing to compare, and scoring it a perfect match against every other
 * empty question would pile all of them into one meaningless cluster.
 */
export function dice(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const set = new Set(b);
  let shared = 0;
  for (const token of a) if (set.has(token)) shared += 1;
  return (2 * shared) / (a.length + b.length);
}

// ---------------------------------------------------------------------------
// Samples and clusters
// ---------------------------------------------------------------------------

/** One flagged conversation, reduced to the one question it is about. */
export interface GapSample {
  /** Contact id, which is also the conversation id (server-side alias). */
  contactId: string;
  contactName: string;
  /** Raw `Platform` value off the conversation - render it through `platformLabel`. */
  platform: string;
  question: string;
  handoff: string | null;
  askedAt: number;
  handoffAt: number | null;
  answeredByHuman: boolean;
}

export interface MatchedFaq {
  /** `FaqRow.key` - what `?item=` carries into the FAQ source. */
  key: string;
  question: string;
}

export interface GapCluster {
  /** Stable for the life of one scan; the list's React key. */
  id: string;
  /** The newest phrasing in the group - what a person reads, and what seeds the FAQ draft. */
  question: string;
  /** Content words of the representative. The ignore match and the tests read it. */
  tokens: string[];
  /** Newest first. */
  samples: GapSample[];
  count: number;
  /** Epoch ms of the newest member. */
  lastSeen: number;
  /** Platforms this question arrived on, deduped, newest-first order. */
  platforms: string[];
  /** True when every member was already picked up by a human. */
  allAnsweredByHuman: boolean;
  /** An existing FAQ that already covers this, when there is one. */
  faq: MatchedFaq | null;
}

/**
 * Group the samples.
 *
 * Greedy, single pass, newest first, matched against each cluster's
 * REPRESENTATIVE rather than against any member. Matching any member chains -
 * A merges with B, B merges with C, and A and C end up in one group without
 * ever having been compared - and a chained cluster has no honest
 * representative to show. The representative is therefore the newest phrasing,
 * which is also the one a person is most likely to recognise.
 */
export function clusterSamples(samples: readonly GapSample[]): GapCluster[] {
  const ordered = [...samples].sort((a, b) => b.askedAt - a.askedAt);
  const clusters: GapCluster[] = [];

  for (const sample of ordered) {
    const tokens = tokenize(sample.question);
    /* Nothing but stopwords - "hi", "?", "hello there". There is no question in
     * it to write an FAQ from, and it would otherwise collect every other
     * contentless message into one meaningless group. */
    if (tokens.length === 0) continue;

    const home = clusters.find((cluster) => dice(cluster.tokens, tokens) >= CLUSTER_SIMILARITY);
    if (home) {
      home.samples.push(sample);
      home.count += 1;
      home.lastSeen = Math.max(home.lastSeen, sample.askedAt);
      if (!home.platforms.includes(sample.platform)) home.platforms.push(sample.platform);
      home.allAnsweredByHuman = home.allAnsweredByHuman && sample.answeredByHuman;
      continue;
    }

    clusters.push({
      /* The first member's contact appears in exactly one cluster, so this is
       * unique without a counter and stable while the scan result is. */
      id: `gap-${sample.contactId}`,
      question: sample.question,
      tokens,
      samples: [sample],
      count: 1,
      lastSeen: sample.askedAt,
      platforms: [sample.platform],
      allAnsweredByHuman: sample.answeredByHuman,
      faq: null,
    });
  }

  return clusters;
}

/**
 * Mark the clusters an FAQ already covers.
 *
 * These are a different job from a gap: the answer exists and did not fire, so
 * the fix is to rewrite that FAQ in the words customers actually use, not to
 * write a new one beside it.
 */
export function matchFaqs(clusters: readonly GapCluster[], faqs: readonly FaqRow[]): GapCluster[] {
  const indexed = faqs.map((faq) => ({ faq, tokens: tokenize(faq.question) }));
  return clusters.map((cluster) => {
    let best: MatchedFaq | null = null;
    let bestScore = ANSWERED_SIMILARITY;
    for (const entry of indexed) {
      const score = dice(cluster.tokens, entry.tokens);
      if (score >= bestScore) {
        bestScore = score;
        best = { key: entry.faq.key, question: entry.faq.question };
      }
    }
    return { ...cluster, faq: best };
  });
}

/**
 * Worst first: how many people asked, then how recently.
 *
 * Count leads because the count is the only thing here that is a fact rather
 * than a heuristic - three people asked, that is three conversations. Recency
 * breaks the tie, so between two questions asked twice the live one wins.
 */
export function rankClusters(clusters: readonly GapCluster[]): GapCluster[] {
  return [...clusters].sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
}

/** Cluster, match against the FAQ, rank. The whole pipeline, in one call. */
export function buildClusters(samples: readonly GapSample[], faqs: readonly FaqRow[]): GapCluster[] {
  return rankClusters(matchFaqs(clusterSamples(samples), faqs));
}

// ---------------------------------------------------------------------------
// The ignore list
// ---------------------------------------------------------------------------

/**
 * Has this cluster been dismissed?
 *
 * Compared by SIMILARITY, not by identity: the representative is the newest
 * phrasing, so the next sweep can hand back the same question in somebody
 * else's words and an exact-match ignore list would let it straight back in.
 * The bar is the clustering bar - if the two would have been one cluster, they
 * are one question.
 */
export function isIgnored(cluster: GapCluster, ignored: readonly IgnoredGap[]): boolean {
  return ignored.some((entry) => dice(cluster.tokens, tokenize(entry.question)) >= CLUSTER_SIMILARITY);
}

// ---------------------------------------------------------------------------
// Presentation helpers (pure, so they are testable)
// ---------------------------------------------------------------------------

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  widget: 'Web widget',
  webwidget: 'Web widget',
};

/**
 * The `Platform` enum's values are lowercase on the wire, and TitleCase
 * wherever one has been written out by hand, so this folds case before it
 * looks - a label table matching only one of the two would read "Whatsapp"
 * half the time and "WhatsApp" the other half.
 */
export function platformLabel(platform: string): string {
  const key = platform.toLowerCase();
  return PLATFORM_LABELS[key] ?? (platform === '' ? 'Unknown' : platform[0]!.toUpperCase() + platform.slice(1));
}

/**
 * What to say under a sample about the reply, in one place because the four
 * cases are easy to get contradictory: a reply that was not a text message has
 * nothing to quote (see the file header), and "nobody replied" beside "a person
 * answered by hand" is a sentence this page printed until it was written down
 * as a table.
 */
export function replyNote(sample: Pick<GapSample, 'handoff' | 'handoffAt' | 'answeredByHuman'>): string {
  const handled = sample.answeredByHuman ? ' A person has since answered by hand.' : '';
  if (sample.handoff !== null) return `The assistant replied: ${sample.handoff}${handled}`;
  if (sample.handoffAt !== null)
    return `The assistant replied and passed the chat on. Its reply was not a text message, so there is nothing to quote.${handled}`;
  return sample.answeredByHuman
    ? 'A person answered this by hand; the assistant never replied.'
    : 'Nothing came back in the messages read here.';
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Coarse "last seen" wording. Buckets rather than `Intl.RelativeTimeFormat`
 * because the output of that depends on the host locale, which makes a test
 * assert whatever the machine running it happens to be set to.
 */
export function relativeTime(atMs: number, nowMs: number): string {
  const diff = nowMs - atMs;
  if (!Number.isFinite(diff)) return 'unknown';
  /* A timestamp in the future is clock skew between the server and this
   * browser, not a message from tomorrow. */
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} min ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(diff / DAY);
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
