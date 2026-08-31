import { useRef, useState } from 'react';
import { Button, safeHref } from '~ui';
import { errorMessageFor, type UploadFileType } from '~api';
import { useFlowBuilder } from '../../../FlowBuilderContext';

export interface MediaFieldProps {
  /** blockElementID — media rides the PLUGIN upload endpoint keyed by it. */
  elementId: string;
  label: string;
  fileType: UploadFileType;
  /** input accept filter, e.g. "image/*". */
  accept: string;
  /** Current file, from the element's FileRef (absent = nothing uploaded). */
  current?: { url?: string | null } | null;
  currentName?: string | null;
  /** Attach mutation (per family) — fires after a successful upload. */
  onAttach: (fileId: string, fileName: string) => Promise<void>;
}

/**
 * Upload-then-attach for media elements: POST to the plugin endpoint
 * (pluginID = blockElementID), then hand the FileID to the family's attach
 * mutation — uploads stay temporary until attached (guide.md). Hidden when
 * the host client provides no uploadFile (the ModuleClient contract makes it
 * optional).
 */
export function MediaField({ elementId, label, fileType, accept, current, currentName, onAttach }: MediaFieldProps) {
  const { client, botId } = useFlowBuilder();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = client.uploadFile;
  if (!upload) return null;

  const pick = async (file: File) => {
    setPending(true);
    setError(null);
    try {
      const uploaded = await upload(botId, file, fileType, elementId);
      await onAttach(uploaded.id, file.name);
    } catch (err) {
      setError(errorMessageFor(err, {}));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isImage = fileType === 'Image';
  /* The address of the file already attached comes back from the upload
     endpoint, so it goes through `safeHref` before it becomes a link. */
  const fileHref = current?.url ? safeHref(current.url) : null;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-text-muted">{label}</div>
      {current?.url && isImage ? (
        <img src={current.url} alt="" className="max-h-36 rounded-lg border border-border object-contain" />
      ) : null}
      {fileHref && !isImage ? (
        <a
          href={fileHref}
          target="_blank"
          rel="noreferrer noopener"
          className="block truncate text-sm text-accent hover:underline"
        >
          {currentName || 'Current file'}
        </a>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? 'Uploading…' : current?.url ? 'Replace file' : 'Upload file'}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
