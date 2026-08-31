import { useState } from 'react';
import { AttachmentTile } from '~ui';

export interface VideoBubbleProps {
  /** Null when the file is gone: `FileStatus.Expired`, or never sent. */
  url: string | null;
  caption: string | null;
  /** "Video" — the kinds-table label, shown when the clip cannot be. */
  label: string;
}

/**
 * The clip, playable in place, or a tile saying why not.
 *
 * Same contract as `ImageBubble`: a `<video>` pointed at an expired or dead
 * URL renders a black rectangle with a disabled scrubber and no words, so the
 * expired and the failed-to-load cases both fall to `AttachmentTile`'s failed
 * state, which keeps the name and offers a retry. `preload="metadata"` fetches
 * the first frame and the duration and nothing more — a thread with ten
 * videos must not download ten videos.
 */
export function VideoBubble({ url, caption, label }: VideoBubbleProps) {
  /* Bumped by the retry: React reuses a <video> across renders and the same
     src does not re-request, so the key is what forces the fetch. */
  const [attempt, setAttempt] = useState(0);
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <AttachmentTile
        kind="video"
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
      {/* No <track>: the platform sends none, and the caption under the clip
          is the message's caption, not the clip's subtitles. */}
      <video
        key={attempt}
        src={url}
        controls
        preload="metadata"
        onError={() => setBroken(true)}
        className="max-h-64 max-w-full rounded-card bg-surface-sunken"
      />
      {caption ? <div className="mt-1 whitespace-pre-wrap">{caption}</div> : null}
    </div>
  );
}
