import { describe, expect, it } from 'vitest';
import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { problemText } from './errors';
import { sampleTemplate, sampleTemplateConfig } from './samples';
import {
  attachErrors,
  componentsOfConfig,
  refusedAttributes,
  sendableTemplates,
  templateFields,
  templatePreview,
  templateSearchTexts,
} from './templatePreview';

describe('the preview', () => {
  it('leaves an unfilled blank as its placeholder', () => {
    const preview = templatePreview(sampleTemplate());
    expect(preview.body).toBe('Hi {{1}}, everything is 20% off this week.');
    expect(preview.header).toEqual({ kind: 'text', text: 'Spring sale' });
    expect(preview.buttons).toEqual([{ kind: 'url', text: 'Shop now', url: 'https://example.com/sale' }]);
  });

  it('substitutes a filled one, and prints an attribute as its placeholder', () => {
    expect(templatePreview(componentsOfConfig(sampleTemplateConfig())).body).toBe(
      'Hi there, everything is 20% off this week.',
    );
    const personalised = sampleTemplateConfig({
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
                  attribute: { name: 'whatsapp user name', type: 'system', dataType: 'text' },
                  errCode: '',
                },
              ],
            },
          },
        ],
      } as ReturnType<typeof sampleTemplateConfig>['body'],
    });
    expect(templatePreview(componentsOfConfig(personalised)).body).toBe('Hi {{whatsapp user name}}');
  });
});

describe('the blanks', () => {
  it('are listed once each, in reading order', () => {
    expect(templateFields(sampleTemplate()).map((field) => field.key)).toEqual(['body:1']);
  });

  it('include a header file slot', () => {
    const withImage = sampleTemplate({ header: { __typename: 'WhatsAppTemplateComponentImage', image: null } });
    expect(templateFields(withImage)[0]).toMatchObject({
      key: 'header:file',
      kind: 'file',
      fileKind: 'image',
      file: null,
    });
  });
});

describe('verdicts beside their field', () => {
  it('attach a parameter verdict by component and name', () => {
    const fields = templateFields(sampleTemplate());
    const attached = attachErrors(
      fields,
      [
        {
          __typename: 'WhatsAppTemplateParamValueRequiredError',
          code: 'body_text_param_value_required',
          message: '',
          paramName: '1',
        },
        { __typename: 'ComponentValidationError', code: 'template_required', message: '' },
      ],
      problemText,
    );
    expect(attached.byKey).toEqual({ 'body:1': ['Fill in {{1}}'] });
    expect(attached.unattached).toEqual(['Pick a template']);
  });

  it('attach a copy-code verdict to the copy-code blank', () => {
    const fields = templateFields(
      sampleTemplate({
        buttons: [
          { __typename: 'WhatsAppTemplateCopyCodeButton', id: 'btn-code', text: 'Copy code', code: { parts: [] } },
        ],
      }),
    );
    const codeField = fields.find((field) => field.kind === 'copyCode');
    expect(codeField).toBeDefined();
    const attached = attachErrors(
      fields,
      [{ __typename: 'ComponentValidationError', code: 'copy_code_button_code_value_required', message: '' }],
      problemText,
    );
    expect(Object.keys(attached.byKey)).toEqual([codeField!.key]);
    expect(attached.unattached).toEqual([]);
  });
});

describe('refused attributes', () => {
  it('are the parts the server flagged', () => {
    expect(
      refusedAttributes([
        { __typename: 'TemplateStrText', text: 'Hi ', errCode: '' },
        {
          __typename: 'TemplateStrAttribute',
          attribute: { name: 'first name', type: 'system', dataType: 'text' },
          errCode: 'AttributeIsNotAllowedForPlatform',
        },
      ] as Parameters<typeof refusedAttributes>[0]),
    ).toEqual(['first name']);
  });
});

describe('what the composer offers', () => {
  it('is approved and supported by the flow builder', () => {
    const rows = [
      sampleTemplate({ id: 'a' }),
      sampleTemplate({ id: 'b', status: WhatsAppTemplateStatus.Pending }),
      sampleTemplate({ id: 'c', IsSupportedInFlowbuilder: false }),
    ];
    expect(sendableTemplates(rows).map((row) => row.id)).toEqual(['a']);
  });

  it('is searched by name and by the words of the message', () => {
    expect(templateSearchTexts(sampleTemplate())).toContain('spring_sale');
    expect(templateSearchTexts(sampleTemplate())[1]).toContain('20% off');
  });
});
