/**
 * The corpus the gaps tests read: an FAQ, and a swept conversation set.
 *
 * The clustering and the sweep are two halves of one answer and they drift
 * silently — a reworded question still types, still reads, and quietly stops
 * producing a group — so the questions below are load-bearing. Three people ask
 * about a catering minimum in three different ways, two ask about a gift card
 * the shop does not sell, one asks something the FAQ already covers (the
 * "already answered" filter), and one is still being handled by the assistant
 * (so the flag filter has something to drop).
 */

/** Answers a real shop would have written, including the two flaws the FAQ lint is for. */
export const sampleFaqs = [
  {
    question: 'Do you ship beans?',
    answer: 'Yes, anywhere in Germany. Orders before 14:00 go out the same day and arrive in one to two working days.',
  },
  { question: 'How much is delivery?', answer: 'Free over 40 EUR, otherwise 4.90 EUR.' },
  { question: 'Where are you?', answer: 'Torstrasse 114 in Berlin Mitte, two minutes from Rosenthaler Platz.' },
  { question: 'Is there parking?', answer: 'Street parking only, and it is busy. The U8 stops right outside.' },
  { question: 'Do you have oat milk?', answer: 'Yes, and it is included in the price.' },
  {
    question: 'Can I book the space for an event?',
    answer: 'Yes, for up to 25 people outside opening hours. Share the date and we will come back with a quote.',
  },
  { question: 'Do you do wholesale?', answer: 'We do. A person will pick this up and send you the trade list.' },
  /* A duplicate with a different answer - what the FAQ lint is for. */
  { question: 'Do you ship beans?', answer: 'We only ship within Berlin.' },
  /* An answer nobody reads to the end. */
  {
    question: 'How should I store coffee?',
    answer:
      'Keep the bag closed, away from light, away from heat and away from the fridge. Coffee is porous and will take on whatever is around it, which is why the fridge is the worst place for it despite being the first place everybody puts it. Buy what you will drink in three weeks and grind it as you go, because ground coffee loses most of what you paid for within an hour. If you must keep it longer, freeze it once, in a sealed bag, in portions you will not open twice, and never put a frozen bag back in the freezer after opening it because the condensation ruins it. Room temperature, sealed, out of the sun, drunk soon: that is the whole of it.',
  },
];

interface SampleChat {
  id: string;
  name: string;
  platform: string;
  unhandled: boolean;
  human: boolean;
  minutesAgo: number;
  /** Newest first, the way the API returns a thread with no cursor. */
  thread: { from: 'contact' | 'automation' | 'admin'; text: string }[];
}

const CHATS: SampleChat[] = [
  {
    id: 'contact-1',
    name: 'Lena Brandt',
    platform: 'Whatsapp',
    unhandled: true,
    human: false,
    minutesAgo: 40,
    thread: [
      { from: 'automation', text: 'Let me get a person to help you with that.' },
      { from: 'contact', text: 'What is the minimum order for office catering?' },
      { from: 'automation', text: 'Hi! How can I help?' },
    ],
  },
  {
    id: 'contact-2',
    name: 'Ravi Menon',
    platform: 'Whatsapp',
    unhandled: true,
    human: false,
    minutesAgo: 180,
    thread: [
      { from: 'automation', text: 'I will pass this to a colleague.' },
      { from: 'contact', text: 'do you have a minimum for catering orders?' },
    ],
  },
  {
    id: 'contact-3',
    name: 'Sofia Rossi',
    platform: 'Instagram',
    unhandled: false,
    human: true,
    minutesAgo: 300,
    thread: [
      { from: 'admin', text: 'Hi Sofia, that is 20 boxes.' },
      { from: 'contact', text: 'Whats the catering minimum order please' },
    ],
  },
  {
    id: 'contact-4',
    name: 'Jonas Weiss',
    platform: 'Whatsapp',
    unhandled: true,
    human: false,
    minutesAgo: 1_200,
    thread: [
      { from: 'automation', text: 'A colleague will come back to you.' },
      { from: 'contact', text: 'Do you sell gift cards?' },
    ],
  },
  {
    id: 'contact-5',
    name: 'Amelie Fischer',
    platform: 'Webwidget',
    unhandled: true,
    human: false,
    minutesAgo: 1_500,
    thread: [
      { from: 'automation', text: 'Let me hand you over.' },
      { from: 'contact', text: 'can i buy a gift card online' },
    ],
  },
  {
    id: 'contact-6',
    name: 'Peter Klein',
    platform: 'Whatsapp',
    unhandled: true,
    human: false,
    minutesAgo: 2_000,
    thread: [
      { from: 'automation', text: 'One moment, I will find someone.' },
      /* Already in the FAQ - the view can offer to improve the answer instead. */
      { from: 'contact', text: 'is there parking nearby?' },
    ],
  },
  {
    id: 'contact-7',
    name: 'Nora Adler',
    platform: 'Whatsapp',
    unhandled: false,
    human: false,
    minutesAgo: 30,
    thread: [
      { from: 'automation', text: 'Free over 40 EUR, otherwise 4.90 EUR.' },
      { from: 'contact', text: 'how much is delivery?' },
    ],
  },
];

/** A fixed clock: `Date.now()` here would make the assertions drift day to day. */
const NOW = Date.parse('2026-08-18T10:00:00.000Z');
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

const SENDER = {
  contact: 'ContactMessageSender',
  automation: 'AutomationMessageSender',
  admin: 'AdminMessageSender',
} as const;

/**
 * Inbound and outbound are DIFFERENT types on every channel but the web widget,
 * whose one text type carries both directions. The samples have to honour that:
 * typing an assistant reply as `*InTextMessage` had the sweep quote a hand-off
 * line that production could not have shown until the outbound shapes were
 * added to the fragment.
 */
const MESSAGE_TYPE: Record<string, { in: string; out: string }> = {
  Whatsapp: { in: 'WhatsAppInTextMessage', out: 'WhatsAppOutTextMessage' },
  Instagram: { in: 'InstagramInTextMessage', out: 'InstagramOutTextMessage' },
  Facebook: { in: 'FacebookInTextMessage', out: 'FacebookOutTextMessage' },
  Tiktok: { in: 'TikTokInTextMessage', out: 'TikTokOutTextMessage' },
  Webwidget: { in: 'WebWidgetTextMessage', out: 'WebWidgetTextMessage' },
};

/** The contacts a sweep reads, in the shape the chat connection answers with. */
export const sampleGapContacts = () =>
  CHATS.map((chat) => ({
    __typename: 'WhatsappContact',
    id: chat.id,
    name: chat.name,
    updatedAt: at(chat.minutesAgo),
    lastConversationMessageTime: at(chat.minutesAgo),
    unhandledSwitchToHuman: chat.unhandled,
    assignee: chat.human ? { __typename: 'PublicUserAccount' } : { __typename: 'FuelyAIAssignee' },
    conversation: {
      __typename: 'Conversation',
      id: chat.id,
      platform: chat.platform,
      status: 'Open',
      updatedAt: at(chat.minutesAgo),
    },
  }));

/** One contact's thread, newest first, typed per platform and direction. */
export const sampleGapThread = (conversationId: string) => {
  const chat = CHATS.find((entry) => entry.id === conversationId);
  if (!chat) return [];
  return chat.thread.map((message, index) => ({
    __typename: (MESSAGE_TYPE[chat.platform] ?? MESSAGE_TYPE.Whatsapp!)[message.from === 'contact' ? 'in' : 'out'],
    id: `${chat.id}-m${index}`,
    sentTime: at(chat.minutesAgo + index),
    sender: { __typename: SENDER[message.from] },
    text: message.text,
  }));
};
