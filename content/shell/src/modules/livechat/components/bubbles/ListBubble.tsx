import { IconLayoutList } from '~ui';

export interface ListBubbleProps {
  body: string;
  /** The title of the button that opens the list on the contact's phone. */
  buttonTitle: string;
}

/**
 * The text half of a WhatsApp list message: the body, then the opener button
 * as a quiet line, because on the phone the rows are behind that button. The
 * rows themselves are actions under the bubble (`MessageBubble.actions`, each
 * with `kind: 'row'`) — the transcript of what the contact was offered.
 */
export function ListBubble({ body, buttonTitle }: ListBubbleProps) {
  return (
    <div>
      <div className="whitespace-pre-wrap">{body}</div>
      <div className="mt-1.5 flex items-center gap-1 text-xs opacity-70">
        <IconLayoutList size={12} className="shrink-0" />
        <span className="truncate">{buttonTitle}</span>
      </div>
    </div>
  );
}
