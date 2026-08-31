import { AttachmentTile, IconExternal, IconLink, IconPointer } from '~ui';
import type { PreviewButton, TemplatePreview } from '../lib/templatePreview';

export interface TemplatePreviewCardProps {
  preview: TemplatePreview;
  /** The picked header file's local thumbnail, preferred over the server's URL. */
  headerPreviewUrl?: string | null;
  headerFileName?: string | null;
  /** Compact: the picker's row. Full: the form's live preview. */
  compact?: boolean;
}

const BUTTON_GLYPH: Record<PreviewButton['kind'], typeof IconLink> = {
  url: IconExternal,
  quickReply: IconPointer,
  call: IconLink,
  whatsAppCall: IconLink,
  copyCode: IconLink,
};

/**
 * The template as it will land — a WhatsApp bubble's worth of it.
 *
 * Every string comes from `lib/templatePreview.ts`, blanks included as
 * `{{1}}`, so what this shows and what the tests assert are the same text.
 * A media header shows the picked file's tile; a header not yet given a file
 * shows the tile empty, so the reader sees that a slot exists rather than a
 * message that seems complete.
 */
export function TemplatePreviewCard({
  preview,
  headerPreviewUrl,
  headerFileName,
  compact = false,
}: TemplatePreviewCardProps) {
  const { header } = preview;
  /* The compact card sits inside the picker's row BUTTON, whose content model
     is phrasing content — so it is spans all the way down. */
  if (compact) {
    /* One line of the row, not a box on it: header — bold if it is words, a
       glyph word if it is a file — then the body, clamped to two lines. Real
       marketing templates run to a dozen lines with blank lines between, and
       three of those filled the dialog; the fill step keeps the whole thing.
       No `block` beside the clamp: `line-clamp-*` IS a display value
       (`-webkit-box`), and a second display utility on the same element is a
       coin toss over which one the stylesheet keeps. */
    return (
      <span className="line-clamp-2 text-xs text-text-muted">
        {header?.kind === 'text' ? (
          <span className="font-medium text-text">{header.text} </span>
        ) : header ? (
          <span className="text-text-faint">
            [{header.kind === 'image' ? 'Image' : header.kind === 'video' ? 'Video' : 'Document'}]{' '}
          </span>
        ) : null}
        {/* Newlines collapse here on purpose: a picker row is two lines of
            words, and a template whose body opens "Hi {{1}}," + a blank line
            would spend the second line on the blank. The fill step keeps the
            template's own line breaks. */}
        <span className="break-words">{preview.body}</span>
      </span>
    );
  }
  return (
    <div className="rounded-card border border-border bg-surface-sunken p-3 text-sm text-text">
      {header?.kind === 'text' ? (
        <p className="mb-1 font-semibold">{header.text}</p>
      ) : header ? (
        <div className="mb-2">
          <AttachmentTile
            kind={header.kind}
            name={headerFileName ?? header.fileName ?? `${header.kind} — not chosen yet`}
            previewUrl={headerPreviewUrl ?? header.url ?? undefined}
            state={headerPreviewUrl || header.url ? 'ready' : undefined}
          />
        </div>
      ) : null}
      <p className="whitespace-pre-wrap break-words">{preview.body}</p>
      {preview.footer ? <p className="mt-1 text-xs text-text-muted">{preview.footer}</p> : null}
      {preview.buttons.length > 0 ? (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {preview.buttons.map((button, index) => {
            const Glyph = BUTTON_GLYPH[button.kind];
            return (
              <li key={index} className="flex items-center justify-center gap-1.5 py-1.5 text-accent">
                <Glyph size={12} />
                <span>{button.text}</span>
                {button.kind === 'url' ? (
                  <span className="max-w-48 truncate text-micro text-text-faint">{button.url}</span>
                ) : button.kind === 'copyCode' ? (
                  <span className="text-micro text-text-faint">{button.code ?? '{{code}}'}</span>
                ) : button.kind === 'call' ? (
                  <span className="text-micro text-text-faint">{button.phoneNumber}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
