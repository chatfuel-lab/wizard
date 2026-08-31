import { useState } from 'react';
import { AttachmentTile, Dialog, openExternal, type AttachmentKind } from '~ui';
import { FileStatus, FileType } from '~api/generated/coworker/graphql';
import type { MessageNode } from '../../types';

/** The API's four file types map one-to-one onto the tile's four kinds. */
const KIND: Record<FileType, AttachmentKind> = {
  [FileType.Image]: 'image',
  [FileType.Video]: 'video',
  [FileType.Audio]: 'audio',
  [FileType.Document]: 'document',
};

const KB = 1024;

/** "128 KB", "1.2 MB" — bytes are not a thing anyone reads off a chat row. */
function fileSize(size: number | null | undefined): string | undefined {
  if (typeof size !== 'number' || size <= 0) return undefined;
  if (size < KB * KB) return `${Math.max(1, Math.round(size / KB))} KB`;
  return `${(size / (KB * KB)).toFixed(1)} MB`;
}

type File = MessageNode['attachments'][number];

const isGone = (file: File): boolean => file.status === FileStatus.Expired || file.status === FileStatus.Failed;

/** More than this and the grid is a contact sheet nobody looks at. */
const GALLERY_LIMIT = 4;

/**
 * A message's files: pictures as pictures, everything else as a tile.
 *
 * The split matters because the two are read differently. A document, a voice
 * note or a video is a *thing you will open later* — its name, its size and its
 * type are the whole content, and a tile says all three in one line. A picture
 * is content already: shrinking it into a 40px thumbnail beside the words
 * "Image · 128 KB" hides the only part of it anybody wanted.
 *
 * So images render at the width of the thread, one big when there is one, a
 * two-column grid when there are several, and the fifth and beyond fold into a
 * "+N" on the last tile rather than turning an answer into a scroll of
 * photographs. Clicking any of them opens it full size.
 *
 * **Model-written markdown images are NOT this.** `Markdown` renders an `![…]()`
 * as its alt text and fetches nothing: that URL is chosen by a language model,
 * and a dashboard that loads it has handed an unknown host a request from
 * inside the operator's session. These files are different — they came back
 * from the account's own file storage, on ids the client itself uploaded or the
 * API returned.
 *
 * Message attachments are server-side copies and are not kept forever, so
 * `Expired` is a state this really sees. An expired image is not a broken picture: it
 * falls back to the tile, which keeps its kind and says what happened.
 */
export function MessageAttachments({ attachments }: { attachments: MessageNode['attachments'] }) {
  const [open, setOpen] = useState<File | null>(null);
  /* A URL that 404s. Message files expire server-side, but a copy can also
     simply fail to load — and a grid of broken-image glyphs is worse than the
     tile, which at least says what the thing was. */
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((file) => file.type === FileType.Image && !isGone(file) && !broken.has(file.id));
  const rest = attachments.filter((file) => !images.includes(file));

  const shown = images.slice(0, GALLERY_LIMIT);
  const hidden = images.length - shown.length;

  return (
    <>
      {shown.length > 0 ? (
        <div className={`mt-1.5 grid gap-1.5 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {shown.map((file, index) => (
            <button
              key={file.id}
              type="button"
              onClick={() => setOpen(file)}
              aria-label="Open the image"
              className="group/img relative overflow-hidden rounded-card border border-border bg-surface-sunken focus-visible:focus-ring"
            >
              <img
                src={file.url}
                alt=""
                loading="lazy"
                onError={() => setBroken((previous) => new Set(previous).add(file.id))}
                /* One picture keeps its own shape up to a height that still
                   leaves the conversation on screen; several are cropped to a
                   grid, because a row of different aspect ratios is a ransom
                   note. */
                className={shown.length === 1 ? 'max-h-80 w-full object-contain' : 'aspect-square w-full object-cover'}
              />
              {index === shown.length - 1 && hidden > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-scrim text-heading font-medium text-text-inverse">
                  +{hidden}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {rest.map((file) => {
            const gone = isGone(file);
            const kind = KIND[file.type] ?? 'document';
            return (
              <AttachmentTile
                key={file.id}
                kind={kind}
                /* There is no name on the wire — `File` is id, url, type,
                   status, size — so the kind is the name. */
                name={kind[0]!.toUpperCase() + kind.slice(1)}
                meta={fileSize(file.size)}
                state={gone ? 'failed' : 'ready'}
                error={gone ? 'No longer available' : undefined}
                onOpen={gone ? undefined : () => openExternal(file.url)}
              />
            );
          })}
        </div>
      ) : null}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title="Image" size="xl">
        {open ? <img src={open.url} alt="" className="mx-auto max-h-[70vh] w-auto rounded-card" /> : null}
      </Dialog>
    </>
  );
}
