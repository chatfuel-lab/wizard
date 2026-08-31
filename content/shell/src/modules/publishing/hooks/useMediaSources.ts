import { useCallback, useEffect, useRef, useState } from 'react';
import { FileStatus, InstagramFileDocument } from '~api/generated/publishing/graphql';
import { UPLOAD_POLL_INTERVAL_MS, UPLOAD_POLL_TIMEOUT_MS } from '../lib/constants';
import { acceptsOf } from '../lib/composerDraft';
import { errorMessage } from '../lib/errors';
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
 */

export interface MediaSources {
  /** False on a host with no upload path at all; the drop zone is then not offered. */
  canUpload: boolean;
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

export function useMediaSources(client: ApiClient, botId: string): MediaSources {
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

  const add = useCallback(
    async (files: readonly File[], kind: PostKind): Promise<MediaItem[]> => {
      const upload = client.uploadFile;
      if (!upload || files.length === 0) return [];
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
          const uploaded = await upload(botId, file, type === 'video' ? 'Video' : 'Image');
          const url = await resolveFileUrl(client, uploaded.id, Date.now() + UPLOAD_POLL_TIMEOUT_MS);
          let previewUrl = url;
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            previewUrl = URL.createObjectURL(file);
            objectUrls.current.push(previewUrl);
          }
          made.push({ id: newClientId(), type, url, source: 'upload', fileId: uploaded.id, previewUrl });
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
    [client, botId],
  );

  return { canUpload: Boolean(client.uploadFile), busy, error, dismiss, add };
}
