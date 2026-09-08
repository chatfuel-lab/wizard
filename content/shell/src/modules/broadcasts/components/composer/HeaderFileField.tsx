import { AttachmentTile, FileDrop, IconImage, formatFileSize } from '~ui';
import type { TemplateFillApi } from '../../hooks/useTemplateFill';
import { fieldLabel, type TemplateField } from '../../lib/templatePreview';

export interface HeaderFileFieldProps {
  field: Extract<TemplateField, { kind: 'file' }>;
  fill: TemplateFillApi;
  canEdit: boolean;
}

/* Keyed by the header's kind. A document header takes any file, and `accept`
   then has no honest value to hold. */
const ACCEPT: Record<'image' | 'video' | 'document', string | undefined> = {
  image: 'image/*',
  video: 'video/*',
  document: undefined,
};

/**
 * The media-header field: the drop zone, the tile once a file is there, and
 * the refusals under them. The zone is a row among the other controls
 * rather than a target owning the page. Without an upload path on the host
 * the zone is disabled — a media header cannot be filled from here — and
 * the server's own verdict on the header still prints.
 */
export function HeaderFileField({ field, fill, canEdit }: HeaderFileFieldProps) {
  const picked = fill.headerFile;
  const busy = fill.state.busy[field.key] === true;
  const refusal = fill.state.problems[field.key];
  const problems = [...(fill.errors.byKey[field.key] ?? []), ...(refusal ? [refusal] : [])];
  const noun = field.fileKind === 'image' ? 'an image' : field.fileKind === 'video' ? 'a video' : 'a file';

  return (
    <div>
      <span className="mb-1 block text-label font-medium text-text-muted">{fieldLabel(field)}</span>
      <div className="space-y-2">
        {picked || field.file ? (
          <AttachmentTile
            kind={picked?.kind ?? field.fileKind}
            name={picked?.name ?? field.file?.fileName ?? field.fileKind}
            meta={picked ? formatFileSize(picked.size) : undefined}
            previewUrl={picked?.previewUrl ?? field.file?.url ?? undefined}
            state={busy ? 'uploading' : refusal ? 'failed' : 'ready'}
            error={refusal}
          />
        ) : null}
        <FileDrop
          layout="row"
          accept={ACCEPT[field.fileKind]}
          icon={<IconImage />}
          label={field.file || picked ? `Replace with ${noun}` : `Choose ${noun}`}
          disabled={!canEdit || !fill.canUpload}
          busy={busy}
          onFiles={(files) => {
            const file = files[0];
            if (file) fill.setHeaderFile(field, file);
          }}
        />
      </div>
      {problems.map((text) => (
        <p key={text} className="mt-1 text-meta text-danger">
          {text}
        </p>
      ))}
    </div>
  );
}
