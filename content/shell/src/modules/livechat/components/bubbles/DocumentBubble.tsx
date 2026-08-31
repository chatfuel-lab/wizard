import { AttachmentTile, openExternal } from '~ui';

export interface DocumentBubbleProps {
  /** Null when the file is gone: `FileStatus.Expired`, or never sent. */
  url: string | null;
  /** The file name, or the kinds-table label when the platform sends none. */
  name: string;
  /** "1.2 MB", or null when the size is not on the wire. */
  size: string | null;
  caption: string | null;
  /** "Document" / "File" — what the tile says when the file has expired. */
  label: string;
}

/**
 * A file as a tile: its name, its size, and a way to open it.
 *
 * `AttachmentTile`'s document shape is the composer's own tray tile in its
 * resting state, which is the point — a document the operator sent and one
 * the contact sent look the same because they are the same thing. Opening is
 * a new tab: the URL is a signed storage link, and there is no in-app viewer
 * to hand it to. An expired file keeps its tile and its name and says so,
 * rather than becoming a dead link.
 */
export function DocumentBubble({ url, name, size, caption, label }: DocumentBubbleProps) {
  return (
    <div>
      <AttachmentTile
        kind="document"
        name={name}
        meta={size ?? undefined}
        state={url ? 'ready' : 'failed'}
        error={url ? undefined : `${label} expired`}
        onOpen={url ? () => openExternal(url) : undefined}
      />
      {caption ? <div className="mt-1 whitespace-pre-wrap">{caption}</div> : null}
    </div>
  );
}
