import type { TemplateHeader } from '../../lib/messagePayload';
import { DocumentBubble } from './DocumentBubble';
import { ImageBubble } from './ImageBubble';
import { VideoBubble } from './VideoBubble';

export interface TemplateBubbleProps {
  header: TemplateHeader | null;
  body: string | null;
  footer: string | null;
}

/**
 * A rendered WhatsApp template: media or text header, body, footer.
 *
 * Draws the echo (`WhatsAppOutTemplateMessage`) AND the optimistic row before
 * it — both hand it a `TemplateContent`, so the row does not change shape when
 * the server confirms it. The buttons are actions under the bubble, like every
 * other buttons message. There is no template NAME on the wire, so none is
 * shown in either state.
 *
 * A media header reuses the media bubbles rather than the tile: a template's
 * image is the message's picture, and the reader wants to see it, not a
 * thumbnail of it.
 */
export function TemplateBubble({ header, body, footer }: TemplateBubbleProps) {
  return (
    <div>
      {header ? <div className={body || footer ? 'mb-1.5' : ''}>{headerContent(header)}</div> : null}
      {body ? <div className="whitespace-pre-wrap">{body}</div> : null}
      {footer ? <div className="mt-1 text-xs opacity-70">{footer}</div> : null}
    </div>
  );
}

function headerContent(header: TemplateHeader) {
  switch (header.kind) {
    case 'text':
      return <div className="font-semibold">{header.text}</div>;
    case 'image':
      return <ImageBubble url={header.url} caption={null} label="Image" />;
    case 'video':
      return <VideoBubble url={header.url} caption={null} label="Video" />;
    case 'document':
      return (
        <DocumentBubble url={header.url} name={header.name ?? 'Document'} size={null} caption={null} label="Document" />
      );
  }
}
