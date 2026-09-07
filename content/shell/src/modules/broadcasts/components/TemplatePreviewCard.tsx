import { AttachmentTile, IconCopy, IconExternal, IconPhone, IconPointer } from '~ui';
import type { PreviewButton, TemplatePreview } from '../lib/templatePreview';

export interface TemplatePreviewCardProps {
  preview: TemplatePreview;
  /** The picked header file's local thumbnail, preferred over the server's URL. */
  headerPreviewUrl?: string | null;
  headerFileName?: string | null;
  /** Compact: a list row. Full: the message as a bubble. */
  compact?: boolean;
}

const BUTTON_GLYPH: Record<PreviewButton['kind'], typeof IconExternal> = {
  url: IconExternal,
  quickReply: IconPointer,
  call: IconPhone,
  whatsAppCall: IconPhone,
  copyCode: IconCopy,
};

/**
 * The template as it will land — a WhatsApp bubble's worth of it.
 *
 * Every string comes from `lib/templatePreview.ts`, blanks included as
 * `{{1}}`, so what this shows and what the tests assert are the same text.
 * A copy of the livechat module's card over this module's preview type.
 */
export function TemplatePreviewCard({
  preview,
  headerPreviewUrl,
  headerFileName,
  compact = false,
}: TemplatePreviewCardProps) {
  const { header } = preview;
  if (compact) {
    return (
      <span className="line-clamp-2 text-xs text-text-muted">
        {header?.kind === 'text' ? (
          <span className="font-medium text-text">{header.text} </span>
        ) : header ? (
          <span className="text-text-faint">
            [{header.kind === 'image' ? 'Image' : header.kind === 'video' ? 'Video' : 'Document'}]{' '}
          </span>
        ) : null}
        <span className="break-words">{preview.body}</span>
      </span>
    );
  }
  return (
    <div className="rounded-bubble rounded-br-sm bg-bubble-out px-3 py-2 text-sm text-bubble-out-fg">
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
      {preview.footer ? <p className="mt-1 text-xs opacity-70">{preview.footer}</p> : null}
      {preview.buttons.length > 0 ? (
        <ul className="mt-2 divide-y divide-border/40 border-t border-border/40">
          {preview.buttons.map((button, index) => {
            const Glyph = BUTTON_GLYPH[button.kind];
            return (
              <li key={index} className="flex items-center justify-center gap-1.5 py-1.5 font-medium">
                <Glyph size={12} />
                <span>{button.text}</span>
                {button.kind === 'url' ? (
                  <span className="max-w-48 truncate text-micro opacity-70">{button.url}</span>
                ) : button.kind === 'copyCode' ? (
                  <span className="text-micro opacity-70">{button.code ?? '{{code}}'}</span>
                ) : button.kind === 'call' ? (
                  <span className="text-micro opacity-70">{button.phoneNumber}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
