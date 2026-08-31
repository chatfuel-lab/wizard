import { useRef, useState } from 'react';
import { Button, IconClose, IconImage } from '~ui';
import type { UploadFileFn } from '~api';
import { MAX_IMAGES, type ImageRef } from '../../lib/serviceInput';

export interface ImagesInputProps {
  botId: string;
  images: ImageRef[];
  onChange: (next: ImageRef[]) => void;
  /** Absent → the dialog hides this control (no upload path on this host). */
  uploadFile: UploadFileFn;
  disabled?: boolean;
  error?: string | null;
}

/**
 * A service's pictures: file picker → REST upload → `FileID`s the input's
 * `images` list takes. Bookings' own copy (the knowledge-base module has one
 * too; modules do not import each other). Order is kept — the first image is
 * the card's thumbnail.
 */
export function ImagesInput({ botId, images, onChange, uploadFile, disabled = false, error }: ImagesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: ImageRef[] = [];
      for (const file of Array.from(files).slice(0, Math.max(0, MAX_IMAGES - images.length))) {
        const result = await uploadFile(botId, file, 'Image');
        uploaded.push({ id: result.id, url: result.url });
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const full = images.length >= MAX_IMAGES;
  const message = error ?? uploadError;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-muted">Images</span>
      <ul role="list" aria-label="Service images" className="flex flex-wrap items-center gap-2">
        {images.map((img) => (
          <li key={img.id} className="relative">
            {img.url ? (
              <img src={img.url} alt="" className="h-14 w-14 rounded-control border border-border object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-control border border-border text-text-faint">
                <IconImage />
              </span>
            )}
            {!disabled ? (
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-accent-fg focus-visible:focus-ring"
              >
                <IconClose size={10} />
              </button>
            ) : null}
          </li>
        ))}
        <li>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || uploading || full}
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <IconImage size={14} /> {full ? `${MAX_IMAGES} max` : 'Add image'}
          </Button>
        </li>
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Choose images"
        onChange={(e) => void pick(e.target.files)}
      />
      {message ? <span className="text-xs text-danger">{message}</span> : null}
    </div>
  );
}
