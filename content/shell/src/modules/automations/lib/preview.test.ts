import { describe, expect, it } from 'vitest';
import { getDocMeta } from '~api';
import { FuelyAutomationScope, FuelySettingPrivateReplyHowToReply } from '~api/generated/automations/graphql';
import type { PreviewMessageNode, SettingInfo } from '../types';
import {
  COMMENT_PREVIEWS,
  commentPreviewFor,
  parsePreviewPlatform,
  pickPost,
  readCommentNodes,
  sendsDirectMessage,
  watchedPostIds,
  platformOfScope,
  sendDocumentFor,
  targetKey,
  toRow,
} from './preview';

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
  it('tests with a comment on Instagram posts and Facebook posts, and nowhere else', () => {
    expect([...COMMENT_PREVIEWS.keys()]).toEqual([
      FuelyAutomationScope.InstagramPostComments,
      FuelyAutomationScope.FacebookPostComments,
    ]);
    const ig = commentPreviewFor(FuelyAutomationScope.InstagramPostComments)!;
    expect(getDocMeta(ig.document as never).name).toBe('AutomationsPreviewInstagramPostCommentSend');
    expect(ig).toMatchObject({ resultKey: 'previewResponsesInstagramPostCommentSend', postField: 'postCaption' });
    const fb = commentPreviewFor(FuelyAutomationScope.FacebookPostComments)!;
    expect(getDocMeta(fb.document as never).name).toBe('AutomationsPreviewFacebookPostCommentSend');
    expect(fb).toMatchObject({ resultKey: 'previewResponsesFacebookPostCommentSend', postField: 'postMessage' });
    expect(commentPreviewFor(FuelyAutomationScope.InstagramAdComments)).toBeNull();
    expect(commentPreviewFor(FuelyAutomationScope.FacebookDirectMessages)).toBeNull();
    expect(commentPreviewFor(undefined)).toBeNull();
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

  it('shows a test comment and its public reply as text rows', () => {
    expect(toRow(node({ __typename: 'FacebookInPostCommentMessage', text: 'price?' }))).toMatchObject({
      kind: 'in',
      text: 'price?',
      supported: true,
    });
    expect(
      toRow(node({ __typename: 'FacebookOutPublicCommentReplyMessage', sender: mia, text: 'Sent you a DM' })),
    ).toMatchObject({ kind: 'out', text: 'Sent you a DM', supported: true });
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

describe('the comment test', () => {
  const settings = (list: Record<string, unknown>[]): SettingInfo[] => list as unknown as SettingInfo[];
  const posts = (...ids: string[]) => ({
    __typename: 'FuelySettingListOfPosts',
    posts: ids.map((postID) => ({ postID, contactScopeID: 's' })),
  });
  const stories = (...ids: string[]) => ({
    __typename: 'FuelySettingListOfStories',
    stories: ids.map((storyID) => ({ storyID, contactScopeID: 's' })),
  });

  it('comments on a watched post, and on Instagram falls back to a watched story', () => {
    expect(watchedPostIds(settings([posts('p1', 'p2'), stories('s1')]), 'instagram')).toEqual(['p1', 'p2']);
    expect(watchedPostIds(settings([posts(), stories('s1')]), 'instagram')).toEqual(['s1']);
    expect(watchedPostIds(settings([stories('s1')]), 'facebook')).toEqual([]);
    expect(watchedPostIds(settings([]), 'instagram')).toEqual([]);
  });

  it('draws one post at random, and none from an empty list', () => {
    expect(pickPost(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickPost(['a', 'b', 'c'], () => 0.99)).toBe('c');
    expect(pickPost(['a', 'b', 'c'], () => 1)).toBe('c');
    expect(pickPost([], () => 0.5)).toBeNull();
  });

  it('expects a DM unless the private reply is off', () => {
    const reply = (how: FuelySettingPrivateReplyHowToReply) =>
      settings([{ __typename: 'FuelySettingPrivateReply', privateReplyHowToReply: how }]);
    expect(sendsDirectMessage(reply(FuelySettingPrivateReplyHowToReply.UsingAi))).toBe(true);
    expect(sendsDirectMessage(reply(FuelySettingPrivateReplyHowToReply.ExactText))).toBe(true);
    expect(sendsDirectMessage(reply(FuelySettingPrivateReplyHowToReply.DontReply))).toBe(false);
    expect(sendsDirectMessage(settings([]))).toBe(false);
  });

  it('moves the comment and its public reply to the post, and leaves the DMs', () => {
    const found = readCommentNodes([
      node({
        __typename: 'InstagramInFeedCommentMessage',
        clientId: 'cmt',
        text: 'price?',
        publicReplyMessages: [
          { __typename: 'InstagramOutPublicCommentReplyMessage', id: 'r1', clientId: null, text: 'Sent you a DM' },
        ],
      }),
      node({ __typename: 'InstagramOutTextMessage', clientId: null, id: 'dm1', sender: mia, text: 'Hi! It is $20' }),
    ]);
    expect(found).toEqual({ keys: ['cmt', 'r1'], reply: 'Sent you a DM' });

    expect(
      readCommentNodes([
        node({
          __typename: 'FacebookOutPublicCommentReplyMessage',
          clientId: null,
          id: 'r2',
          sender: mia,
          text: 'Yes',
        }),
      ]),
    ).toEqual({ keys: ['r2'], reply: 'Yes' });
    expect(readCommentNodes([node({})])).toEqual({ keys: [], reply: null });
  });
});
