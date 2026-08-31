import { useEffect, useState } from 'react';
import { InstagramMediaOneDocument } from '~api/generated/publishing/graphql';
import { draftFromNode } from '../lib/composerDraft';
import { errorMessage } from '../lib/errors';
import type { ApiClient, MediaNode, NewPost } from '../types';

/**
 * A new post started from one already on the account.
 *
 * The library hands the composer a media id in the address rather than a whole
 * post, so this reads it back. One query, by id, and it answers null for an id
 * that belongs to nobody — a hand-edited address must open an empty composer
 * rather than nothing at all.
 *
 * What comes back is safe to publish again, including on a schedule: media on
 * the account is served publicly and, unlike a fresh upload, carries no
 * deletion deadline.
 */
export interface ComposerSeed {
  /** Null while it is being read, and when there was nothing usable behind the id. */
  draft: NewPost | null;
  loading: boolean;
  error: string | null;
}

/** What the hook has actually answered, and which id it answered for. */
interface Resolved {
  forId: string | null;
  draft: NewPost | null;
  error: string | null;
}

/**
 * Whether the answer in hand belongs to the id being asked about.
 *
 * This is the whole correctness of the hook, and it is a function rather than a
 * `loading` flag set inside an effect because of WHEN effects run. A flag can
 * only be raised in an effect, which is one commit after the id appeared — and
 * in that one commit `loading` reads false with no draft, which looks exactly
 * like "asked, and there was nothing". A consumer that latches on that opens a
 * blank composer and never reopens it, because by the time the media arrives it
 * has already decided.
 *
 * Derived from the props instead, it is true in the same commit the id changes.
 * There is no window.
 */
export function seedSettled(mediaId: string | null, resolvedFor: string | null): boolean {
  return mediaId === null || resolvedFor === mediaId;
}

export function useComposerSeed(
  client: ApiClient,
  botId: string,
  mediaId: string | null,
  at: string | null,
): ComposerSeed {
  const [resolved, setResolved] = useState<Resolved>({ forId: null, draft: null, error: null });

  useEffect(() => {
    if (!mediaId) return;
    let live = true;
    client
      .query(InstagramMediaOneDocument, { botID: botId, id: mediaId })
      .then((data) => {
        if (!live) return;
        /* The account hangs off a contact scope, so the media does too. */
        const scope = data.bot.contactScopes.find(
          (candidate): candidate is Extract<typeof candidate, { instagramAccount: unknown }> =>
            'instagramAccount' in candidate,
        );
        const node = (scope?.instagramAccount.media ?? null) as MediaNode | null;
        setResolved({ forId: mediaId, draft: node ? draftFromNode(node, at) : null, error: null });
      })
      .catch((err: unknown) => {
        if (!live) return;
        setResolved({ forId: mediaId, draft: null, error: errorMessage(err) });
      });
    return () => {
      live = false;
    };
  }, [client, botId, mediaId, at]);

  const settled = seedSettled(mediaId, resolved.forId);
  return {
    draft: settled ? resolved.draft : null,
    loading: !settled,
    error: settled ? resolved.error : null,
  };
}
