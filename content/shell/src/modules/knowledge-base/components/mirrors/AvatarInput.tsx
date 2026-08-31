import { useState } from 'react';
import { Alert, Avatar, Button, FileDrop, IconImage } from '~ui';
import type { UploadFileFn } from '~api';
import { messageFor } from '../../lib/errors';
import type { ImageRef } from '../../lib/images';

export interface AvatarInputProps {
  botId: string;
  value: ImageRef | null;
  onChange: (next: ImageRef | null) => void;
  /** The name behind the initials while there is no picture. */
  name: string;
  /** Absent → no upload path on this host; the control says so instead of vanishing. */
  uploadFile: UploadFileFn | undefined;
  disabled?: boolean;
  error?: string | null;
  onBusy?: (busy: boolean) => void;
}

/**
 * One picture, for a specialist.
 *
 * The single-image sibling of `PhotosInput`: same three ways in (drag, click,
 * paste — `FileDrop` owns all three), same "say why" when the host app has no
 * upload endpoint, and a preview that falls back to initials so the row is
 * never an empty square.
 */
export function AvatarInput({
  botId,
  value,
  onChange,
  name,
  uploadFile,
  disabled = false,
  error,
  onBusy,
}: AvatarInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const accept = async (files: File[]) => {
    const file = files[0];
    if (!uploadFile || !file) return;
    setUploading(true);
    onBusy?.(true);
    setUploadError(null);
    try {
      const result = await uploadFile(botId, file, 'Image');
      onChange({ id: result.id, url: result.url });
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
      <span className="text-xs font-medium text-text-muted">Photo</span>
      <div className="flex items-center gap-3">
        <Avatar src={value?.url ?? null} name={name} size={56} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {uploadFile ? (
            <FileDrop
              accept="image/*"
              disabled={disabled}
              busy={uploading}
              icon={<IconImage size={18} />}
              label={value ? 'Replace the photo' : 'Add a photo'}
              hint="Drop, paste or choose an image."
              onFiles={(files) => void accept(files)}
            />
          ) : (
            <Alert tone="info">This app has no file-upload path, so a photo cannot be set here.</Alert>
          )}
          {value && !disabled ? (
            <Button variant="ghost" size="xs" onClick={() => onChange(null)} className="self-start">
              Remove the photo
            </Button>
          ) : null}
        </div>
      </div>
      {message ? (
        <span role="alert" className="text-xs text-danger">
          {message}
        </span>
      ) : null}
    </div>
  );
}
