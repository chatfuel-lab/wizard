import { useRef, useState } from 'react';
import { Avatar, Button, IconImage } from '~ui';
import type { UploadFileFn } from '~api';
import type { ImageRef } from '../../lib/staffFormStore';

export interface ImageInputProps {
  botId: string;
  /** The current image, or none. */
  value: ImageRef | null;
  onChange: (next: ImageRef | null) => void;
  /** Absent → the parent hides this control (no upload path on this host). */
  uploadFile: UploadFileFn;
  /** Names the avatar preview. */
  name: string;
  disabled?: boolean;
  /** Under the control. */
  error?: string | null;
}

/**
 * One picture: the specialist's avatar. File picker → REST upload → a
 * `FileID` the profile's `logo` field takes. Bookings' own copy of the
 * pattern (no cross-module import; the knowledge-base one manages a list).
 * The upload is the only network call here; the profile save is the form's.
 */
export function ImageInput({ botId, value, onChange, uploadFile, name, disabled = false, error }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadFile(botId, file, 'Image');
      onChange({ id: uploaded.id, url: uploaded.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const message = error ?? uploadError;

  return (
    <div className="flex items-center gap-3">
      <Avatar src={value?.url ?? null} name={name} size={56} />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <IconImage size={14} /> {value ? 'Replace photo' : 'Upload photo'}
          </Button>
          {value ? (
            <Button variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange(null)}>
              Remove
            </Button>
          ) : null}
        </div>
        <span className="text-xs text-text-faint">PNG or JPG. Shown on the calendar and to customers.</span>
        {message ? <span className="text-xs text-danger">{message}</span> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a photo"
        onChange={(e) => void pick(e.target.files)}
      />
    </div>
  );
}
