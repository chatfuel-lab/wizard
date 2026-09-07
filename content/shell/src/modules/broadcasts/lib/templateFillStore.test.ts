import { describe, expect, it } from 'vitest';
import type { TemplateElement } from '../types';
import { sampleTemplateConfig, sampleTemplateElement } from './samples';
import {
  EMPTY_TEMPLATE_FILL,
  refusedByField,
  selectCanContinue,
  setterProblemText,
  templateFillReducer,
  type TemplateFillAction,
  type TemplateFillState,
} from './templateFillStore';

const element = (errorCodes: string[] = [], over: Partial<TemplateElement> = {}): TemplateElement =>
  sampleTemplateElement({
    errors: errorCodes.map((code) => ({
      __typename: 'WhatsAppTemplateParamValueRequiredError',
      code,
      message: '',
      paramName: '1',
    })),
    ...over,
  });

const run = (state: TemplateFillState, ...actions: TemplateFillAction[]): TemplateFillState =>
  actions.reduce(templateFillReducer, state);

/** The draft's element adopted, then a template picked whose body blank is still empty. */
const picked = (): TemplateFillState =>
  run(
    EMPTY_TEMPLATE_FILL,
    { type: 'adopted', elementId: 'el-template', element: element([], { whatsAppTemplate: null }) },
    { type: 'picked', templateId: 'tpl-2' },
    { type: 'pickAnswered', epoch: 2, element: element(['body_text_param_value_required']) },
  );

describe('the setter sequence', () => {
  it('picks, then replaces the whole element on every answer', () => {
    const state = picked();
    expect(state.picking).toBe(false);
    expect(state.element?.whatsAppTemplate?.name).toBe('spring_sale');
    expect(selectCanContinue(state)).toBe(false);

    const answered = run(
      state,
      { type: 'setStarted', epoch: 2, key: 'body:1' },
      { type: 'setAnswered', epoch: 2, key: 'body:1', element: element() },
    );
    expect(answered.element?.errors).toEqual([]);
    expect(answered.busy).toEqual({});
    expect(selectCanContinue(answered)).toBe(true);
  });

  it('holds Continue while a write is in flight, even with no verdict on the last answer', () => {
    // The setter that has not answered may be about to add a verdict.
    const state = run(
      picked(),
      { type: 'setAnswered', epoch: 2, key: 'body:1', element: element() },
      { type: 'setStarted', epoch: 2, key: 'body:2' },
    );
    expect(state.element?.errors).toEqual([]);
    expect(selectCanContinue(state)).toBe(false);
  });

  it('is not continuable before a template is on the element', () => {
    const adopted = templateFillReducer(EMPTY_TEMPLATE_FILL, {
      type: 'adopted',
      elementId: 'el-template',
      element: element([], { whatsAppTemplate: null }),
    });
    expect(selectCanContinue(adopted)).toBe(false);
    const picking = templateFillReducer(adopted, { type: 'picked', templateId: 'tpl-2' });
    expect(picking.picking).toBe(true);
    expect(selectCanContinue(picking)).toBe(false);
  });

  it('is continuable at once for an adopted element the server already accepts', () => {
    const state = templateFillReducer(EMPTY_TEMPLATE_FILL, {
      type: 'adopted',
      elementId: 'el-template',
      element: element(),
    });
    expect(selectCanContinue(state)).toBe(true);
  });
});

describe('a stale response', () => {
  it('drops a pick or a setter answer issued under a spent epoch', () => {
    const state = run(picked(), { type: 'picked', templateId: 'tpl-2' });
    expect(state.epoch).toBe(3);
    const late = run(
      state,
      { type: 'pickAnswered', epoch: 2, element: element() },
      { type: 'setAnswered', epoch: 2, key: 'body:1', element: element() },
      { type: 'setFailed', epoch: 2, key: 'body:1', message: 'nope' },
      { type: 'setStarted', epoch: 2, key: 'body:1' },
      { type: 'pickFailed', epoch: 2, message: 'nope' },
    );
    expect(late).toBe(state);
  });
});

describe('a setter that throws', () => {
  it('keeps the previous element on screen and names the problem beside the field', () => {
    const state = run(
      picked(),
      { type: 'setStarted', epoch: 2, key: 'header:file' },
      { type: 'setFailed', epoch: 2, key: 'header:file', message: setterProblemText(new Error('FileTooBig')) },
    );
    expect(state.element?.whatsAppTemplate?.name).toBe('spring_sale');
    expect(state.busy).toEqual({});
    expect(state.problems).toEqual({ 'header:file': 'Too large for a template header.' });
    expect(selectCanContinue(state)).toBe(false);
  });

  it('holds Continue while a refused value is on screen, even with a clean element on the server', () => {
    const state = run(
      picked(),
      { type: 'setAnswered', epoch: 2, key: 'body:1', element: element() },
      { type: 'setStarted', epoch: 2, key: 'code:btn-code' },
      { type: 'setFailed', epoch: 2, key: 'code:btn-code', message: 'Too long for a copy code.' },
    );
    expect(state.element?.errors).toEqual([]);
    expect(selectCanContinue(state)).toBe(false);
  });

  it('forgets the problem when the field is written again', () => {
    const state = run(
      picked(),
      { type: 'setStarted', epoch: 2, key: 'code:btn-code' },
      {
        type: 'setFailed',
        epoch: 2,
        key: 'code:btn-code',
        message: setterProblemText(new Error('CopyCodeButtonCodeValueTooLong')),
      },
      { type: 'setStarted', epoch: 2, key: 'code:btn-code' },
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

describe('a refused attribute reference', () => {
  const refused = sampleTemplateConfig({
    body: {
      text: [
        {
          __typename: 'WhatsAppTemplateComponentTextPartParam',
          name: '1',
          value: {
            parts: [
              { __typename: 'TemplateStrText', text: 'Hi ', errCode: '' },
              {
                __typename: 'TemplateStrAttribute',
                attribute: { name: 'first name', type: 'system' as never, dataType: 'String' as never },
                errCode: 'AttributeIsNotAllowedForPlatform',
              },
            ],
          },
        },
      ],
    },
  });

  it('is found under the field it sits in', () => {
    expect(refusedByField(refused)).toEqual({ 'body:1': ['first name'] });
    expect(refusedByField(sampleTemplateConfig())).toEqual({});
    expect(refusedByField(null)).toEqual({});
  });

  it('holds Continue although the element carries no verdict', () => {
    const state = templateFillReducer(EMPTY_TEMPLATE_FILL, {
      type: 'adopted',
      elementId: 'el-template',
      element: element([], { whatsAppTemplate: refused }),
    });
    expect(state.element?.errors).toEqual([]);
    expect(selectCanContinue(state)).toBe(false);
  });
});

describe('adopting another element', () => {
  it('forgets the previous element, its problems and what was in flight', () => {
    const dirty = run(
      picked(),
      { type: 'setStarted', epoch: 2, key: 'body:1' },
      { type: 'setFailed', epoch: 2, key: 'body:2', message: 'x' },
    );
    const state = templateFillReducer(dirty, { type: 'adopted', elementId: 'el-other', element: element() });
    expect(state).toEqual({
      ...EMPTY_TEMPLATE_FILL,
      elementId: 'el-other',
      element: element(),
      epoch: 3,
    });
  });

  it('re-picking starts over on the same element and keeps what it last showed until the answer', () => {
    const state = templateFillReducer(picked(), { type: 'picked', templateId: 'tpl-2' });
    expect(state.picking).toBe(true);
    expect(state.element?.whatsAppTemplate?.name).toBe('spring_sale');
    expect(state.epoch).toBe(3);
  });

  it('reports a failed pick and stops waiting', () => {
    const state = run(
      picked(),
      { type: 'picked', templateId: 'tpl-2' },
      { type: 'pickFailed', epoch: 3, message: 'boom' },
    );
    expect(state.picking).toBe(false);
    expect(state.pickError).toBe('boom');
  });
});
