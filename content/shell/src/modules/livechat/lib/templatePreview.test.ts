import { describe, expect, it } from 'vitest';
import {
  FilledWhatsAppTemplateErrorCode,
  WhatsAppTemplateComponentType,
  WhatsAppTemplateStatus,
  type InboxFilledTemplateFragment,
  type InboxWhatsAppTemplateFragment,
} from '~api/generated/livechat/graphql';
import {
  attachErrors,
  fieldLabel,
  renderParts,
  sendableTemplates,
  strText,
  templateContentOf,
  templateFields,
  templatePreview,
  templateSearchTexts,
  type TemplateComponents,
} from './templatePreview';

const text = (value: string) => ({
  __typename: 'WhatsAppTemplateComponentTextPartText' as const,
  text: value,
});
const param = (name: string, value?: string) => ({
  __typename: 'WhatsAppTemplateComponentTextPartParam' as const,
  name,
  value: {
    parts: value === undefined ? [] : [{ __typename: 'TemplateStrText' as const, text: value }],
  },
});
const file = (id: string) => ({
  id,
  url: `https://files.example/${id}`,
  type: 'Image' as never,
  status: 'Downloaded' as never,
  size: 10,
});

const ORDER: TemplateComponents = {
  header: { __typename: 'WhatsAppTemplateComponentText', text: [text('Order '), param('1')] },
  body: {
    text: [text('Hi '), param('1'), text(', your order is now '), param('2'), text('.')],
  },
  footer: { text: [text('Reply STOP to opt out')] },
  buttons: [
    {
      __typename: 'WhatsAppTemplateURLButton',
      id: 'btn-track',
      text: 'Track order',
      url: [text('https://shop.example/track/'), param('1')],
    },
    { __typename: 'WhatsAppTemplateQuickReplyButton', id: 'btn-help', text: 'I need help' },
    {
      __typename: 'WhatsAppTemplateCopyCodeButton',
      id: 'btn-code',
      text: 'Copy code',
      code: { parts: [] },
    },
    { __typename: 'WhatsAppTemplateCallPhoneButton', text: 'Call us', phoneNumber: '+49 30 1' },
  ],
};

describe('parts to string', () => {
  it('joins literal text and substitutes a filled parameter', () => {
    expect(renderParts([text('Hi '), param('1', 'Jonas'), text('!')])).toBe('Hi Jonas!');
  });

  it("keeps an unfilled parameter as its {{name}} placeholder — WhatsApp's own notation", () => {
    expect(renderParts([text('Hi '), param('1'), text(', order '), param('2', '#4471')])).toBe('Hi {{1}}, order #4471');
  });

  it('prints an attribute reference as a placeholder rather than inventing a value', () => {
    expect(
      strText([
        { __typename: 'TemplateStrText', text: 'Dear ' },
        { __typename: 'TemplateStrAttribute', attribute: { name: 'first name' } },
      ]),
    ).toBe('Dear {{first name}}');
  });

  it('is empty for no parts at all', () => {
    expect(renderParts(null)).toBe('');
    expect(renderParts(undefined)).toBe('');
  });
});

describe('templatePreview', () => {
  it('renders every component with its blanks visible', () => {
    const preview = templatePreview(ORDER);
    expect(preview.header).toEqual({ kind: 'text', text: 'Order {{1}}' });
    expect(preview.body).toBe('Hi {{1}}, your order is now {{2}}.');
    expect(preview.footer).toBe('Reply STOP to opt out');
  });

  it('renders a URL button with its parameter substituted, and a copy code as null until set', () => {
    const preview = templatePreview(ORDER);
    expect(preview.buttons).toEqual([
      { kind: 'url', text: 'Track order', url: 'https://shop.example/track/{{1}}' },
      { kind: 'quickReply', text: 'I need help' },
      { kind: 'copyCode', text: 'Copy code', code: null },
      { kind: 'call', text: 'Call us', phoneNumber: '+49 30 1' },
    ]);

    const filled: TemplateComponents = {
      ...ORDER,
      buttons: [
        {
          __typename: 'WhatsAppTemplateURLButton',
          id: 'btn-track',
          text: 'Track order',
          url: [text('https://shop.example/track/'), param('1', '4471')],
        },
        {
          __typename: 'WhatsAppTemplateCopyCodeButton',
          id: 'btn-code',
          text: 'Copy code',
          code: { parts: [{ __typename: 'TemplateStrText', text: 'SAVE10' }] },
        },
      ],
    };
    expect(templatePreview(filled).buttons).toEqual([
      { kind: 'url', text: 'Track order', url: 'https://shop.example/track/4471' },
      { kind: 'copyCode', text: 'Copy code', code: 'SAVE10' },
    ]);
  });

  it('describes a media header by kind, with the file once one is set', () => {
    const empty: TemplateComponents = {
      header: { __typename: 'WhatsAppTemplateComponentDocument', document: null, fileName: null },
      body: { text: [text('Your receipt is attached.')] },
      footer: null,
      buttons: [],
    };
    expect(templatePreview(empty).header).toEqual({ kind: 'document', url: null, fileName: null });
    const set: TemplateComponents = {
      ...empty,
      header: {
        __typename: 'WhatsAppTemplateComponentDocument',
        document: file('f-1'),
        fileName: 'receipt.pdf',
      },
    };
    expect(templatePreview(set).header).toEqual({
      kind: 'document',
      url: 'https://files.example/f-1',
      fileName: 'receipt.pdf',
    });
  });

  it('has no header and no footer when the template has none', () => {
    const preview = templatePreview({ header: null, body: { text: [text('Hello')] }, footer: null, buttons: [] });
    expect(preview.header).toBeNull();
    expect(preview.footer).toBeNull();
    expect(preview.body).toBe('Hello');
  });
});

describe('templateFields — the blanks, in reading order', () => {
  it('lists header, body, footer and button blanks with stable keys', () => {
    expect(templateFields(ORDER).map((field) => field.key)).toEqual([
      'header:1',
      'body:1',
      'body:2',
      'button:btn-track:1',
      'code:btn-code',
    ]);
  });

  it('carries the current value of a filled parameter', () => {
    const fields = templateFields({
      ...ORDER,
      body: { text: [text('Hi '), param('1', 'Jonas'), text(' and '), param('1', 'Jonas')] },
    });
    const body = fields.filter((field) => field.component === 'Body');
    // The same {{1}} twice is one blank.
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ kind: 'text', name: '1', value: 'Jonas' });
  });

  it('turns a media header into one file field', () => {
    const fields = templateFields({
      header: { __typename: 'WhatsAppTemplateComponentImage', image: null },
      body: { text: [text('Look')] },
      footer: null,
      buttons: [],
    });
    expect(fields).toEqual([{ key: 'header:file', kind: 'file', component: 'Header', fileKind: 'image', file: null }]);
  });
});

describe('attachErrors — the server verdict lands beside its field', () => {
  const fields = templateFields(ORDER);
  const errors: InboxFilledTemplateFragment['errors'] = [
    {
      __typename: 'FilledWhatsAppTemplateTextParamError',
      code: FilledWhatsAppTemplateErrorCode.TextParamRequired,
      componentType: WhatsAppTemplateComponentType.Body,
      paramName: '2',
    },
    {
      __typename: 'FilledWhatsAppTemplateButtonError',
      code: FilledWhatsAppTemplateErrorCode.UrlButtonParamRequired,
      componentType: WhatsAppTemplateComponentType.Buttons,
      paramName: '1',
      buttonID: 'btn-track',
    },
    {
      __typename: 'FilledWhatsAppTemplateButtonError',
      code: FilledWhatsAppTemplateErrorCode.CopyCodeButtonCodeValueTooLong,
      componentType: WhatsAppTemplateComponentType.Buttons,
      paramName: '',
      buttonID: 'btn-code',
    },
  ];

  it('keys a text-param error by component and name, a button error by button', () => {
    const attached = attachErrors(fields, errors);
    expect(attached.byKey).toEqual({
      'body:2': ['Required'],
      'button:btn-track:1': ['Required'],
      'code:btn-code': ['Too long'],
    });
    expect(attached.unattached).toEqual([]);
  });

  it('puts a generic Header error on the header file field', () => {
    const media = templateFields({
      header: { __typename: 'WhatsAppTemplateComponentImage', image: null },
      body: { text: [text('Look')] },
      footer: null,
      buttons: [],
    });
    const attached = attachErrors(media, [
      {
        __typename: 'FilledWhatsAppTemplateGenericError',
        code: FilledWhatsAppTemplateErrorCode.FileRequired,
        componentType: WhatsAppTemplateComponentType.Header,
      },
    ]);
    expect(attached.byKey).toEqual({ 'header:file': ['A file is required'] });
  });

  it('never drops an error it cannot place — the gate must stay visible', () => {
    const attached = attachErrors(fields, [
      {
        __typename: 'FilledWhatsAppTemplateGenericError',
        code: FilledWhatsAppTemplateErrorCode.StatusNotValidForProcessing,
        componentType: null,
      },
      {
        __typename: 'FilledWhatsAppTemplateTextParamError',
        code: FilledWhatsAppTemplateErrorCode.TextParamRequired,
        componentType: WhatsAppTemplateComponentType.Footer,
        paramName: '9',
      },
    ]);
    expect(attached.byKey).toEqual({});
    expect(attached.unattached).toEqual(['This template can no longer be sent — its status changed', 'Required']);
  });
});

describe('sendableTemplates', () => {
  const template = (id: string, status: WhatsAppTemplateStatus, supported: boolean): InboxWhatsAppTemplateFragment =>
    ({
      id,
      name: id,
      status,
      language: 'English',
      category: 'Utility',
      IsSupportedInLivechat: supported,
      header: null,
      body: { text: [text('Hi')] },
      footer: null,
      buttons: [],
    }) as unknown as InboxWhatsAppTemplateFragment;

  it('offers only approved templates this channel can send', () => {
    const offered = sendableTemplates([
      template('ok', WhatsAppTemplateStatus.Approved, true),
      template('pending', WhatsAppTemplateStatus.Pending, true),
      template('broadcast-only', WhatsAppTemplateStatus.Approved, false),
      template('paused', WhatsAppTemplateStatus.Paused, true),
    ]);
    expect(offered.map((entry) => entry.id)).toEqual(['ok']);
  });

  it('searches the name first, then what the message says', () => {
    const texts = templateSearchTexts(template('order_update', WhatsAppTemplateStatus.Approved, true));
    expect(texts[0]).toBe('order_update');
    expect(texts[1]).toBe('Hi');
  });
});

/**
 * The optimistic row is drawn from this, by the same bubble that draws the
 * echo, so it has to be the echo's shape: `TemplateContent` as `readPayload`
 * gives a `WhatsAppOutTemplateMessage`.
 */
describe('templateContentOf — the preview as the thread will draw it', () => {
  it('carries header, body, footer and every button kind as actions', () => {
    const content = templateContentOf(templatePreview(ORDER));
    expect(content).toEqual({
      header: { kind: 'text', text: 'Order {{1}}' },
      body: 'Hi {{1}}, your order is now {{2}}.',
      footer: 'Reply STOP to opt out',
      actions: [
        { title: 'Track order', href: 'https://shop.example/track/{{1}}' },
        { title: 'I need help' },
        /* An unset code shows the button's text alone; a set one is appended. */
        { title: 'Copy code' },
        { title: 'Call us', phone: '+49 30 1' },
      ],
    });
  });

  it('labels every field kind for the form', () => {
    expect(fieldLabel({ key: 'text:Body:1', kind: 'text', component: 'Body', name: '1', value: '' })).toBe(
      'Body {{1}}',
    );
    expect(
      fieldLabel({
        key: 'url:b1',
        kind: 'urlParam',
        component: 'Buttons',
        buttonId: 'b1',
        buttonText: 'Track',
        name: '1',
        value: '',
      }),
    ).toBe('“Track” link {{1}}');
    expect(
      fieldLabel({
        key: 'code:b2',
        kind: 'copyCode',
        component: 'Buttons',
        buttonId: 'b2',
        buttonText: 'Copy',
        value: '',
      }),
    ).toBe('“Copy” code');
    expect(fieldLabel({ key: 'file:Header', kind: 'file', component: 'Header', fileKind: 'image', file: null })).toBe(
      'Header image',
    );
  });

  it('uses the server URL for a media header, and names a document from the picker first', () => {
    const receipt: TemplateComponents = {
      header: { __typename: 'WhatsAppTemplateComponentDocument', document: file('f1'), fileName: 'server.pdf' },
      body: { text: [text('Your receipt is attached.')] },
      footer: null,
      buttons: [],
    };
    expect(templateContentOf(templatePreview(receipt))).toEqual({
      header: { kind: 'document', url: 'https://files.example/f1', name: 'server.pdf' },
      body: 'Your receipt is attached.',
      footer: null,
      actions: [],
    });
    expect(templateContentOf(templatePreview(receipt), 'receipt.pdf').header).toEqual({
      kind: 'document',
      url: 'https://files.example/f1',
      name: 'receipt.pdf',
    });
    /* An image header has no name on the wire and takes none from the picker. */
    const image: TemplateComponents = {
      ...receipt,
      header: { __typename: 'WhatsAppTemplateComponentImage', image: null },
    };
    expect(templateContentOf(templatePreview(image), 'photo.jpg').header).toEqual({
      kind: 'image',
      url: null,
      name: null,
    });
  });
});
