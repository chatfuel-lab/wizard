import { describe, expect, it } from 'vitest';
import { FileStatus } from '~api/generated/publishing/graphql';
import { storeFile } from './useMediaSources';
import type { ApiClient } from '../types';

/**
 * The bug this pins: a scheduled post could never carry an upload.
 *
 * Every file the composer took went to the platform's file store, whose address
 * expires within hours, and the schedule rightly refuses one of those. The
 * deployment's own bucket existed for exactly this and nothing in the app ever
 * sent a file to it — so the refusal was the only outcome there was.
 */
const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'photo.jpg', { type: 'image/jpeg' });

const clientWith = (parts: Partial<ApiClient>): ApiClient => parts as ApiClient;

const platform: Partial<ApiClient> = {
  uploadFile: async () => ({ id: 'file-1' }) as Awaited<ReturnType<NonNullable<ApiClient['uploadFile']>>>,
  query: (async () => ({
    file: { status: FileStatus.Downloaded, url: 'https://files.example.com/file-1.jpg' },
  })) as unknown as ApiClient['query'],
};

const bucket: Partial<ApiClient> = {
  proxyFetch: async () => new Response('{"url":"https://x.supabase.co/o/bot-1/a.jpg","key":"bot-1/a.jpg"}'),
};

describe('storeFile', () => {
  it('sends a file for a post that waits to the deployment’s own bucket', async () => {
    const stored = await storeFile(clientWith({ ...platform, ...bucket }), 'bot-1', file, 'image', true);
    expect(stored).toEqual({
      url: 'https://x.supabase.co/o/bot-1/a.jpg',
      source: 'durable',
      storageKey: 'bot-1/a.jpg',
    });
  });

  it('sends a file for a post going out now to the platform, as it always did', async () => {
    const stored = await storeFile(clientWith({ ...platform, ...bucket }), 'bot-1', file, 'image', false);
    expect(stored).toEqual({ url: 'https://files.example.com/file-1.jpg', source: 'upload', fileId: 'file-1' });
  });

  it('falls back to the platform on a host with no proxy routes to reach', async () => {
    const stored = await storeFile(clientWith(platform), 'bot-1', file, 'image', true);
    // Marked as what it is, so the schedule refuses it rather than losing it.
    expect(stored.source).toBe('upload');
  });
});
