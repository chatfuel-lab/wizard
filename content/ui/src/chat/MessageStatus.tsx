import { IconCheck, IconChecks, IconClock, IconWarning } from '../icons';

/**
 * The five states an outgoing message passes through.
 *
 * Every platform names them differently and most report a subset — WhatsApp has
 * all five, a web widget effectively has 'sent' and 'failed' — so the union is
 * the superset and a module maps its own enum onto it. Anything it cannot know
 * is simply not passed.
 *
 * The union and the component below deliberately share one name. TypeScript
 * keeps types and values in separate declaration spaces, so `MessageStatus` is
 * the union in a type position and the component in a value position, and one
 * `export { MessageStatus }` in the barrel carries both. That is not a trick
 * for its own sake: this union moved here from MessageBubble.tsx, where it has
 * been the exported vocabulary from the start, and renaming it would have broken
 * every module already typing a variable with it to buy nothing.
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

const GLYPH: Record<MessageStatus, typeof IconCheck> = {
  sending: IconClock,
  sent: IconCheck,
  delivered: IconChecks,
  read: IconChecks,
  failed: IconWarning,
};

/*
 * Only two of the five carry colour, and both earn it: 'read' is the one state
 * a sender actively looks for, and 'failed' is the one that needs acting on.
 * The rest inherit, so a status sitting in a bubble footer stays as quiet as
 * the timestamp it sits beside.
 *
 * 'read' is text-accent rather than accent-soft —
 * accent-soft is a TINT, meant to be a background behind accent text. Used as a
 * foreground it renders near-white on the light theme and near-black on the
 * dark one, which is why nobody ever saw a read receipt.
 */
const TONE: Record<MessageStatus, string> = {
  sending: '',
  sent: '',
  delivered: '',
  read: 'text-accent',
  failed: 'text-danger',
};

const LABEL: Record<MessageStatus, string> = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed to send',
};

export interface MessageStatusProps {
  status: MessageStatus;
  /** Glyph size in px. Default 12 — the size a bubble footer wants. */
  size?: number;
  /** Also render the word. Off inside a bubble, on in a detail panel. */
  showLabel?: boolean;
  /** Localised wording. Keys left out keep the English default. */
  labels?: Partial<Record<MessageStatus, string>>;
  className?: string;
}

/**
 * The delivery glyph, as a labelled unit rather than a bare icon.
 *
 * A tick on its own is not information to anyone using a screen reader, and
 * two ticks versus two coloured ticks is not information to anyone who cannot
 * separate the hues — so the text is always in the accessibility tree even
 * when `showLabel` leaves it out of the visual one.
 */
export function MessageStatus({ status, size = 12, showLabel = false, labels, className = '' }: MessageStatusProps) {
  const Glyph = GLYPH[status];
  const label = labels?.[status] ?? LABEL[status];

  return (
    <span
      className={`inline-flex items-center gap-1 ${TONE[status]}${className ? ` ${className}` : ''}`}
      /* Not role="img": with a visible label this is a labelled group, and an
         img role would hide the text it sits next to. */
      title={showLabel ? undefined : label}
    >
      <Glyph size={size} />
      <span className={showLabel ? 'text-micro' : 'sr-only'}>{label}</span>
    </span>
  );
}
