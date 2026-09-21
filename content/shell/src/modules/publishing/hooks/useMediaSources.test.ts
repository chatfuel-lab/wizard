import { describe, expect, it } from 'vitest';
import { FileStatus } from '~api/generated/publishing/graphql';
import { durableProblem, storeFile } from './useMediaSources';
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

describe('durableProblem', () => {
  const MB = 1024 * 1024;

  it('takes the five kinds the bucket takes', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']) {
      expect(durableProblem({ type, size: MB })).toBeNull();
    }
  });

  it('refuses a HEIC, which is what a phone hands over and `image/*` lets through', () => {
    expect(durableProblem({ type: 'image/heic', size: MB })).toMatch(/JPEG, PNG or WebP/);
    // A file the browser could not type at all is not one of the five either.
    expect(durableProblem({ type: '', size: MB })).not.toBeNull();
  });

  it('refuses a file past the ceiling and says both numbers', () => {
    expect(durableProblem({ type: 'video/mp4', size: 25 * MB })).toBeNull();
    expect(durableProblem({ type: 'video/mp4', size: 40 * MB })).toMatch(/up to 25 MB, and this one is 40 MB/);
  });
});

describe('storeFile, refusing before anything is sent', () => {
  const counting = (): { client: ApiClient; calls: () => number } => {
    let calls = 0;
    const client = clientWith({
      ...platform,
      proxyFetch: async () => {
        calls += 1;
        return new Response('{"url":"https://x.supabase.co/o/a.jpg","key":"bot-1/a.jpg"}');
      },
    });
    return { client, calls: () => calls };
  };

  it('does not upload a video the bucket would answer 413 to', async () => {
    const { client, calls } = counting();
    const big = new File([new Uint8Array(1)], 'reel.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 40 * 1024 * 1024 });
    await expect(storeFile(client, 'bot-1', big, 'video', true)).rejects.toThrow(/up to 25 MB/);
    expect(calls()).toBe(0);
  });

  it('does not upload a HEIC the bucket would answer 415 to', async () => {
    const { client, calls } = counting();
    const heic = new File([new Uint8Array(1)], 'IMG_0001.HEIC', { type: 'image/heic' });
    await expect(storeFile(client, 'bot-1', heic, 'image', true)).rejects.toThrow(/JPEG, PNG or WebP/);
    expect(calls()).toBe(0);
  });

  it('leaves a post going out now alone — the platform has its own limits, and they are not these', async () => {
    const { client } = counting();
    const heic = new File([new Uint8Array(1)], 'IMG_0001.HEIC', { type: 'image/heic' });
    await expect(storeFile(client, 'bot-1', heic, 'image', false)).resolves.toMatchObject({ source: 'upload' });
  });
});
