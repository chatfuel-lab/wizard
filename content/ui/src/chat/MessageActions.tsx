import { IconExternal, IconPhone } from '../icons';
import { safeHref } from '../lib/markdown';

/**
 * One button of a message: a reply button, a URL button, a call button, or a
 * row of a WhatsApp list. `href` and `phone` are the two the reader can act on
 * from any seat; everything else is the CONTACT's to press, so it is shown
 * and, unless the caller wires `onSelect`, not pressable.
 */
export interface MessageAction {
  title: string;
  /** A second line under the title — a list row's description. */
  description?: string;
  /**
   * A link button: opens in a new tab.
   *
   * Runs through `safeHref` like every other target this package renders. The
   * URL on a WhatsApp button is wire data — it came from whoever built the
   * template, and the reader is an operator inside the dashboard — so a target
   * this will not follow renders as the plain, unpressable chip instead. The
   * button is still a record of what the contact was offered; it just does not
   * carry the scheme anywhere.
   */
  href?: string;
  /** A call button: `tel:` link. */
  phone?: string;
  /**
   * `row` is a list message's option — full width, title over description —
   * where a `button` is a chip that wraps beside its siblings.
   */
  kind?: 'button' | 'row';
}

export interface MessageActionsProps {
  actions: readonly MessageAction[];
  /**
   * Fires for a button that is neither a link nor a phone. Absent, those
   * buttons render as what they are in an operator's inbox: a transcript of
   * what the contact was offered, not a keypad. Preview surfaces, where the
   * reader IS the contact, pass one and the buttons advance the flow.
   */
  onSelect?: (action: MessageAction, index: number) => void;
  className?: string;
}

const FACE =
  'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3 py-1.5 text-left text-sm text-accent';
const HOVER = 'transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring';

/**
 * The buttons under a message bubble.
 *
 * Under, not inside: WhatsApp draws reply buttons and list options as their own
 * rows below the text, and Chatwoot copies that, because a button inside the
 * bubble box reads as part of the text. `MessageBubble` has an `actions` slot
 * that sits between the bubble and the timestamp for exactly this — pass this
 * component to it rather than composing the two by hand, so the column, the
 * width cap and the alignment stay the bubble's.
 *
 * Every entry is a real element with a name: a link is an `<a>`, a phone is a
 * `tel:` `<a>`, a wired button is a `<button>`, and an unwired one is a
 * `<span>` — the same face, no affordance, and no `disabled` grey, because it
 * is not a disabled control, it is a record of one.
 */
export function MessageActions({ actions, onSelect, className = '' }: MessageActionsProps) {
  if (actions.length === 0) return null;
  return (
    <div className={`flex w-full flex-wrap gap-1.5 ${className}`}>
      {actions.map((action, index) => {
        const row = action.kind === 'row';
        const width = row ? 'w-full' : '';
        const key = `${index}-${action.title}`;
        const label = (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{action.title}</span>
            {row && action.description ? (
              <span className="truncate text-xs text-text-muted">{action.description}</span>
            ) : null}
          </span>
        );
        const href = action.href === undefined ? null : safeHref(action.href);
        if (href) {
          return (
            <a
              key={key}
              href={href}
              target="_blank"
              /* `noopener` as well as `noreferrer`: the second implies the
                 first everywhere current, but this package is vendored into
                 apps whose browser floor is not ours to set, and a new tab
                 must not get a handle on the dashboard's window. */
              rel="noopener noreferrer"
              className={`${FACE} ${HOVER} ${width}`}
            >
              {label}
              <IconExternal size={14} className="shrink-0" />
            </a>
          );
        }
        const phone = action.phone === undefined ? null : safeHref(`tel:${action.phone}`);
        if (phone) {
          return (
            <a key={key} href={phone} className={`${FACE} ${HOVER} ${width}`}>
              <IconPhone size={14} className="shrink-0" />
              {label}
            </a>
          );
        }
        /* A link or call button whose target was refused stops here rather
           than falling through to `onSelect`. It was never the contact's
           button to press, and turning a rejected URL into a working click
           handler is the one outcome worse than not rendering the link. */
        const declared = action.href !== undefined || action.phone !== undefined;
        if (onSelect && !declared) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(action, index)}
              className={`${FACE} ${HOVER} ${width}`}
            >
              {label}
            </button>
          );
        }
        return (
          <span key={key} className={`${FACE} ${width}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
