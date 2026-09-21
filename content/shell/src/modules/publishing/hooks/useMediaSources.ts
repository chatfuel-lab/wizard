import { useCallback, useEffect, useRef, useState } from 'react';
import { FileStatus, InstagramFileDocument } from '~api/generated/publishing/graphql';
import {
  DURABLE_IMAGE_TYPES,
  DURABLE_MEDIA_MAX_BYTES,
  DURABLE_VIDEO_TYPES,
  UPLOAD_POLL_INTERVAL_MS,
  UPLOAD_POLL_TIMEOUT_MS,
} from '../lib/constants';
import { acceptsOf } from '../lib/composerDraft';
import { errorMessage } from '../lib/errors';
import { uploadDurableMedia } from '../lib/queue/proxy';
import { newClientId } from '~api';
import type { ApiClient, MediaItem, PostKind } from '../types';

/**
 * Files, turned into something publishable.
 *
 * The publish mutations take a URL the platform's own servers can fetch, not a
 * file id, so an upload is only half the job: the REST endpoint answers with an
 * id, and `file(id)` turns that id into an address once the bytes have finished
 * landing. Until then the file's status is `DownloadInProgress` and its URL is
 * not worth reading, which is why this polls rather than reading once.
 *
 * Two URLs come out of it and they are deliberately different things. `url` is
 * what is published — public, and the same string for everybody. `previewUrl` is
 * what this tab draws, which is the local file itself: it appears instantly,
 * costs no round trip, and exists in exactly one browser. Publishing the second
 * one would send the platform an address that resolves nowhere.
 *
 * And there are two places the bytes can go. The platform's file store is the
 * default, and its address expires within hours — right for a post going out
 * now. A post with a time on it needs the address to still resolve when the
 * time comes, so with `durable` set the file goes to the deployment's own
 * bucket through the proxy instead, and comes back marked as the kind of upload
 * a schedule may carry.
 */

export interface MediaSources {
  /** False on a host with no upload path at all; the drop zone is then not offered. */
  canUpload: boolean;
  /** True while files go to the deployment's own bucket, which takes fewer kinds of them. */
  durable: boolean;
  busy: boolean;
  /** Why the last attempt failed, in the platform's own words. */
  error: string | null;
  dismiss: () => void;
  /** Files the operator chose, in the order they were chosen. */
  add: (files: readonly File[], kind: PostKind) => Promise<MediaItem[]>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const typeOf = (file: File): MediaItem['type'] | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

/**
 * Wait for a file to have an address.
 *
 * `Downloaded` is the only status with a URL worth publishing. `NotDownloaded`
 * and `DownloadInProgress` are both "not yet" — the first is the moment before
 * anything has picked the file up — and everything else is a file that will
 * never arrive.
 */
async function resolveFileUrl(client: ApiClient, fileId: string, deadline: number): Promise<string> {
  for (;;) {
    const data = await client.query(InstagramFileDocument, { id: fileId });
    const file = data.file;
    if (file.status === FileStatus.Downloaded && file.url) return file.url;
    if (file.status !== FileStatus.DownloadInProgress && file.status !== FileStatus.NotDownloaded) {
      throw new Error('That file could not be stored.');
    }
    if (Date.now() >= deadline) throw new Error('That file is taking too long to store.');
    await sleep(UPLOAD_POLL_INTERVAL_MS);
  }
}

/**
 * Why the deployment's own bucket would refuse this file, or null when it would not.
 *
 * Asked before a byte is sent. The proxy enforces the same two limits and is the
 * authority on them — but its answer to a 40 MB video arrives after 40 MB has
 * gone up, and its answer to a HEIC is a 415 that reads like something broke.
 * The picker's `accept` already narrows to these types; a file that was dragged
 * in never saw the picker.
 */
export function durableProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!DURABLE_IMAGE_TYPES.includes(file.type) && !DURABLE_VIDEO_TYPES.includes(file.type)) {
    return 'A scheduled post takes a JPEG, PNG or WebP photo, or an MP4 or MOV video. Convert this file, or publish the post now instead.';
  }
  if (file.size > DURABLE_MEDIA_MAX_BYTES) {
    const mb = (bytes: number): string => `${Math.ceil(bytes / (1024 * 1024))} MB`;
    return `A scheduled post takes a file up to ${mb(DURABLE_MEDIA_MAX_BYTES)}, and this one is ${mb(file.size)}.`;
  }
  return null;
}

/** What storing a file leaves behind: an address, and where that address lives. */
export type StoredFile = Pick<MediaItem, 'url' | 'source' | 'fileId' | 'storageKey'>;

/**
 * Put one file somewhere it can be published from.
 *
 * `durable` asks for the deployment's own bucket, and gets it only where the
 * host can reach the proxy's routes; anywhere else this is the platform's file
 * store, and the item comes back marked as the kind a schedule refuses.
 */
export async function storeFile(
  client: ApiClient,
  botId: string,
  file: File,
  type: MediaItem['type'],
  durable: boolean,
): Promise<StoredFile> {
  if (durable && client.proxyFetch) {
    const problem = durableProblem(file);
    if (problem) throw new Error(problem);
    const kept = await uploadDurableMedia(client.proxyFetch, botId, file);
    return { url: kept.url, source: 'durable', storageKey: kept.key };
  }
  if (!client.uploadFile) throw new Error('This app has nowhere to upload a file to.');
  const uploaded = await client.uploadFile(botId, file, type === 'video' ? 'Video' : 'Image');
  const url = await resolveFileUrl(client, uploaded.id, Date.now() + UPLOAD_POLL_TIMEOUT_MS);
  return { url, source: 'upload', fileId: uploaded.id };
}

export function useMediaSources(client: ApiClient, botId: string, durable = false): MediaSources {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Local preview URLs belong to this tab and leak until they are released. */
  const objectUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current = [];
    },
    [],
  );

  const dismiss = useCallback(() => setError(null), []);
  const canUpload = Boolean(client.uploadFile) || (durable && Boolean(client.proxyFetch));

  const add = useCallback(
    async (files: readonly File[], kind: PostKind): Promise<MediaItem[]> => {
      if (!canUpload || files.length === 0) return [];
      const accepts = acceptsOf(kind);
      setBusy(true);
      setError(null);
      const made: MediaItem[] = [];
      try {
        for (const file of files) {
          const type = typeOf(file);
          if (!type || !accepts.includes(type)) {
            throw new Error(kind === 'reel' ? 'A reel needs a video.' : 'That file is not a photo or a video.');
          }
          const stored = await storeFile(client, botId, file, type, durable);
          let previewUrl = stored.url;
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            previewUrl = URL.createObjectURL(file);
            objectUrls.current.push(previewUrl);
          }
          made.push({ id: newClientId(), type, ...stored, previewUrl });
        }
        return made;
      } catch (err) {
        setError(errorMessage(err));
        /* Whatever did land is kept: losing three good uploads because the
           fourth failed is the behaviour every file tray gets wrong. */
        return made;
      } finally {
        setBusy(false);
      }
    },
    [client, botId, durable, canUpload],
  );

  return { canUpload, durable: durable && Boolean(client.proxyFetch), busy, error, dismiss, add };
}
