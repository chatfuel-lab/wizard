import { filterItems } from '~ui';

/**
 * A small, hand-picked emoji set for the composer.
 *
 * Small on purpose. A full picker is 1 800 characters in fifteen groups with
 * skin-tone variants, and shipping one means shipping the data for it — a
 * megabyte of JSON that every operator downloads so that four of them can send
 * a mango. The characters here are the ones an inbox actually uses: greetings,
 * acknowledgements, apologies, and the handful of objects that come up in a
 * conversation about an order.
 *
 * Keywords are the second search text, so "ok" finds 👌 and "thanks" finds 🙏
 * without either word being the character's name. `filterItems` from `~ui`
 * already ranks the label above the keywords, which is why the two are passed
 * separately rather than concatenated.
 */

export interface EmojiEntry {
  char: string;
  name: string;
  keywords: readonly string[];
}

export interface EmojiGroup {
  name: string;
  emoji: readonly EmojiEntry[];
}

const e = (char: string, name: string, keywords = ''): EmojiEntry => ({
  char,
  name,
  keywords: keywords === '' ? [] : keywords.split(' '),
});

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    name: 'Smileys',
    emoji: [
      e('😀', 'grinning', 'smile happy'),
      e('😊', 'smiling', 'blush happy warm'),
      e('😁', 'beaming', 'grin happy'),
      e('😄', 'laughing', 'happy joy'),
      e('🙂', 'slight smile', 'polite'),
      e('😉', 'wink', 'joke'),
      e('😍', 'heart eyes', 'love adore'),
      e('🤗', 'hug', 'welcome warm'),
      e('🤔', 'thinking', 'hmm consider'),
      e('😅', 'sweat smile', 'awkward phew'),
      e('😌', 'relieved', 'calm'),
      e('😴', 'sleeping', 'away offline'),
      e('😐', 'neutral', 'meh'),
      e('😕', 'confused', 'unsure'),
      e('😞', 'disappointed', 'sad sorry'),
      e('😢', 'crying', 'sad tear'),
      e('😱', 'screaming', 'shock surprise'),
      e('😳', 'flushed', 'embarrassed oops'),
      e('🙃', 'upside down', 'irony'),
      e('😎', 'sunglasses', 'cool'),
    ],
  },
  {
    name: 'Gestures',
    emoji: [
      e('👍', 'thumbs up', 'yes ok agree good'),
      e('👎', 'thumbs down', 'no bad'),
      e('👌', 'ok hand', 'perfect fine'),
      e('🙏', 'folded hands', 'thanks please sorry'),
      e('👏', 'clapping', 'bravo well done'),
      e('🙌', 'raised hands', 'celebrate hooray'),
      e('👋', 'waving', 'hello hi bye'),
      e('🤝', 'handshake', 'deal agreed'),
      e('✌️', 'victory', 'peace'),
      e('🤞', 'crossed fingers', 'hope luck'),
      e('💪', 'flexed biceps', 'strong'),
      e('☝️', 'index up', 'one note'),
      e('👉', 'pointing right', 'here this'),
      e('✍️', 'writing', 'note sign'),
    ],
  },
  {
    name: 'Status',
    emoji: [
      e('✅', 'check mark', 'done yes complete'),
      e('❌', 'cross mark', 'no failed wrong'),
      e('⚠️', 'warning', 'careful attention'),
      e('❗', 'exclamation', 'important'),
      e('❓', 'question', 'ask'),
      e('⏳', 'hourglass', 'wait pending'),
      e('⏰', 'alarm clock', 'reminder time'),
      e('🔔', 'bell', 'notify reminder'),
      e('🔒', 'locked', 'secure private'),
      e('♻️', 'recycle', 'refund return'),
      e('🆕', 'new', 'fresh'),
      e('🔥', 'fire', 'hot popular'),
      e('⭐', 'star', 'favourite rating'),
      e('💯', 'hundred', 'perfect score'),
    ],
  },
  {
    name: 'Objects',
    emoji: [
      e('📦', 'package', 'parcel shipping order delivery'),
      e('🚚', 'delivery truck', 'shipping courier'),
      e('✈️', 'airplane', 'shipping international'),
      e('🧾', 'receipt', 'invoice bill'),
      e('💳', 'credit card', 'payment pay'),
      e('💰', 'money bag', 'price refund'),
      e('🏷️', 'label', 'price tag discount'),
      e('📷', 'camera', 'photo picture'),
      e('📎', 'paperclip', 'attachment file'),
      e('📄', 'page', 'document file'),
      e('📅', 'calendar', 'date booking appointment'),
      e('📍', 'pin', 'location address'),
      e('📞', 'telephone', 'call phone'),
      e('✉️', 'envelope', 'email mail'),
      e('🔗', 'link', 'url'),
      e('🎁', 'gift', 'present bonus'),
      e('🛒', 'shopping cart', 'basket order'),
      e('🏠', 'house', 'home address'),
    ],
  },
  {
    name: 'Hearts',
    emoji: [
      e('❤️', 'red heart', 'love'),
      e('🧡', 'orange heart', 'love'),
      e('💚', 'green heart', 'love'),
      e('💙', 'blue heart', 'love'),
      e('💜', 'purple heart', 'love'),
      e('🖤', 'black heart', 'love'),
      e('💔', 'broken heart', 'sad'),
      e('🎉', 'party popper', 'celebrate congrats'),
      e('🎊', 'confetti', 'celebrate'),
      e('🥳', 'partying face', 'celebrate congrats'),
    ],
  },
];

export const ALL_EMOJI: readonly EmojiEntry[] = EMOJI_GROUPS.flatMap((group) => group.emoji);

/**
 * The flat, ranked list for a query.
 *
 * An empty query answers with everything in catalogue order, which is what the
 * grouped view renders from — one code path for "browsing" and "searching"
 * rather than two lists that can disagree about which characters exist.
 */
export function searchEmoji(query: string): EmojiEntry[] {
  return filterItems(ALL_EMOJI, query, (entry) => [entry.name, ...entry.keywords]).map((result) => result.item);
}
