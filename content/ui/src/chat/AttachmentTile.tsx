import { IconClose, IconFile, IconImage, IconMic, IconPlay, IconRefresh, IconWarning } from '../icons';
import { Progress } from '../primitives/Progress';

export type AttachmentKind = 'image' | 'video' | 'audio' | 'document';

/**
 * 'uploading' and 'failed' are the outgoing half of an attachment's life — a
 * file the operator picked, still on its way up. 'ready' covers both a finished
 * upload and anything that arrived from the contact, which look identical
 * because they are: a file with a name that can be opened.
 */
export type AttachmentState = 'ready' | 'uploading' | 'failed';

export interface AttachmentTileProps {
  kind: AttachmentKind;
  /** Filename, or a caption. Also the alt text for an image. */
  name: string;
  /** Preformatted size or duration — "1.2 MB", "0:14". */
  meta?: string;
  /** Thumbnail for an image, poster frame for a video. */
  previewUrl?: string | null;
  state?: AttachmentState;
  /** 0–100 while uploading. Omit for an indeterminate bar. */
  progress?: number;
  /** Why it failed. Shown in place of `meta`. */
  error?: string;
  onOpen?: () => void;
  onRetry?: () => void;
  /** Renders the corner dismiss button — a staged file, not a sent one. */
  onRemove?: () => void;
  className?: string;
}

const KIND_ICON = {
  image: IconImage,
  video: IconPlay,
  audio: IconMic,
  document: IconFile,
} as const;

/**
 * One attachment, in any of its four kinds and three states.
 *
 * Two shapes, chosen by kind rather than by a prop: an image or a video is a
 * thumbnail, because the content IS the identifier, and a document or a voice
 * note is a row, because its name is. Anything else — a caption, a download
 * link, a lightbox — belongs to the caller; this tile's whole job is to look
 * right in a composer tray and in a bubble without the two diverging.
 *
 * The uploading and failed states live ON the tile rather than around it for
 * one reason: a failed upload has to stay in place, keep its name and offer a
 * retry. Replacing it with an error row loses the file, and every
 * implementation that does that also loses the bytes.
 */
export function AttachmentTile({
  kind,
  name,
  meta,
  previewUrl,
  state = 'ready',
  progress,
  error,
  onOpen,
  onRetry,
  onRemove,
  className = '',
}: AttachmentTileProps) {
  const Icon = KIND_ICON[kind];
  const failed = state === 'failed';
  const uploading = state === 'uploading';
  const border = failed ? 'border-danger' : 'border-border';
  const extra = className ? ` ${className}` : '';

  /* Corner controls are SIBLINGS of the tile body, never inside it: a button
     nested in a button is invalid markup, and browsers resolve it by dropping
     one of the two click targets. */
  const corner =
    'absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-inverse/70 text-text-inverse transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-inverse';

  if (kind === 'image' || kind === 'video') {
    return (
      <div
        className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-card border bg-surface-sunken ${border}${extra}`}
      >
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          aria-label={onOpen ? `Open ${name}` : undefined}
          className={`flex h-full w-full items-center justify-center focus-visible:focus-ring ${
            uploading ? 'opacity-60' : ''
          }`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <Icon size={20} className="text-text-faint" />
          )}
        </button>

        {/* Over the poster, not beside it — a video thumbnail with the play
            glyph anywhere else does not read as playable. */}
        {kind === 'video' && previewUrl && !uploading && !failed ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-inverse/70 text-text-inverse">
              <IconPlay size={14} />
            </span>
          </span>
        ) : null}

        {uploading ? (
          <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 block">
            <Progress value={progress} label={`Uploading ${name}`} size="sm" />
          </span>
        ) : null}

        {failed ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-danger-soft px-1.5 py-1 text-nano text-danger">
            <IconWarning size={12} />
            <span className="truncate">{error ?? 'Failed'}</span>
          </span>
        ) : null}

        {failed && onRetry ? (
          <button type="button" onClick={onRetry} aria-label={`Retry ${name}`} className={`${corner} left-1`}>
            <IconRefresh size={12} />
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className={`${corner} right-1`}>
            <IconClose size={12} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex w-56 max-w-full shrink-0 items-center gap-2 rounded-card border bg-surface-raised p-2 ${border}${extra}`}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={onOpen ? `Open ${name}` : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:focus-ring"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-chip ${
            failed ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-text-muted'
          }`}
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-text">{name}</span>
          {uploading ? (
            <Progress value={progress} label={`Uploading ${name}`} size="sm" className="mt-1" />
          ) : (
            <span className={`block truncate text-nano ${failed ? 'text-danger' : 'text-text-faint'}`}>
              {failed ? (error ?? 'Failed to upload') : meta}
            </span>
          )}
        </span>
      </button>

      {failed && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 text-micro font-medium text-danger transition-colors duration-fast ease-standard focus-visible:focus-ring hover:text-text"
        >
          <IconRefresh size={12} />
          Retry
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-text"
        >
          <IconClose size={12} />
        </button>
      ) : null}
    </div>
  );
}
