import { describe, expect, it } from 'vitest';
import { getDocMeta } from '~api';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { PreviewMessageNode } from '../types';
import { parsePreviewPlatform, platformOfScope, sendDocumentFor, targetKey, toRow } from './preview';

/* The row model, the merge, the watermark and the session reducer are `~ui`'s
   `lib/testChat` and are tested there. What is left here is what this module
   alone owns: which document sends where, and the typename switch. */

const contact = { __typename: 'ContactMessageSender', id: 'c', name: 'You (test)' } as const;
const mia = { __typename: 'AutomationMessageSender', id: 'a', name: 'Mia' } as const;

const node = (over: Record<string, unknown>): PreviewMessageNode =>
  ({
    __typename: 'WhatsAppInTextMessage',
    id: 'm1',
    clientId: 'c1',
    sentTime: '2026-08-17T10:00:00.000Z',
    updatedAt: '2026-08-17T10:00:00.000Z',
    sender: contact,
    errors: [],
    text: 'hi',
    ...over,
  }) as unknown as PreviewMessageNode;

describe('platform → send document', () => {
  it('picks the generated document and its result key per platform', () => {
    expect(getDocMeta(sendDocumentFor('whatsapp').document as never).name).toBe('AutomationsPreviewWhatsAppTextSend');
    expect(sendDocumentFor('whatsapp').resultKey).toBe('previewResponsesWhatsappTextSend');
    expect(getDocMeta(sendDocumentFor('widget').document as never).name).toBe('AutomationsPreviewWidgetTextSend');
    expect(getDocMeta(sendDocumentFor('instagram').document as never).name).toBe('AutomationsPreviewInstagramTextSend');
    expect(getDocMeta(sendDocumentFor('tiktok').document as never).name).toBe('AutomationsPreviewTikTokTextSend');
    expect(sendDocumentFor('tiktok').resultKey).toBe('previewResponsesTikTokTextSend');
    expect(getDocMeta(sendDocumentFor('facebook').document as never).name).toBe('AutomationsPreviewFacebookTextSend');
  });
  it('maps a scope to its preview platform; All has none', () => {
    expect(platformOfScope(FuelyAutomationScope.InstagramPostComments)).toBe('instagram');
    expect(platformOfScope(FuelyAutomationScope.WhatsAppDirectMessages)).toBe('whatsapp');
    expect(platformOfScope(FuelyAutomationScope.WebWidgetDirectMessage)).toBe('widget');
    expect(platformOfScope(FuelyAutomationScope.TikTokClickFromAds)).toBe('tiktok');
    expect(platformOfScope(FuelyAutomationScope.FacebookMMeLinks)).toBe('facebook');
    expect(platformOfScope(FuelyAutomationScope.All)).toBeNull();
  });
  it('parses the wire platform and refuses the unknown', () => {
    expect(parsePreviewPlatform('whatsapp')).toBe('whatsapp');
    expect(parsePreviewPlatform('threads')).toBeNull();
    expect(parsePreviewPlatform(null)).toBeNull();
  });
  it('targetKey names the automation, empty for none', () => {
    expect(targetKey({ kind: 'automation', id: 'a' })).toBe('automation:a');
    expect(targetKey(null)).toBe('');
  });
});

describe('row model', () => {
  it('maps text In/Out by typename, the widget by sender', () => {
    expect(toRow(node({}))).toMatchObject({
      kind: 'in',
      key: 'c1',
      id: 'm1',
      text: 'hi',
      fromBot: false,
      senderLabel: 'You (test)',
      supported: true,
    });
    expect(toRow(node({ __typename: 'InstagramOutTextMessage', sender: mia }))).toMatchObject({
      kind: 'out',
      fromBot: true,
      senderLabel: 'Mia',
    });
    expect(toRow(node({ __typename: 'WebWidgetTextMessage', sender: mia }))).toMatchObject({ kind: 'out' });
    expect(toRow(node({ __typename: 'WebWidgetTextMessage', sender: contact }))).toMatchObject({ kind: 'in' });
    expect(toRow(node({ __typename: 'TikTokInTextMessage' }))).toMatchObject({ kind: 'in' });
    expect(toRow(node({ __typename: 'FacebookOutTextMessage', sender: mia }))).toMatchObject({ kind: 'out' });
  });
  it('maps the system trio and the typing hint', () => {
    expect(
      toRow(node({ __typename: 'SystemTypingMessage', sender: mia, until: '2026-08-17T10:00:05.000Z' })),
    ).toMatchObject({ kind: 'typing', until: '2026-08-17T10:00:05.000Z' });
    expect(
      toRow(node({ __typename: 'SystemConversationSummaryMessage', sender: mia, summary: 'asked for a human' })),
    ).toMatchObject({ kind: 'system', systemKind: 'summary', text: 'asked for a human' });
    const handoff = toRow(
      node({ __typename: 'SystemLivechatOpenedByComponentMessage', sender: mia, originallyDecidedByAI: true }),
    );
    expect(handoff).toMatchObject({ kind: 'system', systemKind: 'handoff' });
    expect(handoff.text).toMatch(/handed this chat to an operator/);
  });
  it('never throws on a typename it does not know — a muted row instead', () => {
    expect(toRow(node({ __typename: 'InstagramInImageMessage', text: undefined }))).toMatchObject({
      kind: 'in',
      supported: false,
      text: '',
    });
    expect(toRow(node({ __typename: 'WhatsAppOutTemplateMessage', sender: mia, text: undefined }))).toMatchObject({
      kind: 'out',
      supported: false,
    });
    expect(toRow(node({ __typename: 'SystemLivechatOpenedByBooking', sender: mia, text: undefined }))).toMatchObject({
      kind: 'system',
      systemKind: 'other',
      supported: false,
    });
    expect(toRow(node({ __typename: 'SomethingNew', sender: mia, text: undefined }))).toMatchObject({
      supported: false,
    });
  });
  it('keys by clientId, then id, then a synthetic; a null id is not a key', () => {
    expect(toRow(node({ id: null })).key).toBe('c1');
    expect(toRow(node({ clientId: null })).key).toBe('m1');
    const a = toRow(node({ id: null, clientId: null }));
    const b = toRow(node({ id: null, clientId: null }));
    expect(a.key).not.toBe(b.key);
    expect(a.id).toBeNull();
  });
  it('a bad sentTime sorts first rather than throwing', () => {
    expect(toRow(node({ sentTime: 'garbage' })).at).toBe(0);
  });
});
