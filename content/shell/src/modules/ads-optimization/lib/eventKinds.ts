import type { ConversionEvent } from '../types';

/**
 * The seven things that can fire a conversion. `typename` is what the API
 * returns, `inputKey` is the field of the one-of input a write goes through,
 * and the two are the only stable identity a kind has — the ids below are this
 * module's own shorthand for the URL and the dialog.
 */
export type TriggerId = 'keywords' | 'firstMessage' | 'property' | 'booking' | 'status' | 'handoff' | 'prompt';

export interface TriggerDef {
  id: TriggerId;
  typename: ConversionEvent['__typename'];
  inputKey:
    | 'onContactMessageKeyword'
    | 'onContactFirstMessage'
    | 'onContactAttribute'
    | 'onBooking'
    | 'onSalesStage'
    | 'onSwitchToHuman'
    | 'onCustomPrompt';
  /** Two or three words, the way it reads in a table cell. */
  label: string;
  /** What actually fires it, in one sentence. Shown on every trigger tile. */
  fires: string;
}

/* Ordered the way the picker reads: the two that need no setup last but one,
   the open-ended one last. */
export const TRIGGERS: readonly TriggerDef[] = [
  {
    id: 'keywords',
    typename: 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent',
    inputKey: 'onContactMessageKeyword',
    label: 'Keywords',
    fires: 'The contact sends a message that matches the words you list.',
  },
  {
    id: 'property',
    typename: 'FuelySettingSendEventsToMetaOnContactAttributeEvent',
    inputKey: 'onContactAttribute',
    label: 'Contact property',
    fires: 'A property on the contact card comes to match your condition.',
  },
  {
    id: 'status',
    typename: 'FuelySettingSendEventsToMetaOnSalesStageEvent',
    inputKey: 'onSalesStage',
    label: 'Contact status',
    fires: 'The contact reaches one of the statuses you pick.',
  },
  {
    id: 'handoff',
    typename: 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent',
    inputKey: 'onSwitchToHuman',
    label: 'Handed to a human',
    fires: 'The AI passes the chat to a teammate, or a teammate takes it.',
  },
  {
    id: 'booking',
    typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
    inputKey: 'onBooking',
    label: 'Booking',
    fires: 'A booking is made in the conversation.',
  },
  {
    id: 'firstMessage',
    typename: 'FuelySettingSendEventsToMetaOnContactFirstMessageEvent',
    inputKey: 'onContactFirstMessage',
    label: 'First message',
    fires: 'The contact sends the first message of the conversation.',
  },
  {
    id: 'prompt',
    typename: 'FuelySettingSendEventsToMetaOnCustomPromptEvent',
    inputKey: 'onCustomPrompt',
    label: 'A condition in words',
    fires: 'The AI decides the conversation has met a condition you describe.',
  },
];

const BY_TYPENAME = new Map(TRIGGERS.map((t) => [t.typename as string, t]));
const BY_ID = new Map(TRIGGERS.map((t) => [t.id, t]));

/**
 * Null for a kind added to the API after this build. Every caller renders the
 * event read-only in that case rather than guessing at its shape.
 */
export const triggerOf = (event: ConversionEvent): TriggerDef | null => BY_TYPENAME.get(event.__typename) ?? null;

export const triggerById = (id: TriggerId): TriggerDef | null => BY_ID.get(id) ?? null;
