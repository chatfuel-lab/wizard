import type { InboxFilledTemplateFragment } from '~api/generated/livechat/graphql';
import { messageOf } from './errors';

/**
 * The template form as a pure reducer.
 *
 * The form holds no draft of its own. `InboxFilledTemplateCreate` makes a
 * temporary filled copy on the server, every setter answers with the WHOLE
 * copy, and `errors` on that copy is the send gate — so the only state worth
 * having is the last answer the server gave, plus what is in flight and what
 * was refused. A form that kept its own field values beside the server's would
 * have two truths, and the one on screen would be the one the server had not
 * yet checked.
 *
 * Every response-shaped action carries the `epoch` it was issued under, as in
 * every other store here: picking another template bumps it, and a setter
 * answer for the previous template that lands afterwards is inert rather than
 * a stranger's parameters appearing in the new form.
 *
 * A setter can THROW as well as answer — `FileTooBig` on a header image,
 * `CopyCodeButtonCodeValueTooLong` on a code — and a throw carries no filled
 * copy. So it lands in `problems`, keyed by the field, and the previous answer
 * stays on screen: what the operator typed did not take, and the form says so
 * beside the field rather than by blanking it.
 */
export interface TemplateFillState {
  /** The catalog template being filled, or null when the picker is showing. */
  templateId: string | null;
  /** The server's latest copy. Null until `created`. */
  filled: InboxFilledTemplateFragment | null;
  epoch: number;
  creating: boolean;
  /** Why the copy could not be created, or null. */
  createError: string | null;
  /** Field key → a write is in flight. Send waits for all of them. */
  busy: Record<string, true>;
  /** Field key → why the last write to it did not land. */
  problems: Record<string, string>;
}

export type TemplateFillAction =
  | { type: 'picked'; templateId: string | null }
  | { type: 'created'; epoch: number; filled: InboxFilledTemplateFragment }
  | { type: 'createFailed'; epoch: number; message: string }
  | { type: 'setStarted'; epoch: number; key: string }
  | { type: 'setAnswered'; epoch: number; key: string; filled: InboxFilledTemplateFragment }
  | { type: 'setFailed'; epoch: number; key: string; message: string };

export const EMPTY_TEMPLATE_FILL: TemplateFillState = {
  templateId: null,
  filled: null,
  epoch: 0,
  creating: false,
  createError: null,
  busy: {},
  problems: {},
};

const without = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  if (!(key in record)) return record;
  const { [key]: _dropped, ...rest } = record;
  return rest;
};

export function templateFillReducer(state: TemplateFillState, action: TemplateFillAction): TemplateFillState {
  switch (action.type) {
    /* A different template — or none. Nothing survives, and the epoch bump is
     * what makes the previous copy's in-flight answers inert. Picking the same
     * template again is a fresh copy too: the temporary one on the server has
     * whatever was typed into it, and "start over" is what re-picking means. */
    case 'picked':
      return {
        ...EMPTY_TEMPLATE_FILL,
        templateId: action.templateId,
        epoch: state.epoch + 1,
        creating: action.templateId !== null,
      };

    case 'created':
      if (action.epoch !== state.epoch) return state;
      return { ...state, filled: action.filled, creating: false, createError: null };

    case 'createFailed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, creating: false, createError: action.message };

    /* Marks the field in flight and forgets its last refusal — the operator is
     * trying again, and a stale "too long" beside a value that is now short
     * would be a lie for the length of a round trip. */
    case 'setStarted':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        busy: { ...state.busy, [action.key]: true },
        problems: without(state.problems, action.key),
      };

    /* The answer is the whole copy, and it replaces the whole copy: a setter
     * for the body can change the errors list for the header, because the
     * server recomputes it as a whole. */
    case 'setAnswered':
      if (action.epoch !== state.epoch) return state;
      return { ...state, filled: action.filled, busy: without(state.busy, action.key) };

    case 'setFailed':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        busy: without(state.busy, action.key),
        problems: { ...state.problems, [action.key]: action.message },
      };
  }
}

/**
 * Send is allowed exactly when the server's copy has no errors, nothing is
 * still being written to it, and nothing on screen was refused. The last two
 * matter as much as the first: a setter that has not answered may be about to
 * add an error, and a send that beats it goes out with the previous
 * parameters; and a field whose last value was refused shows that value while
 * the server holds the one before it — sending then sends something other
 * than what the operator is looking at.
 */
export function selectCanSend(state: TemplateFillState): boolean {
  return (
    state.filled !== null &&
    !state.creating &&
    state.filled.errors.length === 0 &&
    Object.keys(state.busy).length === 0 &&
    Object.keys(state.problems).length === 0
  );
}

/**
 * A thrown setter, in words the field has room for.
 *
 * The codes are the ones the operations document lists on each setter. They
 * arrive as bare identifiers inside the error's message, the same way the REST
 * upload's do — so the match is on the text. Anything unrecognised is shown as
 * it came, rather than guessed at.
 */
export function setterProblemText(err: unknown): string {
  const text = messageOf(err);
  if (text.includes('FileTooBig')) return 'Too large for a template header.';
  if (text.includes('FileContentTypeNotSupported')) return 'This file type is not supported here.';
  if (text.includes('FileNameTooLong')) return 'The file name is too long.';
  if (text.includes('FileNameFormatNotSupported')) return 'The file name has characters WhatsApp refuses.';
  if (text.includes('CopyCodeButtonCodeValueTooLong')) return 'Too long for a copy code.';
  return text;
}
