export interface ButtonsBubbleProps {
  /** WhatsApp's `headerText`; the widget has none. */
  header: string | null;
  body: string;
  /** WhatsApp's `footerText`; the widget has none. */
  footer: string | null;
}

/**
 * The text half of a buttons message: header bold, body, footer muted.
 *
 * The buttons themselves are NOT here. They go through `MessageView` into
 * `MessageBubble`'s `actions` slot and render under the bubble, in its column
 * — WhatsApp draws reply buttons as their own rows below the text, and a
 * button inside the bubble box reads as part of the text. This bubble is
 * therefore words only, and the same words a `TemplateBubble` draws.
 */
export function ButtonsBubble({ header, body, footer }: ButtonsBubbleProps) {
  return (
    <div>
      {header ? <div className="mb-1 font-semibold">{header}</div> : null}
      <div className="whitespace-pre-wrap">{body}</div>
      {footer ? <div className="mt-1 text-xs opacity-70">{footer}</div> : null}
    </div>
  );
}
