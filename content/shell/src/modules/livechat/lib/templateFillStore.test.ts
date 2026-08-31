import { describe, expect, it } from 'vitest';
import type { InboxFilledTemplateFragment } from '~api/generated/livechat/graphql';
import {
  EMPTY_TEMPLATE_FILL,
  selectCanSend,
  setterProblemText,
  templateFillReducer,
  type TemplateFillAction,
  type TemplateFillState,
} from './templateFillStore';

const filled = (id: string, errorCodes: string[] = []): InboxFilledTemplateFragment =>
  ({
    id,
    template: { id: 'tpl-order', name: 'order_update', language: 'English' },
    header: null,
    body: { text: [] },
    footer: null,
    buttons: [],
    errors: errorCodes.map((code) => ({
      __typename: 'FilledWhatsAppTemplateTextParamError',
      code,
      componentType: 'Body',
      paramName: '1',
    })),
  }) as unknown as InboxFilledTemplateFragment;

const run = (state: TemplateFillState, ...actions: TemplateFillAction[]): TemplateFillState =>
  actions.reduce(templateFillReducer, state);

/** Picked tpl-order and the server answered with a copy carrying one error. */
const created = (): TemplateFillState =>
  run(
    EMPTY_TEMPLATE_FILL,
    { type: 'picked', templateId: 'tpl-order' },
    { type: 'created', epoch: 1, filled: filled('filled-1', ['TextParamRequired']) },
  );

describe('the setter sequence', () => {
  it('creates, then replaces the whole copy on every answer', () => {
    const state = created();
    expect(state.creating).toBe(false);
    expect(state.filled?.id).toBe('filled-1');
    expect(selectCanSend(state)).toBe(false);

    const answered = run(
      state,
      { type: 'setStarted', epoch: 1, key: 'body:1' },
      { type: 'setAnswered', epoch: 1, key: 'body:1', filled: filled('filled-1') },
    );
    expect(answered.filled?.errors).toEqual([]);
    expect(answered.busy).toEqual({});
    expect(selectCanSend(answered)).toBe(true);
  });

  it('holds Send while a write is in flight, even with no errors on the last answer', () => {
    // The setter that has not answered may be about to add an error; a send
    // that beats it goes out with the previous parameters.
    const state = run(
      created(),
      { type: 'setAnswered', epoch: 1, key: 'body:1', filled: filled('filled-1') },
      { type: 'setStarted', epoch: 1, key: 'body:2' },
    );
    expect(state.filled?.errors).toEqual([]);
    expect(selectCanSend(state)).toBe(false);
  });

  it('is not sendable before the copy exists', () => {
    const picked = templateFillReducer(EMPTY_TEMPLATE_FILL, { type: 'picked', templateId: 'tpl-order' });
    expect(picked.creating).toBe(true);
    expect(selectCanSend(picked)).toBe(false);
  });
});

describe('a stale response', () => {
  it('drops a create or a setter answer issued under a spent epoch', () => {
    const state = run(created(), { type: 'picked', templateId: 'tpl-hello' });
    expect(state.filled).toBeNull();
    expect(state.epoch).toBe(2);
    const late = run(
      state,
      { type: 'created', epoch: 1, filled: filled('filled-1') },
      { type: 'setAnswered', epoch: 1, key: 'body:1', filled: filled('filled-1') },
      { type: 'setFailed', epoch: 1, key: 'body:1', message: 'nope' },
      { type: 'setStarted', epoch: 1, key: 'body:1' },
    );
    expect(late).toBe(state);
  });
});

describe('a setter that throws', () => {
  it('keeps the previous copy on screen and names the problem beside the field', () => {
    const state = run(
      created(),
      { type: 'setStarted', epoch: 1, key: 'header:file' },
      { type: 'setFailed', epoch: 1, key: 'header:file', message: setterProblemText(new Error('FileTooBig')) },
    );
    expect(state.filled?.id).toBe('filled-1');
    expect(state.busy).toEqual({});
    expect(state.problems).toEqual({ 'header:file': 'Too large for a template header.' });
    expect(selectCanSend(state)).toBe(false);
  });

  it('holds Send while a refused value is on screen, even with a clean copy on the server', () => {
    // The field shows the refused value; the server holds the one before it.
    const state = run(
      created(),
      { type: 'setAnswered', epoch: 1, key: 'body:1', filled: filled('filled-1') },
      { type: 'setStarted', epoch: 1, key: 'code:btn-code' },
      { type: 'setFailed', epoch: 1, key: 'code:btn-code', message: 'Too long for a copy code.' },
    );
    expect(state.filled?.errors).toEqual([]);
    expect(selectCanSend(state)).toBe(false);
  });

  it('forgets the problem when the field is written again', () => {
    const state = run(
      created(),
      { type: 'setStarted', epoch: 1, key: 'code:btn-code' },
      {
        type: 'setFailed',
        epoch: 1,
        key: 'code:btn-code',
        message: setterProblemText(new Error('CopyCodeButtonCodeValueTooLong')),
      },
      { type: 'setStarted', epoch: 1, key: 'code:btn-code' },
    );
    expect(state.problems).toEqual({});
    expect(state.busy).toEqual({ 'code:btn-code': true });
  });

  it('names the codes the setters document, and passes anything else through', () => {
    expect(setterProblemText(new Error('CopyCodeButtonCodeValueTooLong'))).toBe('Too long for a copy code.');
    expect(setterProblemText(new Error('FileContentTypeNotSupported'))).toBe('This file type is not supported here.');
    expect(setterProblemText(new Error('FileNameTooLong'))).toBe('The file name is too long.');
    expect(setterProblemText(new Error('socket hung up'))).toBe('socket hung up');
  });
});

describe('reset when the picker changes template', () => {
  it('forgets the copy, the problems and what was in flight', () => {
    const dirty = run(
      created(),
      { type: 'setStarted', epoch: 1, key: 'body:1' },
      { type: 'setFailed', epoch: 1, key: 'body:2', message: 'x' },
    );
    const state = templateFillReducer(dirty, { type: 'picked', templateId: 'tpl-hello' });
    expect(state).toEqual({
      ...EMPTY_TEMPLATE_FILL,
      templateId: 'tpl-hello',
      epoch: 2,
      creating: true,
    });
  });

  it('picking nothing goes back to the picker with nothing in flight', () => {
    const state = templateFillReducer(created(), { type: 'picked', templateId: null });
    expect(state.templateId).toBeNull();
    expect(state.creating).toBe(false);
    expect(state.filled).toBeNull();
  });

  it('re-picking the same template starts a fresh copy', () => {
    const state = templateFillReducer(created(), { type: 'picked', templateId: 'tpl-order' });
    expect(state.filled).toBeNull();
    expect(state.creating).toBe(true);
    expect(state.epoch).toBe(2);
  });

  it('reports a failed create and stops waiting', () => {
    const state = run(
      EMPTY_TEMPLATE_FILL,
      { type: 'picked', templateId: 'tpl-order' },
      { type: 'createFailed', epoch: 1, message: 'boom' },
    );
    expect(state.creating).toBe(false);
    expect(state.createError).toBe('boom');
  });
});
