import type { SalesStageV2 } from '~api/generated/livechat/graphql';
import type { ContactDetail } from './contactPanel';

/**
 * The contact panel as a pure reducer.
 *
 * Two things make this more than a `useState` around a query response.
 *
 * **`OpenContactUpdated` carries a different, smaller contact.** The
 * subscription selects `ChatListContact` — the shape the left-hand list needs —
 * and that fragment has no `note`, no `attributes`, no `scope` and no
 * `username`. Every one of those is on the panel. So an event is applied for
 * what it does carry AND treated as a signal that the rest may have moved: it
 * sets `stale`, and the hook answers a stale panel with a refetch. Merging the
 * event and stopping there is the version that looks right and quietly shows a
 * note somebody else deleted ten minutes ago.
 *
 * **Nothing is optimistic.** `contactAttributeUpdate` does not error on a name
 * the server will not store; it answers with a contact that simply does not
 * have it. Both attribute mutations return the WHOLE contact, so the panel
 * re-renders from the response — and `confirmAttributeWrite` is what turns that
 * response into a yes or a no. The assignee and note mutations return only
 * their own field, which is why they have their own actions rather than going
 * through `written`.
 *
 * Like `threadStore`, this never reads the clock, and no reply is applied
 * without proof that it still belongs where it is landing. The proof differs by
 * kind, and the difference is not cosmetic. A READ (`loaded`, `failed`) carries
 * the epoch, because a newer read supersedes it — that is what `refetch` and
 * `opened` bump the epoch for. A WRITE's reply carries the CONTACT, because
 * nothing supersedes it: it is the server's answer about a field this person
 * just changed, and dropping it on an unrelated refetch would leave the panel
 * showing the old note over a note the server has. What a write must never do
 * is land on somebody else — open Maria, save a note, click Tom before it
 * answers, and Maria's note used to be written straight onto Tom's panel.
 */

/**
 * The fields an `OpenContactUpdated` event and the panel's own contact agree
 * on. Named explicitly rather than spread: the event's `conversation` carries a
 * `lastMessage` the panel's does not, and a wholesale merge would put a shape
 * into state that no consumer's type describes.
 */
export interface ContactUpdate {
  id: string;
  name: string;
  profilePictureUrl?: string | null;
  updatedAt: string;
  unreadMessagesCount: number;
  unhandledSwitchToHuman: boolean;
  lastConversationMessageTime?: string | null;
  salesStageV2?: SalesStageV2 | null;
  assignee: ContactDetail['assignee'];
}

export interface ContactState {
  contactId: string | null;
  contact: ContactDetail | null;
  loading: boolean;
  error: string | null;
  epoch: number;
  /** A live event landed; fields it cannot carry need re-reading. */
  stale: boolean;
  /**
   * Attribute name → why the last write to it did not land.
   *
   * Attributes have this and the note does not, and the asymmetry is the point:
   * `contactSetNote` either succeeds or throws, so a rejected promise is the
   * whole story and `~ui`'s `Field` already renders one. An attribute write
   * resolves whether or not it was stored, so "it worked" is a separate
   * question from "the request succeeded" and needs somewhere of its own to
   * live.
   */
  writeProblems: Record<string, string>;
}

export type ContactAction =
  | { type: 'opened'; contactId: string | null }
  | { type: 'refetch' }
  | { type: 'loaded'; epoch: number; contact: ContactDetail | null }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'live'; update: ContactUpdate }
  /** An attribute mutation answered with the whole contact — its own id included. */
  | { type: 'written'; contact: ContactDetail }
  /* The narrow replies name the contact they were issued for; the panel may
     have moved on while they were in flight. */
  | { type: 'assigneeChanged'; contactId: string; assignee: ContactDetail['assignee']; updatedAt: string }
  | { type: 'noteChanged'; contactId: string; note: string | null; updatedAt: string }
  | { type: 'attributeProblem'; contactId: string; name: string; message: string | null };

export function initialContactState(contactId: string | null): ContactState {
  return {
    contactId,
    contact: null,
    loading: contactId !== null,
    error: null,
    epoch: 0,
    stale: false,
    writeProblems: {},
  };
}

/**
 * Is this update newer than what is held?
 *
 * `updatedAt` and nothing else. A refetch fired by one event can answer after
 * the next event has already been applied, and arrival order says nothing about
 * age — the same reason `threadStore` decides message freshness this way.
 */
const isNewer = (contact: ContactDetail | null, updatedAt: string): boolean =>
  contact === null || updatedAt >= contact.updatedAt;

export function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case 'opened':
      if (action.contactId === state.contactId) return state;
      return { ...initialContactState(action.contactId), epoch: state.epoch + 1 };

    /* The contact on screen stays. A refetch is a re-read, not a reset: the
       panel does not blank out and then repaint every time somebody else
       renames the contact. */
    case 'refetch':
      return {
        ...state,
        epoch: state.epoch + 1,
        loading: state.contactId !== null && state.contact === null,
        stale: false,
        error: null,
      };

    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      return { ...state, contact: action.contact, loading: false, stale: false, error: null };
    }

    case 'failed':
      return action.epoch === state.epoch ? { ...state, loading: false, error: action.message } : state;

    /* Applied for what it carries, and flagged for what it does not. */
    case 'live': {
      if (!state.contact || action.update.id !== state.contact.id) return state;
      if (!isNewer(state.contact, action.update.updatedAt)) return state;
      const { id: _id, ...fields } = action.update;
      return { ...state, contact: { ...state.contact, ...fields }, stale: true };
    }

    case 'written':
      if (action.contact.id !== state.contactId) return state;
      return { ...state, contact: action.contact, error: null };

    case 'assigneeChanged':
      if (action.contactId !== state.contactId || !state.contact) return state;
      return {
        ...state,
        contact: { ...state.contact, assignee: action.assignee, updatedAt: action.updatedAt },
      };

    case 'noteChanged':
      if (action.contactId !== state.contactId || !state.contact) return state;
      return {
        ...state,
        contact: { ...state.contact, note: action.note, updatedAt: action.updatedAt },
      };

    case 'attributeProblem': {
      if (action.contactId !== state.contactId) return state;
      if (action.message === null && !(action.name in state.writeProblems)) return state;
      const writeProblems = { ...state.writeProblems };
      if (action.message === null) delete writeProblems[action.name];
      else writeProblems[action.name] = action.message;
      return { ...state, writeProblems };
    }
  }
}
