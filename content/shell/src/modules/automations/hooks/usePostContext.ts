import { useMemo } from 'react';
import type { CommentPreview } from '../lib/preview';
import { pickPost, watchedPostIds } from '../lib/preview';
import type { SettingInfo } from '../types';
import { useFacebookPosts } from './useFacebookPosts';
import { useMediaLookup } from './useMediaLookup';

export interface PostContext {
  /** The post the test comment is left on; null when the automation watches every post. */
  postId: string | null;
  /** Its text — Instagram's caption, Facebook's message. Empty when unknown. */
  text: string;
  imageUrl: string | null;
  loading: boolean;
}

/** How deep the Facebook page's posts are read to find the picked one — the dashboard's number. */
const FACEBOOK_POSTS_DEPTH = 100;

/**
 * The post a test comment is left on: one of the posts the automation watches,
 * drawn at random per attempt as the dashboard does, and its text and picture
 * read through the pickers' own reads (`useMediaLookup` for Instagram, the
 * page's posts for Facebook). An automation that watches every post gets no
 * post — the panel draws a placeholder and sends empty text.
 *
 * Only the text reaches the server: the server makes a throwaway post of its
 * own carrying it, so the picture is for the person, not for the AI.
 */
export function usePostContext(
  preview: CommentPreview | null,
  settings: readonly SettingInfo[] | null,
  attempt: number,
): PostContext {
  const platform = preview?.platform ?? null;
  const ids = useMemo(() => (platform && settings ? watchedPostIds(settings, platform) : []), [platform, settings]);
  const idsKey = ids.join(' ');
  // A fresh draw per attempt; the same one for the life of an attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const postId = useMemo(() => pickPost(ids), [idsKey, attempt]);

  const instagram = useMediaLookup(platform === 'instagram' && postId ? [postId] : []);
  const facebook = useFacebookPosts({
    enabled: platform === 'facebook' && postId !== null,
    pageSize: FACEBOOK_POSTS_DEPTH,
  });

  if (!postId) return { postId: null, text: '', imageUrl: null, loading: false };
  if (platform === 'instagram') {
    const media = instagram.byId[postId];
    return {
      postId,
      text: media?.caption ?? '',
      imageUrl: media?.thumbnailUrl ?? null,
      loading: media === undefined && instagram.loading,
    };
  }
  const post = facebook.nodes.find((node) => node.id === postId);
  return {
    postId,
    text: post?.message ?? '',
    imageUrl: post?.image?.url ?? null,
    loading: !post && facebook.loading,
  };
}
