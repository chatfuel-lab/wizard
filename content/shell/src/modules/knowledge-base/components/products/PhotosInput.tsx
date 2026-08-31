import { useState } from 'react';
import { Alert, FileDrop, IconChevronLeft, IconChevronRight, IconClose, IconImage, Tag, Tooltip } from '~ui';
import type { UploadFileFn } from '~api';
import { MAX_IMAGES, addImages, moveImage, removeImage, roomFor, type ImageRef } from '../../lib/images';
import { messageFor } from '../../lib/errors';

export interface PhotosInputProps {
  botId: string;
  images: ImageRef[];
  onChange: (next: ImageRef[]) => void;
  /**
   * Absent when the host app has no REST upload path (no dev proxy). The
   * control says so rather than disappearing — a missing "Add photos" button
   * with no explanation reads as a broken page.
   */
  uploadFile: UploadFileFn | undefined;
  disabled?: boolean;
  error?: string | null;
  /** Report the in-flight state so the dialog can hold its Save button. */
  onBusy?: (busy: boolean) => void;
}

/**
 * A product's photos: drop, pick or paste → REST upload → the FileIDs the
 * input carries. Thumbnails, remove, and REORDER.
 *
 * Order is the feature. The first photo is the one the assistant sends when a
 * customer asks to see the thing, and an earlier version of this control
 * could only append — so the cover picture was whatever had been uploaded
 * first, for ever. Moving is two buttons and not a drag: a drag needs a
 * pointer and a steady hand, these are in the tab order and work from a
 * keyboard, and there are at most ten tiles.
 *
 * `FileDrop` handles the three ways a file arrives (drag, click, paste); this
 * component only decides what happens to the ones that land.
 */
export function PhotosInput({
  botId,
  images,
  onChange,
  uploadFile,
  disabled = false,
  error,
  onBusy,
}: PhotosInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const room = roomFor(images);
  const full = room === 0;

  const accept = async (files: File[]) => {
    if (!uploadFile || files.length === 0) return;
    setUploading(true);
    onBusy?.(true);
    setUploadError(null);
    try {
      const uploaded: ImageRef[] = [];
      /* Sequential: the endpoint is per-file, and a parallel burst of ten
         uploads is the one shape a proxy in front of it will throttle. */
      for (const file of files.slice(0, room)) {
        const result = await uploadFile(botId, file, 'Image');
        uploaded.push({ id: result.id, url: result.url });
      }
      onChange(addImages(images, uploaded));
      if (files.length > room)
        setUploadError(`Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'} — the rest were not uploaded.`);
    } catch (err) {
      setUploadError(messageFor(err));
    } finally {
      setUploading(false);
      onBusy?.(false);
    }
  };

  const message = error ?? uploadError;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-text-muted">Photos</span>
        {images.length > 0 ? (
          <span className="text-micro text-text-faint">
            {images.length === 1
              ? 'The first photo is the one the assistant sends'
              : `${images.length} of ${MAX_IMAGES} · the first is the one the assistant sends`}
          </span>
        ) : null}
      </div>

      {images.length > 0 ? (
        <ul role="list" aria-label="Product photos" className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <li key={image.id} className="relative">
              <div className="relative h-20 w-20 overflow-hidden rounded-control border border-border bg-surface-sunken">
                {image.url ? (
                  <img src={image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-text-faint">
                    <IconImage />
                  </span>
                )}
                {index === 0 ? (
                  <span className="absolute left-1 top-1">
                    <Tag tone="accent">Cover</Tag>
                  </span>
                ) : null}
              </div>
              {!disabled ? (
                <>
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => onChange(removeImage(images, image.id))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-overlay text-text-muted shadow-raised transition-colors duration-fast ease-standard hover:text-danger focus-visible:focus-ring"
                  >
                    <IconClose size={12} />
                  </button>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <Tooltip label={index === 0 ? 'Already first' : 'Move earlier'}>
                      <button
                        type="button"
                        aria-label={`Move photo ${index + 1} earlier`}
                        disabled={index === 0}
                        onClick={() => onChange(moveImage(images, index, index - 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:text-text-faint disabled:hover:bg-transparent"
                      >
                        <IconChevronLeft size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip label={index === images.length - 1 ? 'Already last' : 'Move later'}>
                      <button
                        type="button"
                        aria-label={`Move photo ${index + 1} later`}
                        disabled={index === images.length - 1}
                        onClick={() => onChange(moveImage(images, index, index + 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:text-text-faint disabled:hover:bg-transparent"
                      >
                        <IconChevronRight size={12} />
                      </button>
                    </Tooltip>
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {uploadFile ? (
        <FileDrop
          accept="image/*"
          multiple
          disabled={disabled || full}
          busy={uploading}
          icon={<IconImage size={20} />}
          label={full ? `${MAX_IMAGES} photos is the maximum` : images.length === 0 ? 'Add photos' : 'Add more photos'}
          hint={
            full
              ? 'Remove one to add another.'
              : `Drop, paste or choose images. ${room} more ${room === 1 ? 'fits' : 'fit'}.`
          }
          onFiles={(files) => void accept(files)}
        />
      ) : (
        <Alert tone="info">
          This app has no file-upload path, so photos cannot be added here. The assistant still sends the ones already
          on the product; add more from the Chatfuel dashboard.
        </Alert>
      )}

      {message ? (
        <span role="alert" className="text-xs text-danger">
          {message}
        </span>
      ) : null}
    </div>
  );
}
