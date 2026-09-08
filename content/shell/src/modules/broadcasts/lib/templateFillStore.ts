/**
 * The message form as a pure reducer.
 *
 * A copy of the livechat module's `lib/templateFillStore.ts` re-keyed by the
 * payload block element. Livechat fills a temporary copy the server makes per
 * pick; here the copy IS the campaign's template block element, which exists
 * before anything is picked, and `whatsAppTemplateSetTemplate` is the pick.
 * Every setter answers the whole block, whose element carries `errors` — the
 * gate — recomputed as a whole, so the only state worth keeping is the last
 * element the server answered, plus what is in flight and what was refused.
 *
 * The same element also lands in the campaigns store (the composer hands
 * every block to `writeBlock`), which is not a second truth: it is one answer
 * held twice, and this reducer is the one that knows which field it was for.
 *
 * `epoch` bumps on every pick and on every adoption of an element from the
 * outside (the draft's kind changed, so the payload element is another one);
 * an answer issued under an older epoch is inert rather than a stranger's
 * parameters appearing in the new form.
 *
 * A setter can THROW as well as answer — `FileTooBig` on a header image, a
 * copy code that is too long — and a throw carries no element. It lands in
 * `problems`, keyed by the field, and the previous answer stays on screen:
 * what was typed did not take, and the form says so beside the field rather
 * than by blanking it.
 */
import type { TemplateConfig, TemplateElement } from '../types';
import { errorCode, errorMessage } from './errors';
import { refusedAttributes } from './templatePreview';

export interface TemplateFillState {
  /** The payload element being filled, or null while the composer has no draft. */
  elementId: string | null;
  /** The server's latest answer for it. */
  element: TemplateElement | null;
  epoch: number;
  /** `whatsAppTemplateSetTemplate` is in flight, for this catalog template. */
  picking: boolean;
  pickTemplateId: string | null;
  /** Why the last pick did not land, or null. */
  pickError: string | null;
  /** Field key → a write is in flight. Continue waits for all of them. */
  busy: Record<string, true>;
  /** Field key → why the last write to it did not land. */
  problems: Record<string, string>;
}

export type TemplateFillAction =
  | { type: 'adopted'; elementId: string | null; element: TemplateElement | null }
  | { type: 'picked'; templateId: string }
  | { type: 'pickAnswered'; epoch: number; element: TemplateElement }
  | { type: 'pickFailed'; epoch: number; message: string }
  | { type: 'setStarted'; epoch: number; key: string }
  | { type: 'setAnswered'; epoch: number; key: string; element: TemplateElement }
  | { type: 'setFailed'; epoch: number; key: string; message: string };

export const EMPTY_TEMPLATE_FILL: TemplateFillState = {
  elementId: null,
  element: null,
  epoch: 0,
  picking: false,
  pickTemplateId: null,
  pickError: null,
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
    /* The element from the campaigns store — on mount, and again whenever the
     * draft's payload element is another one. Nothing in flight survives: it
     * was for the previous element. */
    case 'adopted':
      return {
        ...EMPTY_TEMPLATE_FILL,
        elementId: action.elementId,
        element: action.element,
        epoch: state.epoch + 1,
      };

    /* Another template — or the same one again, which is "start over": the
     * server replaces the element's config wholesale on every pick. Problems
     * and in-flight writes belonged to the previous config. */
    case 'picked':
      return {
        ...state,
        epoch: state.epoch + 1,
        picking: true,
        pickTemplateId: action.templateId,
        pickError: null,
        busy: {},
        problems: {},
      };

    case 'pickAnswered':
      if (action.epoch !== state.epoch) return state;
      return { ...state, element: action.element, picking: false, pickTemplateId: null, pickError: null };

    case 'pickFailed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, picking: false, pickTemplateId: null, pickError: action.message };

    /* Marks the field in flight and forgets its last refusal — the person is
     * trying again, and a stale "too long" beside a value that is now short
     * would be a lie for the length of a round trip. */
    case 'setStarted':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        busy: { ...state.busy, [action.key]: true },
        problems: without(state.problems, action.key),
      };

    /* The answer is the whole element and replaces the whole element: a
     * setter for the body can change the verdict on the header, because the
     * server recomputes the list as a whole. */
    case 'setAnswered':
      if (action.epoch !== state.epoch) return state;
      return { ...state, element: action.element, busy: without(state.busy, action.key) };

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
 * The attribute references the server refused, by the field they sit in —
 * `{{first name}}` on a WhatsApp campaign is Facebook's attribute, and the
 * server keeps the reference with an `errCode` on the part rather than a
 * verdict on the element. Keys match `templateFields`.
 */
export function refusedByField(config: TemplateConfig | null | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!config) return out;
  const text = (parts: TemplateConfig['body']['text'] | null | undefined, component: 'header' | 'body' | 'footer') => {
    for (const part of parts ?? []) {
      if (part.__typename !== 'WhatsAppTemplateComponentTextPartParam') continue;
      const refused = refusedAttributes(part.value.parts);
      if (refused.length > 0) out[`${component}:${part.name}`] = refused;
    }
  };
  if (config.header?.__typename === 'WhatsAppTemplateComponentText') text(config.header.text, 'header');
  text(config.body.text, 'body');
  text(config.footer?.text, 'footer');
  for (const button of config.buttons) {
    if (button.__typename === 'WhatsAppTemplateURLButton') {
      for (const part of button.url ?? []) {
        if (part.__typename !== 'WhatsAppTemplateComponentTextPartParam') continue;
        const refused = refusedAttributes(part.value.parts);
        if (refused.length > 0) out[`button:${button.id}:${part.name}`] = refused;
      }
    } else if (button.__typename === 'WhatsAppTemplateCopyCodeButton') {
      const refused = refusedAttributes(button.code.parts);
      if (refused.length > 0) out[`code:${button.id}`] = refused;
    }
  }
  return out;
}

/**
 * Continue is allowed exactly when the element holds a template, the server
 * put no verdict on it, no reference in it was refused, nothing is still
 * being written and nothing on screen was refused. The last two matter as
 * much as the first: a setter that has not answered may be about to add a
 * verdict, and a field whose last value was refused shows that value while
 * the server holds the one before it.
 */
export function selectCanContinue(state: TemplateFillState): boolean {
  const element = state.element;
  return (
    element !== null &&
    !state.picking &&
    element.whatsAppTemplate !== null &&
    element.whatsAppTemplate !== undefined &&
    element.errors.length === 0 &&
    Object.keys(refusedByField(element.whatsAppTemplate)).length === 0 &&
    Object.keys(state.busy).length === 0 &&
    Object.keys(state.problems).length === 0
  );
}

const SETTER_TEXTS: Record<string, string> = {
  FileTooBig: 'Too large for a template header.',
  FileContentTypeNotSupported: 'This file type is not supported here.',
  FileNameTooLong: 'The file name is too long.',
  FileNameFormatNotSupported: 'The file name has characters WhatsApp refuses.',
  CopyCodeButtonCodeValueTooLong: 'Too long for a copy code.',
};

/**
 * A thrown setter, in words the field has room for. The named codes come
 * through the router as nested codes (`lib/errors.ts` reads them), and the
 * REST upload puts the same identifiers in its message text — so the match
 * is on both. Anything unrecognised is shown as it came.
 */
export function setterProblemText(err: unknown): string {
  const code = errorCode(err);
  const text = err instanceof Error ? err.message : String(err);
  for (const [known, sentence] of Object.entries(SETTER_TEXTS)) {
    if (code === known || text.includes(known)) return sentence;
  }
  return errorMessage(err, text);
}
