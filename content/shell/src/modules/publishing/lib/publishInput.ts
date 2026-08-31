/**
 * A post in this app's shape, turned into the input one of four mutations takes.
 *
 * Four mutations, four input shapes, and only one of them takes a list — which
 * is exactly the kind of mapping that goes wrong quietly. A Story's input has no
 * caption field at all, a Reel's has three settings nothing else has, and a
 * carousel's items name their own media type. Getting one of those wrong is a
 * post that publishes without its caption, and nothing anywhere reports it.
 *
 * Every URL here has to be reachable by the platform's own servers: it fetches
 * the bytes itself, so a `blob:` that exists in one browser tab is not a
 * publishable address. That is why `MediaItem` keeps `url` and `previewUrl`
 * apart, and why only `url` is ever read below.
 */
import {
  InstagramCarouselItemMediaType,
  InstagramStoryMediaType,
  type InstagramPublishCarouselInput,
  type InstagramPublishImageInput,
  type InstagramPublishReelInput,
  type InstagramPublishStoryInput,
} from '~api/generated/publishing/graphql';
import type { MediaItem, NewPost, PostKind } from '../types';

/** What to send, and which mutation to send it to. */
export type PublishPlan =
  | { kind: 'post'; input: InstagramPublishImageInput }
  | { kind: 'reel'; input: InstagramPublishReelInput }
  | { kind: 'story'; input: InstagramPublishStoryInput }
  | { kind: 'carousel'; input: InstagramPublishCarouselInput };

export type PublishSource = Pick<NewPost, 'kind' | 'caption' | 'media' | 'reel'>;

/**
 * The caption as the API wants it: the text, or an explicit nothing.
 *
 * Not trimmed. A caption's own line breaks and spacing are what somebody wrote
 * and they survive to the post; only a caption that is nothing BUT whitespace
 * becomes null, because an empty caption and no caption are the same post.
 */
const captionOf = (caption: string): string | null => (caption.trim() ? caption : null);

const firstOf = (media: readonly MediaItem[], kind: PostKind): MediaItem => {
  const item = media[0];
  if (!item || !item.url.trim()) {
    throw new Error(`This ${kind} has nothing to publish yet.`);
  }
  return item;
};

export function publishInput(post: PublishSource): PublishPlan {
  switch (post.kind) {
    case 'post': {
      const item = firstOf(post.media, 'post');
      return { kind: 'post', input: { imageURL: item.url, caption: captionOf(post.caption) } };
    }

    case 'reel': {
      const item = firstOf(post.media, 'reel');
      const options = post.reel ?? {};
      const input: InstagramPublishReelInput = { videoURL: item.url, caption: captionOf(post.caption) };
      /* Written only when set. `coverURL` and `thumbOffset` are two ways to ask
         for the same picture and the platform takes the cover when both are
         there, so sending an empty one would quietly beat a chosen frame. */
      if (options.coverURL && options.coverURL.trim()) input.coverURL = options.coverURL.trim();
      if (options.shareToFeed !== undefined) input.shareToFeed = options.shareToFeed;
      if (options.thumbOffset !== undefined) input.thumbOffset = Math.max(0, Math.round(options.thumbOffset));
      return { kind: 'reel', input };
    }

    case 'story': {
      const item = firstOf(post.media, 'story');
      /* No caption field on this input, and none is invented: a story that
         carried one would be a story the composer should not have offered. */
      return {
        kind: 'story',
        input: {
          mediaURL: item.url,
          mediaType: item.type === 'video' ? InstagramStoryMediaType.Video : InstagramStoryMediaType.Image,
        },
      };
    }

    case 'carousel': {
      const items = post.media.filter((item) => item.url.trim());
      if (items.length === 0) throw new Error('This carousel has nothing to publish yet.');
      return {
        kind: 'carousel',
        input: {
          caption: captionOf(post.caption),
          items: items.map((item) => ({
            mediaURL: item.url,
            mediaType:
              item.type === 'video' ? InstagramCarouselItemMediaType.Video : InstagramCarouselItemMediaType.Image,
          })),
        },
      };
    }
  }
}
