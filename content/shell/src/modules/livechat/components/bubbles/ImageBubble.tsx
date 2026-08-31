import { useState } from 'react';
import { AttachmentTile } from '~ui';

export interface ImageBubbleProps {
  /** Null when the file is gone: `FileStatus.Expired`, or never sent. */
  url: string | null;
  caption: string | null;
  /** "Photo" — the kinds-table label, shown when the picture cannot be. */
  label: string;
}

/**
 * The picture, or a tile saying why not.
 *
 * Chat media expires. Chatfuel's file storage marks a file `Expired` — "deleted
 * because it expired, or never existed" — while still handing back a perfectly
 * well-formed URL, and the CDN behind a live URL can 403 an hour later. Both
 * end at the same place: an `<img>` that renders the browser's broken-image
 * glyph inside the bubble, with no text anywhere saying a photo was ever sent.
 *
 * `AttachmentTile` is `~ui`'s answer to exactly this and its failed state was
 * built for it: keep the tile in place, keep its name, offer a retry. The retry
 * is worth having because the common cause is a signed URL that the page has
 * simply held too long, and one reload fixes it.
 */
export function ImageBubble({ url, caption, label }: ImageBubbleProps) {
  /* Bumped by the retry: React reuses an <img> across renders and re-assigning
     the same src does not re-request it, so the key is what forces the fetch. */
  const [attempt, setAttempt] = useState(0);
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <AttachmentTile
        kind="image"
        name={caption ?? label}
        state="failed"
        error={url ? `${label} did not load` : `${label} expired`}
        onRetry={
          url
            ? () => {
                setBroken(false);
                setAttempt((n) => n + 1);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <img
        key={attempt}
        src={url}
        alt={caption ?? label}
        onError={() => setBroken(true)}
        className="max-h-64 rounded-card object-contain"
      />
      {caption ? <div className="mt-1 whitespace-pre-wrap">{caption}</div> : null}
    </div>
  );
}
