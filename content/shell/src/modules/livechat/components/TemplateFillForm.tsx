import { useRef, type ChangeEvent } from 'react';
import { Alert, AttachmentTile, Button, Field, Spinner, Tag, formatFileSize } from '~ui';
import type { TemplateFillApi } from '../hooks/useTemplateFillStore';
import { fieldLabel, type TemplateField } from '../lib/templatePreview';
import { TemplatePreviewCard } from './TemplatePreviewCard';

export interface TemplateFillFormProps {
  fill: TemplateFillApi;
}

/* Keyed by the header's file kind, unlike `acceptFor` in `lib/attachments.ts`,
   which is keyed by platform — a template header narrows to one kind, a
   channel to a set of upload types, so the two tables answer different
   questions. */
const FILE_ACCEPT: Record<'image' | 'video' | 'document', string | undefined> = {
  image: 'image/*',
  video: 'video/*',
  document: undefined,
};

/**
 * The dialog's second stage: the blanks of the server's temporary copy.
 *
 * The form is built from that copy and nothing else. Every field writes
 * through a setter that answers with the whole copy; the fields, the preview
 * and the Send button all re-render from that answer. `errors` on it IS the
 * send gate, and each error is printed beside the field it names. The form
 * checks nothing itself.
 */
export function TemplateFillForm({ fill }: TemplateFillFormProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="min-w-64 flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-text">{fill.template?.name}</span>
          <Tag>{fill.template?.language}</Tag>
        </div>

        {fill.state.creating ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : fill.state.createError ? (
          <Alert tone="danger" title="Could not prepare the template">
            {fill.state.createError}
          </Alert>
        ) : (
          <>
            {fill.errors.unattached.map((text) => (
              <Alert key={text} tone="warning">
                {text}
              </Alert>
            ))}
            {fill.fields.length === 0 ? (
              <p className="text-sm text-text-muted">This template has nothing to fill in — it goes as it reads.</p>
            ) : null}
            {fill.fields.map((field) => {
              if (field.kind === 'file') {
                return <TemplateFileField key={field.key} field={field} fill={fill} />;
              }
              return (
                <div key={field.key}>
                  <Field
                    label={fieldLabel(field)}
                    value={field.value}
                    placeholder={`{{${'name' in field ? field.name : 'code'}}}`}
                    onSave={(next) => fill.setText(field, next)}
                  />
                  {fill.errors.byKey[field.key]?.map((text) => (
                    <p key={text} className="mt-1 text-xs text-danger">
                      {text}
                    </p>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {fill.preview ? (
        <div className="min-w-64 flex-1">
          <span className="mb-1 block text-xs font-medium text-text-muted">Preview</span>
          <TemplatePreviewCard
            preview={fill.preview}
            headerPreviewUrl={fill.headerFile?.previewUrl}
            headerFileName={fill.headerFile?.name}
          />
          <p className="mt-2 text-xs text-text-muted">
            Blanks show as <span className="font-mono">{'{{1}}'}</span> until they are filled. Fields save when you
            leave them.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The media-header field: a hidden input, the tile, and the refusals under them. */
function TemplateFileField({
  field,
  fill,
}: {
  field: Extract<TemplateField, { kind: 'file' }>;
  fill: TemplateFillApi;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) fill.setHeaderFile(field, file);
    /* Picking the same file twice must fire twice — see the composer. */
    event.target.value = '';
  };

  const picked = fill.headerFile;
  const busy = fill.state.busy[field.key] === true;
  /* The server's verdict and the last refusal, together: a
     text field prints its own refusal through `Field`, but
     the tile has no such channel of its own. */
  const problem = fill.state.problems[field.key];
  const problems = [...(fill.errors.byKey[field.key] ?? []), ...(problem ? [problem] : [])];
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-text-muted">Header {field.fileKind}</span>
      <input
        ref={fileRef}
        type="file"
        accept={FILE_ACCEPT[field.fileKind]}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={onFile}
      />
      <div className="flex flex-wrap items-center gap-2">
        {picked || field.file ? (
          <AttachmentTile
            kind={picked?.kind ?? field.fileKind}
            name={picked?.name ?? field.file?.fileName ?? `${field.fileKind}`}
            meta={picked ? formatFileSize(picked.size) : undefined}
            previewUrl={picked?.previewUrl ?? field.file?.url ?? undefined}
            state={busy ? 'uploading' : problem ? 'failed' : 'ready'}
            error={problem}
          />
        ) : null}
        <Button size="sm" variant="ghost" disabled={!fill.canUpload || busy} onClick={() => fileRef.current?.click()}>
          {field.file || picked
            ? 'Replace'
            : `Choose ${field.fileKind === 'image' ? 'an image' : field.fileKind === 'video' ? 'a video' : 'a file'}`}
        </Button>
      </div>
      {!fill.canUpload ? (
        <p className="mt-1 text-xs text-text-muted">
          This host has no upload path, so a media header cannot be filled here.
        </p>
      ) : null}
      {/* The tile truncates its error to a line; the sentence
          is repeated in full underneath, beside the server's
          own verdict on the field. */}
      {problems.map((text) => (
        <p key={text} className="mt-1 text-xs text-danger">
          {text}
        </p>
      ))}
    </div>
  );
}
