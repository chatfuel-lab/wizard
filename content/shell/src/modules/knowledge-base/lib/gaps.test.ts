import { describe, expect, it } from 'vitest';
import type { FaqRow } from '../types';
import {
  ANSWERED_SIMILARITY,
  CLUSTER_SIMILARITY,
  MAX_QUESTION_LENGTH,
  buildClusters,
  clusterSamples,
  dice,
  findHandoffQuestion,
  isFlagged,
  isIgnored,
  matchFaqs,
  messageText,
  normalizeText,
  platformLabel,
  rankClusters,
  relativeTime,
  replyNote,
  senderKind,
  tokenize,
  type GapMessageLike,
  type GapSample,
} from './gaps';
import { sampleFaqs, sampleGapContacts, sampleGapThread } from './samples';

// ---------------------------------------------------------------------------
// Builders. A thread is written NEWEST FIRST, the way the API returns one.
// ---------------------------------------------------------------------------

const SENDERS = {
  contact: 'ContactMessageSender',
  ai: 'AutomationMessageSender',
  human: 'AdminMessageSender',
  app: 'WhatsappBusinessAppSender',
} as const;

const T0 = Date.parse('2026-08-18T10:00:00.000Z');

/** Index 0 is the newest message, so each later entry is a minute older. */
const thread = (entries: { from: keyof typeof SENDERS; text?: string }[]): GapMessageLike[] =>
  entries.map((entry, index) => ({
    id: `m${index}`,
    sentTime: new Date(T0 - index * 60_000).toISOString(),
    sender: { __typename: SENDERS[entry.from] },
    ...(entry.text === undefined ? {} : { text: entry.text }),
  }));

let sampleSeq = 0;
const sample = (question: string, minutesAgo: number, extra: Partial<GapSample> = {}): GapSample => ({
  contactId: `c${++sampleSeq}`,
  contactName: 'Someone',
  platform: 'whatsapp',
  question,
  handoff: 'Let me get a person to help you with that.',
  askedAt: T0 - minutesAgo * 60_000,
  handoffAt: T0 - minutesAgo * 60_000 + 1_000,
  answeredByHuman: false,
  ...extra,
});

const faq = (key: string, question: string): FaqRow => ({ key, question, answer: 'an answer' });

// ---------------------------------------------------------------------------

describe('senders', () => {
  it('names the three senders that matter and lumps the rest together', () => {
    expect(senderKind({ sentTime: '', sender: { __typename: SENDERS.contact } })).toBe('contact');
    expect(senderKind({ sentTime: '', sender: { __typename: SENDERS.ai } })).toBe('assistant');
    expect(senderKind({ sentTime: '', sender: { __typename: SENDERS.human } })).toBe('human');
    expect(senderKind({ sentTime: '', sender: { __typename: SENDERS.app } })).toBe('other');
  });

  it('reads text only where the fragment carries it', () => {
    expect(messageText({ sentTime: '', sender: { __typename: SENDERS.contact }, text: ' hello ' })).toBe('hello');
    /* An outbound WhatsApp message: the slim fragment selects no text on it. */
    expect(messageText({ sentTime: '', sender: { __typename: SENDERS.ai } })).toBeNull();
    expect(messageText({ sentTime: '', sender: { __typename: SENDERS.contact }, text: '   ' })).toBeNull();
  });
});

describe('which chats went wrong', () => {
  it('flags an unhandled hand-off', () => {
    expect(isFlagged({ unhandledSwitchToHuman: true, assignee: { __typename: 'FuelyAIAssignee' } })).toBe(true);
  });

  it('flags a chat a human now owns, which is how a handled hand-off is still visible', () => {
    expect(isFlagged({ unhandledSwitchToHuman: false, assignee: { __typename: 'PublicUserAccount' } })).toBe(true);
  });

  it('leaves a chat the AI is still handling alone', () => {
    expect(isFlagged({ unhandledSwitchToHuman: false, assignee: { __typename: 'FuelyAIAssignee' } })).toBe(false);
    expect(isFlagged({ unhandledSwitchToHuman: false, assignee: null })).toBe(false);
    expect(isFlagged({ unhandledSwitchToHuman: false })).toBe(false);
  });
});

describe('the question that preceded the hand-off', () => {
  it('takes the customer message before the assistant gave up', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'ai', text: 'Let me get a person to help you with that.' },
        { from: 'contact', text: 'What is the minimum order for office catering?' },
        { from: 'ai', text: 'Hi! How can I help?' },
      ]),
    );
    expect(found?.question).toBe('What is the minimum order for office catering?');
    expect(found?.handoff).toBe('Let me get a person to help you with that.');
    expect(found?.answeredByHuman).toBe(false);
  });

  it('ignores a follow-up written after the hand-off', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'contact', text: 'hello? anyone there?' },
        { from: 'ai', text: 'I will pass this to a colleague.' },
        { from: 'contact', text: 'Do you deliver to Potsdam?' },
      ]),
    );
    expect(found?.question).toBe('Do you deliver to Potsdam?');
  });

  it('reads a thread with no assistant reply at all - the newest question is the question', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'contact', text: 'Do you deliver to Potsdam?' },
        { from: 'contact', text: 'hi' },
      ]),
    );
    expect(found?.question).toBe('Do you deliver to Potsdam?');
    expect(found?.handoff).toBeNull();
    expect(found?.handoffAt).toBeNull();
  });

  it('returns nothing for a thread that is all assistant', () => {
    expect(
      findHandoffQuestion(
        thread([
          { from: 'ai', text: 'Anything else?' },
          { from: 'ai', text: 'Here is the menu.' },
        ]),
      ),
    ).toBeNull();
  });

  it('returns nothing when the customer sent no readable text', () => {
    /* An image: it is in the thread and has a sender, and the fragment
       carries no text for it. */
    expect(
      findHandoffQuestion(thread([{ from: 'ai', text: 'Let me hand you over.' }, { from: 'contact' }])),
    ).toBeNull();
  });

  it('returns nothing when every customer message is newer than the hand-off', () => {
    expect(
      findHandoffQuestion(
        thread([
          { from: 'contact', text: 'still waiting' },
          { from: 'ai', text: 'One moment.' },
        ]),
      ),
    ).toBeNull();
  });

  it('still finds the question when a human answered first, and says a human did', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'human', text: 'Hi Sofia, that is 20 boxes.' },
        { from: 'contact', text: 'Whats the catering minimum order please' },
      ]),
    );
    expect(found?.question).toBe('Whats the catering minimum order please');
    expect(found?.answeredByHuman).toBe(true);
    /* An operator's reply is the ANSWER, not a hand-off line. */
    expect(found?.handoff).toBeNull();
  });

  it('marks answeredByHuman when the operator wrote after the assistant handed over', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'human', text: 'Twenty boxes, and we need three days.' },
        { from: 'ai', text: 'A colleague will come back to you.' },
        { from: 'contact', text: 'catering minimum?' },
      ]),
    );
    expect(found?.answeredByHuman).toBe(true);
    expect(found?.handoff).toBe('A colleague will come back to you.');
  });

  it('finds the question on a real WhatsApp thread, where the assistant line has no text', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'ai' }, // WhatsAppOutTextMessage: no `text` in the fragment
        { from: 'contact', text: 'Do you sell gift cards?' },
      ]),
    );
    expect(found?.question).toBe('Do you sell gift cards?');
    expect(found?.handoff).toBeNull();
    expect(found?.handoffAt).not.toBeNull();
  });

  it('skips a platform app sender rather than treating it as a reply', () => {
    const found = findHandoffQuestion(
      thread([
        { from: 'app', text: 'delivered' },
        { from: 'contact', text: 'Do you sell gift cards?' },
      ]),
    );
    expect(found?.question).toBe('Do you sell gift cards?');
  });

  it('truncates a customer message nobody would paste into an FAQ', () => {
    const long = `Hello ${'x'.repeat(MAX_QUESTION_LENGTH * 2)}`;
    const found = findHandoffQuestion(
      thread([
        { from: 'ai', text: 'One moment.' },
        { from: 'contact', text: long },
      ]),
    );
    expect(found!.question.length).toBe(MAX_QUESTION_LENGTH + 1); // the ellipsis
    expect(found!.question.endsWith('…')).toBe(true);
  });

  it('survives a timestamp it cannot parse', () => {
    const found = findHandoffQuestion([
      { sentTime: 'not a date', sender: { __typename: SENDERS.ai }, text: 'One moment.' },
      { sentTime: 'not a date either', sender: { __typename: SENDERS.contact }, text: 'catering minimum?' },
    ]);
    expect(found?.askedAt).toBe(0);
  });
});

describe('normalisation', () => {
  it('lowercases, drops punctuation and collapses whitespace', () => {
    expect(normalizeText('  What IS the  minimum order?! ')).toBe('what is the minimum order');
  });

  it('keeps letters an ASCII-only class would eat', () => {
    expect(normalizeText('Is the café open?')).toBe('is the café open');
  });

  it('drops function words', () => {
    expect(tokenize('What is the minimum order for office catering?')).toEqual([
      'minimum',
      'order',
      'office',
      'catering',
    ]);
    expect(tokenize('How much do you charge for delivery?')).toEqual(['charge', 'delivery']);
  });

  it('folds the trailing plural s, and only where that is safe', () => {
    expect(tokenize('gift cards')).toEqual(['gift', 'card']);
    expect(tokenize('gift card')).toEqual(['gift', 'card']);
    /* "ss" is never a plural, and a short token loses its identity. */
    expect(tokenize('address bus')).toEqual(['address', 'bus']);
  });

  it('deduplicates, so a repeated word cannot inflate the overlap', () => {
    expect(tokenize('catering catering caterings')).toEqual(['catering']);
  });

  it('has nothing left of a message that is only pleasantries', () => {
    expect(tokenize('Hi there!')).toEqual([]);
    expect(tokenize('Hello, thanks so much please')).toEqual([]);
  });
});

describe('similarity', () => {
  it('scores identical sets 1 and disjoint sets 0', () => {
    expect(dice(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(dice(['a'], ['b'])).toBe(0);
  });

  it('scores two empty questions 0, not a perfect match', () => {
    expect(dice([], [])).toBe(0);
    expect(dice(['a'], [])).toBe(0);
  });

  it('clears the bar for the pair the threshold was chosen for', () => {
    /* "Do you sell gift cards?" against "can i buy a gift card online" - the
       pair that fails at Jaccard 0.4 and passes at Dice 0.57. */
    const a = tokenize('Do you sell gift cards?');
    const b = tokenize('can i buy a gift card online');
    expect(dice(a, b)).toBeCloseTo(4 / 7, 5);
    expect(dice(a, b)).toBeGreaterThanOrEqual(CLUSTER_SIMILARITY);
  });

  it('stays well under the bar for two unrelated questions', () => {
    expect(dice(tokenize('is there parking nearby?'), tokenize('how much is delivery?'))).toBe(0);
  });
});

describe('clustering', () => {
  const catering = [
    sample('What is the minimum order for office catering?', 40),
    sample('do you have a minimum for catering orders?', 180),
    sample('Whats the catering minimum order please', 300, { platform: 'instagram', answeredByHuman: true }),
  ];
  const gifts = [
    sample('Do you sell gift cards?', 1_200),
    sample('can i buy a gift card online', 1_500, { platform: 'widget' }),
  ];
  const parking = [sample('is there parking nearby?', 2_000)];

  it('puts three phrasings of one question in one group', () => {
    const [group, ...rest] = clusterSamples(catering);
    expect(rest).toHaveLength(0);
    expect(group!.count).toBe(3);
    expect(group!.samples).toHaveLength(3);
  });

  it('represents the group with the newest phrasing', () => {
    const [group] = clusterSamples(catering);
    expect(group!.question).toBe('What is the minimum order for office catering?');
    expect(group!.lastSeen).toBe(catering[0]!.askedAt);
  });

  it('keeps unrelated questions apart', () => {
    const clusters = clusterSamples([...catering, ...gifts, ...parking]);
    expect(clusters.map((cluster) => cluster.count)).toEqual([3, 2, 1]);
  });

  it('collects the platforms a question arrived on, once each', () => {
    const clusters = clusterSamples([...catering, ...gifts]);
    expect(clusters[0]!.platforms).toEqual(['whatsapp', 'instagram']);
    expect(clusters[1]!.platforms).toEqual(['whatsapp', 'widget']);
  });

  it('drops a message with no content words instead of pooling them all together', () => {
    const clusters = clusterSamples([sample('Hi there', 5), sample('hello!', 6), sample('hey!', 7)]);
    expect(clusters).toHaveLength(0);
  });

  it('says a group is handled only when every member is', () => {
    const clusters = clusterSamples(catering);
    expect(clusters[0]!.allAnsweredByHuman).toBe(false);
    const handled = clusterSamples([sample('catering minimum?', 10, { answeredByHuman: true })]);
    expect(handled[0]!.allAnsweredByHuman).toBe(true);
  });

  it('does not chain: A joins B and C joins B, but a C that misses B starts its own group', () => {
    /* Matched against the representative, never against a member. */
    const clusters = clusterSamples([
      sample('delivery cost to Berlin', 10),
      sample('delivery cost', 20),
      sample('cost of a wedding cake', 30),
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]!.count).toBe(2);
  });

  it('does not depend on the order the sweep happened to return', () => {
    const forwards = clusterSamples([...catering, ...gifts, ...parking]).map((c) => c.count);
    const backwards = clusterSamples([...parking, ...gifts, ...catering].reverse()).map((c) => c.count);
    expect(backwards).toEqual(forwards);
  });
});

describe('already answered', () => {
  const faqs = [
    faq('faq-1', 'Is there parking?'),
    faq('faq-2', 'How much is delivery?'),
    faq('faq-3', 'Do you ship beans?'),
  ];

  it('marks a question the FAQ already covers, with the entry to open', () => {
    const [cluster] = matchFaqs(clusterSamples([sample('is there parking nearby?', 10)]), faqs);
    expect(cluster!.faq).toEqual({ key: 'faq-1', question: 'Is there parking?' });
  });

  it('leaves a genuine gap unmarked', () => {
    const [cluster] = matchFaqs(clusterSamples([sample('What is the minimum order for office catering?', 10)]), faqs);
    expect(cluster!.faq).toBeNull();
  });

  it('needs a stronger match than clustering does, so a gap is not hidden by a near miss', () => {
    /* "Is there a parking garage nearby?" does not answer "with wheelchair
       access", and the two score 0.57 - close enough to be one QUESTION,
       nowhere near close enough to call the answer written. */
    const question = 'is there parking nearby with wheelchair access';
    const score = dice(tokenize(question), tokenize('Is there a parking garage nearby?'));
    expect(score).toBeCloseTo(4 / 7, 5);
    expect(score).toBeGreaterThanOrEqual(CLUSTER_SIMILARITY);
    expect(score).toBeLessThan(ANSWERED_SIMILARITY);
    const [cluster] = matchFaqs(clusterSamples([sample(question, 10)]), [
      faq('faq-p', 'Is there a parking garage nearby?'),
    ]);
    expect(cluster!.faq).toBeNull();
  });

  it('picks the closest FAQ when more than one is close', () => {
    const [cluster] = matchFaqs(clusterSamples([sample('how much is delivery', 10)]), [
      faq('faq-a', 'How much is delivery to Berlin?'),
      faq('faq-b', 'How much is delivery?'),
    ]);
    expect(cluster!.faq?.key).toBe('faq-b');
  });

  it('marks nothing when there are no FAQs at all', () => {
    const [cluster] = matchFaqs(clusterSamples([sample('is there parking nearby?', 10)]), []);
    expect(cluster!.faq).toBeNull();
  });
});

describe('ranking', () => {
  it('sorts by how many people asked, then by how recently', () => {
    const ranked = rankClusters(
      clusterSamples([
        sample('gift card?', 5),
        sample('gift cards?', 6),
        sample('catering minimum?', 1),
        sample('parking?', 400),
      ]),
    );
    expect(ranked.map((cluster) => cluster.count)).toEqual([2, 1, 1]);
    expect(ranked[1]!.question).toBe('catering minimum?');
    expect(ranked[2]!.question).toBe('parking?');
  });

  it('runs the whole pipeline in one call', () => {
    const clusters = buildClusters(
      [
        sample('Do you sell gift cards?', 100),
        sample('can i buy a gift card online', 200),
        sample('is there parking nearby?', 300),
      ],
      [faq('faq-1', 'Is there parking?')],
    );
    expect(clusters.map((cluster) => cluster.count)).toEqual([2, 1]);
    expect(clusters[0]!.faq).toBeNull();
    expect(clusters[1]!.faq?.key).toBe('faq-1');
  });
});

describe('the ignore list', () => {
  const [cluster] = clusterSamples([sample('Do you sell gift cards?', 10)]);

  it('matches a question that was dismissed in other words', () => {
    expect(isIgnored(cluster!, [{ question: 'can i buy a gift card online', ignoredAt: T0 }])).toBe(true);
  });

  it('does not match an unrelated dismissal', () => {
    expect(isIgnored(cluster!, [{ question: 'is there parking nearby?', ignoredAt: T0 }])).toBe(false);
  });

  it('is false against an empty list', () => {
    expect(isIgnored(cluster!, [])).toBe(false);
  });
});

describe('presentation', () => {
  it('labels a platform whichever case it arrives in', () => {
    expect(platformLabel('whatsapp')).toBe('WhatsApp');
    expect(platformLabel('Whatsapp')).toBe('WhatsApp');
    expect(platformLabel('Webwidget')).toBe('Web widget');
    expect(platformLabel('widget')).toBe('Web widget');
  });

  it('falls back to the raw value rather than inventing a channel', () => {
    expect(platformLabel('telegram')).toBe('Telegram');
    expect(platformLabel('')).toBe('Unknown');
  });

  it('buckets last-seen without asking the host locale', () => {
    expect(relativeTime(T0, T0)).toBe('just now');
    expect(relativeTime(T0 - 5 * 60_000, T0)).toBe('5 min ago');
    expect(relativeTime(T0 - 60 * 60_000, T0)).toBe('1 hour ago');
    expect(relativeTime(T0 - 5 * 3_600_000, T0)).toBe('5 hours ago');
    expect(relativeTime(T0 - 26 * 3_600_000, T0)).toBe('yesterday');
    expect(relativeTime(T0 - 5 * 86_400_000, T0)).toBe('5 days ago');
    expect(relativeTime(T0 - 70 * 86_400_000, T0)).toBe('2 months ago');
  });

  it('reads a future timestamp as clock skew, not as tomorrow', () => {
    expect(relativeTime(T0 + 60_000, T0)).toBe('just now');
  });

  it('describes the reply without contradicting itself in any of the four cases', () => {
    expect(replyNote({ handoff: 'One moment.', handoffAt: T0, answeredByHuman: false })).toBe(
      'The assistant replied: One moment.',
    );
    expect(replyNote({ handoff: 'One moment.', handoffAt: T0, answeredByHuman: true })).toBe(
      'The assistant replied: One moment. A person has since answered by hand.',
    );
    /* WhatsApp and friends: the assistant answered and the fragment has no text for it. */
    expect(replyNote({ handoff: null, handoffAt: T0, answeredByHuman: false })).toBe(
      'The assistant replied and passed the chat on. Its reply was not a text message, so there is nothing to quote.',
    );
    /* An operator got there before the assistant said anything - "nobody
       replied" beside "a person answered" is the sentence this exists to stop. */
    expect(replyNote({ handoff: null, handoffAt: null, answeredByHuman: true })).toBe(
      'A person answered this by hand; the assistant never replied.',
    );
    expect(replyNote({ handoff: null, handoffAt: null, answeredByHuman: false })).toBe(
      'Nothing came back in the messages read here.',
    );
  });
});

// ---------------------------------------------------------------------------
// The sweep, end to end
// ---------------------------------------------------------------------------

/**
 * The samples and the clustering are two halves of one answer and they drift
 * silently: a reworded question still types, still reads, and quietly stops
 * producing a group. This runs the written-out sweep through the real pipeline
 * and asserts what the page makes of it.
 */
describe('the offline sweep', () => {
  const sweep = (): GapSample[] => {
    const out: GapSample[] = [];
    for (const node of sampleGapContacts()) {
      if (!isFlagged(node)) continue;
      const found = findHandoffQuestion(sampleGapThread(node.conversation.id) as GapMessageLike[]);
      if (!found) continue;
      out.push({
        contactId: node.id,
        contactName: node.name,
        platform: node.conversation.platform,
        question: found.question,
        handoff: found.handoff,
        askedAt: found.askedAt,
        handoffAt: found.handoffAt,
        answeredByHuman: found.answeredByHuman,
      });
    }
    return out;
  };

  const demoFaqs = (): FaqRow[] => sampleFaqs.map((entry, index) => ({ ...entry, key: `faq-${index}` }));

  it('leaves the chats the assistant is still handling out of the sweep', () => {
    const questions = sweep().map((entry) => entry.question);
    expect(questions).not.toContain('how much is delivery?');
    expect(questions).toHaveLength(6);
  });

  it('produces the three groups the demo was shaped around', () => {
    const clusters = buildClusters(sweep(), demoFaqs());
    expect(clusters.map((cluster) => cluster.count)).toEqual([3, 2, 1]);
    expect(clusters[0]!.question).toBe('What is the minimum order for office catering?');
    expect(clusters[1]!.question).toBe('Do you sell gift cards?');
  });

  it('marks the one already covered by the FAQ and neither of the real gaps', () => {
    const clusters = buildClusters(sweep(), demoFaqs());
    expect(clusters[0]!.faq).toBeNull();
    expect(clusters[1]!.faq).toBeNull();
    expect(clusters[2]!.faq?.question).toBe('Is there parking?');
  });

  it('carries both platforms and the human reply through to the catering group', () => {
    const [catering] = buildClusters(sweep(), demoFaqs());
    expect(catering!.platforms).toEqual(['Whatsapp', 'Instagram']);
    expect(catering!.samples.some((entry) => entry.answeredByHuman)).toBe(true);
    expect(catering!.allAnsweredByHuman).toBe(false);
  });
});
