import { describe, expect, it } from 'vitest';
import type { TestMessageNode } from '../types';
import { toRow } from './testRows';

/* The row MODEL, the merge, the watermark and the session machine are `~ui`'s
   `lib/testChat` and are tested there. This file covers the one thing the
   module owns: the typename switch over its own fragment — which is the wide
   one, because a flow's output is buttons, lists, templates and media. */

const contact = { __typename: 'ContactMessageSender', id: 'c', name: 'You (test)' } as const;
const bot = { __typename: 'AutomationMessageSender', id: 'b', name: 'Luma' } as const;

const node = (over: Record<string, unknown>): TestMessageNode =>
  ({
    __typename: 'WhatsAppInTextMessage',
    id: 'm1',
    clientId: 'c1',
    sentTime: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    sender: contact,
    errors: [],
    text: 'hi',
    ...over,
  }) as unknown as TestMessageNode;

const file = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  url: 'https://cdn.example/f1.png',
  type: 'image',
  status: 'Downloaded',
  size: 10,
  ...over,
});

describe('text and identity', () => {
  it('maps In and Out text by typename, the widget by sender', () => {
    expect(toRow(node({}))).toMatchObject({
      kind: 'in',
      key: 'c1',
      id: 'm1',
      text: 'hi',
      fromBot: false,
      senderLabel: 'You (test)',
    });
    expect(toRow(node({ __typename: 'InstagramOutTextMessage', sender: bot }))).toMatchObject({
      kind: 'out',
      fromBot: true,
      senderLabel: 'Luma',
    });
    expect(toRow(node({ __typename: 'TikTokInTextMessage' }))).toMatchObject({ kind: 'in' });
    expect(toRow(node({ __typename: 'FacebookOutTextMessage', sender: bot }))).toMatchObject({ kind: 'out' });
    expect(toRow(node({ __typename: 'WebWidgetTextMessage', sender: bot }))).toMatchObject({ kind: 'out' });
    expect(toRow(node({ __typename: 'WebWidgetTextMessage', sender: contact }))).toMatchObject({ kind: 'in' });
  });
  it('keys by clientId, then id, then a synthetic; a bad time sorts first', () => {
    expect(toRow(node({ id: null })).key).toBe('c1');
    expect(toRow(node({ clientId: null })).key).toBe('m1');
    const a = toRow(node({ id: null, clientId: null }));
    const b = toRow(node({ id: null, clientId: null }));
    expect(a.key).not.toBe(b.key);
    expect(toRow(node({ sentTime: 'garbage' })).at).toBe(0);
  });
});

describe('what a flow actually sends', () => {
  it('a widget buttons message: continue, URL and phone each tagged for their own mutation', () => {
    const row = toRow(
      node({
        __typename: 'WebWidgetTextAndButtonsMessage',
        sender: bot,
        text: 'What can I do?',
        buttons: [
          { __typename: 'WebWidgetContinueFlowButton', title: 'Book' },
          { __typename: 'WebWidgetOpenURLButton', title: 'Site', url: 'https://x.test' },
          { __typename: 'WebWidgetCallPhoneButton', title: 'Call', phone: '+15551234' },
        ],
      }),
    );
    expect(row).toMatchObject({ kind: 'out', text: 'What can I do?' });
    expect(row.actions).toEqual([
      { kind: 'button', title: 'Book', click: 'widget-continue' },
      { kind: 'button', title: 'Site', href: 'https://x.test', click: 'widget-url' },
      { kind: 'button', title: 'Call', phone: '+15551234', click: 'widget-phone' },
    ]);
  });
  it('a WhatsApp buttons message keeps header and footer apart from the body', () => {
    const row = toRow(
      node({
        __typename: 'WhatsAppOutTextAndButtonsMessage',
        sender: bot,
        headerText: 'Luma Skin Studio',
        bodyText: 'Pick a slot',
        footerText: 'Reply STOP to opt out',
        whatsappButtons: [
          { __typename: 'WhatsAppQuickReplyMessageButton', title: 'Thu 17:00' },
          { __typename: 'WhatsAppOpenURLMessageButton', title: 'Map', url: 'https://map.test' },
        ],
      }),
    );
    expect(row).toMatchObject({ header: 'Luma Skin Studio', text: 'Pick a slot', footer: 'Reply STOP to opt out' });
    /* A WhatsApp URL button has NO click mutation — it is a link and nothing
       else, which is why it carries `href` and no `click`. */
    expect(row.actions).toEqual([
      { kind: 'button', title: 'Thu 17:00', click: 'wa-continue' },
      { kind: 'button', title: 'Map', href: 'https://map.test' },
    ]);
  });
  it('a WhatsApp list becomes rows, described and clickable', () => {
    const row = toRow(
      node({
        __typename: 'WhatsAppOutListMessage',
        sender: bot,
        bodyText: 'Our treatments',
        buttonTitle: 'See all',
        listRows: [
          { title: 'Hydrafacial', description: '60 min' },
          { title: 'LED therapy', description: null },
        ],
      }),
    );
    expect(row.actions).toEqual([
      { kind: 'row', title: 'Hydrafacial', description: '60 min', click: 'wa-list-row' },
      { kind: 'row', title: 'LED therapy', description: undefined, click: 'wa-list-row' },
    ]);
  });
  it('a template splits into header media, body, footer and buttons; unrenderable buttons drop out', () => {
    const row = toRow(
      node({
        __typename: 'WhatsAppOutTemplateMessage',
        sender: bot,
        header: { __typename: 'WhatsAppOutTemplateMessageComponentImage', file: file() },
        body: { text: 'Your booking is confirmed' },
        footer: { text: 'Luma' },
        waTemplateButtons: [
          { __typename: 'WhatsAppOutTemplateMessageQuickReplyButton', text: 'Reschedule' },
          { __typename: 'WhatsAppOutTemplateMessageURLButton', text: 'Details', url: 'https://x.test' },
          { __typename: 'WhatsAppOutTemplateMessageCopyCodeButton' },
        ],
      }),
    );
    expect(row.media).toEqual({ kind: 'image', url: 'https://cdn.example/f1.png', name: undefined });
    expect(row.text).toBe('Your booking is confirmed');
    expect(row.footer).toBe('Luma');
    expect(row.actions).toEqual([
      { kind: 'button', title: 'Reschedule', click: 'wa-quick-reply' },
      { kind: 'button', title: 'Details', href: 'https://x.test' },
    ]);
  });
  it('media carries its caption as the body, and an expired file has no URL to trust', () => {
    expect(
      toRow(node({ __typename: 'WhatsAppOutImageMessage', sender: bot, caption: 'Before', file: file() })),
    ).toMatchObject({
      text: 'Before',
      media: { kind: 'image', url: 'https://cdn.example/f1.png', name: 'Before' },
    });
    expect(
      toRow(
        node({
          __typename: 'WhatsAppOutDocumentMessage',
          sender: bot,
          caption: null,
          fileName: 'plan.pdf',
          file: file({ status: 'Expired' }),
        }),
      ).media,
    ).toEqual({
      kind: 'document',
      url: '',
      name: 'plan.pdf',
    });
    expect(toRow(node({ __typename: 'WhatsAppOutAudioMessage', sender: bot, file: file() })).media?.kind).toBe('audio');
    expect(
      toRow(node({ __typename: 'WhatsAppOutVideoMessage', sender: bot, caption: null, file: file() })).media?.kind,
    ).toBe('video');
  });
});

describe('what a press echoes back as', () => {
  it('a click comes back as its own message, named by the title that was pressed', () => {
    expect(toRow(node({ __typename: 'WhatsAppInContinueFlowButtonClickMessage', buttonTitle: 'Book' }))).toMatchObject({
      kind: 'in',
      text: 'Book',
    });
    expect(
      toRow(node({ __typename: 'WhatsAppInTemplateQuickReplyButtonClickMessage', buttonTitle: 'Reschedule' })),
    ).toMatchObject({ kind: 'in', text: 'Reschedule' });
    expect(
      toRow(node({ __typename: 'WhatsAppInListRowClickMessage', rowTitle: 'Hydrafacial', rowDescription: '60 min' })),
    ).toMatchObject({ kind: 'in', text: 'Hydrafacial' });
    expect(
      toRow(node({ __typename: 'WebWidgetContinueFlowButtonClickMessage', button: { title: 'Book' } })),
    ).toMatchObject({ kind: 'in', text: 'Book' });
    expect(
      toRow(
        node({ __typename: 'WebWidgetOpenURLButtonClickMessage', button: { title: 'Site', url: 'https://x.test' } }),
      ),
    ).toMatchObject({ kind: 'in', text: 'Site' });
    expect(
      toRow(node({ __typename: 'WebWidgetCallPhoneButtonClickMessage', button: { title: 'Call', phone: '+1' } })),
    ).toMatchObject({ kind: 'in', text: 'Call' });
  });
});

describe('the system trio and the never-crash rule', () => {
  it('maps typing, summary and the hand-off', () => {
    expect(
      toRow(node({ __typename: 'SystemTypingMessage', sender: bot, until: '2026-08-18T10:00:05.000Z' })),
    ).toMatchObject({ kind: 'typing', until: '2026-08-18T10:00:05.000Z' });
    expect(
      toRow(node({ __typename: 'SystemConversationSummaryMessage', sender: bot, summary: 'asked for a human' })),
    ).toMatchObject({ kind: 'system', systemKind: 'summary', text: 'asked for a human' });
    expect(
      toRow(node({ __typename: 'SystemLivechatOpenedByComponentMessage', sender: bot, originallyDecidedByAI: true }))
        .text,
    ).toMatch(/handed this chat to an operator/);
    expect(
      toRow(node({ __typename: 'SystemLivechatOpenedByComponentMessage', sender: bot, originallyDecidedByAI: false }))
        .text,
    ).toMatch(/opened for an operator/);
  });
  it('a typename this build has never heard of is a muted row of the right direction', () => {
    expect(toRow(node({ __typename: 'InstagramInImageMessage', text: undefined }))).toMatchObject({
      kind: 'in',
      supported: false,
      text: '',
    });
    expect(toRow(node({ __typename: 'SystemLivechatOpenedByBooking', sender: bot, text: undefined }))).toMatchObject({
      kind: 'system',
      systemKind: 'other',
      supported: false,
    });
    expect(toRow(node({ __typename: 'SomethingTheSchemaGrewLater', sender: bot, text: undefined }))).toMatchObject({
      kind: 'out',
      supported: false,
    });
  });
});
