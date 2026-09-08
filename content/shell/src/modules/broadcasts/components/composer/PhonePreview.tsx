import { IconWhatsApp } from '~ui';
import type { TemplatePreview } from '../../lib/templatePreview';
import { TemplatePreviewCard } from '../TemplatePreviewCard';

export interface PhonePreviewProps {
  preview: TemplatePreview | null;
  /** The sending number as WhatsApp shows it, when the bot has one. */
  number: string | null;
  /** The picked header file's local thumbnail, preferred over the server's URL. */
  headerPreviewUrl?: string | null;
  headerFileName?: string | null;
}

/**
 * The message inside a phone: a rounded frame, a header bar with the number
 * it comes from, the bubble as it will land. Nothing on it explains
 * itself — the bubble is the same card the list and the panel draw, so what
 * is previewed here is what the tests assert.
 */
export function PhonePreview({ preview, number, headerPreviewUrl, headerFileName }: PhonePreviewProps) {
  return (
    <div className="mx-auto w-full max-w-72 overflow-hidden rounded-[1.75rem] border border-border bg-surface-sunken shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
          <IconWhatsApp size={14} />
        </span>
        <span className="truncate text-label font-medium text-text">{number ?? 'WhatsApp'}</span>
      </div>
      <div className="min-h-64 px-3 py-4">
        {preview ? (
          <div className="flex justify-end">
            <div className="max-w-[94%]">
              <TemplatePreviewCard
                preview={preview}
                headerPreviewUrl={headerPreviewUrl}
                headerFileName={headerFileName}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
