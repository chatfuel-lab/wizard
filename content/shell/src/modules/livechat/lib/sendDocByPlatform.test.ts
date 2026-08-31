import { describe, expect, it } from 'vitest';
import { getDocMeta, type TypedDoc } from '~api';
import { Platform } from '~api/generated/livechat/graphql';
import { SEND_ATTACHMENT_BY_PLATFORM, SEND_TEXT_BY_PLATFORM } from './sendDocByPlatform';

/**
 * A table of ten near-identical documents keyed by an enum is exactly the shape
 * a copy-paste error hides in: every entry type-checks against every other,
 * because the variables were widened to one shape on purpose. The name is the
 * only thing that differs, so the name is what this asserts.
 */
const nameOf = <TVars>(doc: TypedDoc<unknown, TVars>) => getDocMeta(doc).name;

describe('SEND_TEXT_BY_PLATFORM', () => {
  it('sends each platform its own text document', () => {
    expect(nameOf(SEND_TEXT_BY_PLATFORM[Platform.Widget])).toBe('SendWidgetText');
    expect(nameOf(SEND_TEXT_BY_PLATFORM[Platform.Whatsapp])).toBe('SendWhatsAppText');
    expect(nameOf(SEND_TEXT_BY_PLATFORM[Platform.Instagram])).toBe('SendInstagramText');
    expect(nameOf(SEND_TEXT_BY_PLATFORM[Platform.Facebook])).toBe('SendFacebookText');
    expect(nameOf(SEND_TEXT_BY_PLATFORM[Platform.Tiktok])).toBe('SendTikTokText');
  });
});

describe('SEND_ATTACHMENT_BY_PLATFORM', () => {
  it('sends each platform its own attachment document', () => {
    expect(nameOf(SEND_ATTACHMENT_BY_PLATFORM[Platform.Widget])).toBe('SendWidgetAttachment');
    expect(nameOf(SEND_ATTACHMENT_BY_PLATFORM[Platform.Whatsapp])).toBe('SendWhatsAppAttachment');
    expect(nameOf(SEND_ATTACHMENT_BY_PLATFORM[Platform.Instagram])).toBe('SendInstagramAttachment');
    expect(nameOf(SEND_ATTACHMENT_BY_PLATFORM[Platform.Facebook])).toBe('SendFacebookAttachment');
    expect(nameOf(SEND_ATTACHMENT_BY_PLATFORM[Platform.Tiktok])).toBe('SendTikTokAttachment');
  });

  it('never reuses one document for two platforms', () => {
    const names = Object.values(SEND_ATTACHMENT_BY_PLATFORM).map(nameOf);
    expect(new Set(names).size).toBe(names.length);
  });
});
