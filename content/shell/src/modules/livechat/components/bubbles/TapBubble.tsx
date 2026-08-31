import { IconPointer } from '~ui';

export interface TapBubbleProps {
  /** The button's or list row's title as it was offered. */
  title: string;
  /** A list row's description, a link button's URL, a call button's number. */
  description: string | null;
}

/**
 * The contact tapped something rather than writing.
 *
 * A quiet line, not a chip and not a quote: "Tapped: Track order" is the
 * whole event, and it sits in the contact's column because it is the
 * contact's turn in the conversation. The description under it is whatever
 * the tapped thing carried — a row's second line, a link's URL — so the
 * operator can tell which of two similarly named rows was chosen.
 */
export function TapBubble({ title, description }: TapBubbleProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <IconPointer size={14} className="shrink-0 opacity-70" />
        <span>
          <span className="opacity-70">Tapped: </span>
          <span className="font-medium">{title}</span>
        </span>
      </div>
      {description ? <div className="mt-0.5 pl-5 text-xs opacity-70">{description}</div> : null}
    </div>
  );
}
