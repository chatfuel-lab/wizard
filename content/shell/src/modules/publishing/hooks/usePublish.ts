import { useCallback, useRef } from 'react';
import {
  InstagramLibraryDocument,
  InstagramPublishCarouselDocument,
  InstagramPublishImageDocument,
  InstagramPublishReelDocument,
  InstagramPublishStoryDocument,
  InstagramRefetchMediasDocument,
} from '~api/generated/publishing/graphql';
import { usePublishing } from '../PublishingContext';
import { usePostsQueue } from '../PublishingQueueContext';
import { CONFIRM_TICK_MS, PUBLISH_TIMEOUT_MS, REFETCH_COUNT } from '../lib/constants';
import { errorMessage } from '../lib/errors';
import { publishInput, type PublishPlan } from '../lib/publishInput';
import { confirmPublish, isDomainRefusal, type MediaSummary } from '../lib/publishConfirm';
import type { ApiClient, QueuedPost } from '../types';

/**
 * Sending a post to the platform, and knowing afterwards whether it went.
 *
 * Three things here are not obvious and each is a bug somewhere else:
 *
 * 1. **The timeout is per request.** `instagramAccountPublishReel` sits inside
 *    the mutation while the platform transcodes, up to five minutes, and the
 *    client's own default is tuned for the several hundred operations that
 *    answer in a second. Without the third argument below, every Reel publish
 *    dies at thirty seconds having already started.
 * 2. **A failed call is not a failed publish.** Losing the connection to a
 *    mutation that has already done its work is indistinguishable, from here,
 *    from one that never ran. So a transport failure is not reported until the
 *    account has been asked whether the post is on it — see `publishConfirm`.
 * 3. **A successful publish is not visible until the account is refetched.**
 *    Media published through this API does not appear in the media connection,
 *    and no event fires, until `instagramAccountRefetchLatestMedias` has run.
 *    That refetch is NOT fired from here: this hook writes the published id into
 *    the store, and the library — which is the surface that has to show it —
 *    watches for ids the connection does not yet hold and refreshes itself. Two
 *    refetches racing cost several seconds each and change nothing.
 *
 *    The refetch inside the confirmation below is a different thing on a
 *    different trigger: it runs only when a call died, and it is what turns "the
 *    request never came back" into "it landed after all".
 */

export type PublishResult = { ok: true; mediaId: string; permalink: string } | { ok: false; message: string };

export interface PublishApi {
  publish: (post: QueuedPost) => Promise<PublishResult>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function runPlan(
  client: ApiClient,
  botId: string,
  plan: PublishPlan,
): Promise<{ id: string; permalink: string }> {
  /* The one reason per-request timeouts exist. */
  const options = { timeoutMs: PUBLISH_TIMEOUT_MS };
  const variables = { botID: botId };
  switch (plan.kind) {
    case 'post': {
      const data = await client.mutate(InstagramPublishImageDocument, { ...variables, input: plan.input }, options);
      return data.instagramAccountPublishImage;
    }
    case 'reel': {
      const data = await client.mutate(InstagramPublishReelDocument, { ...variables, input: plan.input }, options);
      return data.instagramAccountPublishReel;
    }
    case 'story': {
      const data = await client.mutate(InstagramPublishStoryDocument, { ...variables, input: plan.input }, options);
      return data.instagramAccountPublishStory;
    }
    case 'carousel': {
      const data = await client.mutate(InstagramPublishCarouselDocument, { ...variables, input: plan.input }, options);
      return data.instagramAccountPublishCarousel;
    }
  }
}

/** The newest media on the account, in the terms the confirmation needs. */
async function readMedia(client: ApiClient, botId: string): Promise<MediaSummary[]> {
  const data = await client.query(InstagramLibraryDocument, { botID: botId, first: REFETCH_COUNT, after: null });
  return data.bot.instagramMediasConnection.edges.map((edge) => ({
    id: edge.node.id,
    __typename: edge.node.__typename,
    caption: edge.node.caption ?? null,
    url: edge.node.url,
  }));
}

export function usePublish(accountId: string | null): PublishApi {
  const { client, botId } = usePublishing();
  const queue = usePostsQueue();
  /* The queue's methods change identity whenever its backend or state does, and
     a publish that started before a re-render must go on driving the current
     store rather than the one it captured. */
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const publish = useCallback(
    async (post: QueuedPost): Promise<PublishResult> => {
      const startedAt = Date.now();
      queueRef.current.dispatch({ type: 'publishStarted', id: post.id, now: new Date(startedAt).toISOString() });

      /* Whatever the outcome, the store is told and the backend is written. A
         backend that refuses the write is not allowed to turn a publish that
         worked into one that failed — the post is on the account either way,
         and reporting otherwise is how the same thing gets posted twice. */
      const settle = async (result: PublishResult): Promise<PublishResult> => {
        const now = new Date().toISOString();
        if (result.ok) {
          queueRef.current.dispatch({
            type: 'publishSucceeded',
            id: post.id,
            mediaId: result.mediaId,
            permalink: result.permalink,
            now,
          });
          try {
            await queueRef.current.patch(post.id, {
              status: 'published',
              mediaId: result.mediaId,
              permalink: result.permalink,
              error: null,
            });
          } catch {
            /* Kept out of the result on purpose: see above. */
          }
        } else {
          queueRef.current.dispatch({ type: 'publishFailed', id: post.id, message: result.message, now });
          try {
            await queueRef.current.patch(post.id, {
              status: 'failed',
              error: result.message,
              attempts: post.attempts + 1,
            });
          } catch {
            /* The store already carries the failure; the copy on disk can lag. */
          }
        }
        return result;
      };

      /* Read before publishing. One cheap request, and the only thing that makes
         the diff afterwards mean anything: without it every post already on the
         account looks new. */
      let before: Set<string>;
      try {
        before = new Set((await readMedia(client, botId)).map((media) => media.id));
      } catch {
        before = new Set();
      }

      let plan: PublishPlan;
      try {
        plan = publishInput(post);
      } catch (err) {
        return settle({ ok: false, message: errorMessage(err) });
      }

      try {
        const published = await runPlan(client, botId, plan);
        /* The id goes into the store and stops there: the library refreshes
           itself off exactly that, and a second refetch from here would race it
           for no gain. */
        return await settle({ ok: true, mediaId: published.id, permalink: published.permalink });
      } catch (err) {
        const message = errorMessage(err);
        /* A refusal the server sent back is a decision taken before anything was
           posted, so it is reported straight away and a retry is safe. */
        if (isDomainRefusal(err)) return settle({ ok: false, message });

        for (;;) {
          await refetchAccount(client, accountId);
          let after: MediaSummary[] = [];
          try {
            after = await readMedia(client, botId);
          } catch {
            /* The account is unreachable too; the window decides. */
          }
          const decision = confirmPublish({
            kind: post.kind,
            caption: post.caption,
            before,
            after,
            startedAt,
            now: Date.now(),
          });
          if (decision.state === 'confirmed') {
            return settle({ ok: true, mediaId: decision.mediaId, permalink: decision.permalink });
          }
          if (decision.state === 'failed') return settle({ ok: false, message });
          await sleep(CONFIRM_TICK_MS);
        }
      }
    },
    [client, botId, accountId],
  );

  return { publish };
}

/**
 * Pull the newest media down from the platform, so the connection can be read
 * for what a dead publish may have left behind.
 *
 * Best effort: failing to refresh is never a reason to report a publish as
 * failed, and the confirmation window decides either way.
 */
async function refetchAccount(client: ApiClient, accountId: string | null): Promise<void> {
  if (!accountId) return;
  try {
    await client.mutate(InstagramRefetchMediasDocument, { accountID: accountId, count: REFETCH_COUNT });
  } catch {
    /* Nothing to do about it here. */
  }
}
