import type { QuickReplyBarProps } from '../contracts';

/**
 * The options the assistant is holding open, as chips under its last message.
 *
 * `suggest_quick_reply` is how it asks a question with answers attached — one
 * frontend action per option, three in a row in practice — and picking one
 * simply sends its text, because that is all the API does with it. There is no
 * "chose option 2" on the wire; the assistant reads the sentence back like any
 * other reply, which is why the chips are shaped like an outgoing message
 * rather than like buttons on a form.
 *
 * They are disabled, not hidden, while an approval is pending: sending anything
 * then IS a rejection of the batch (guide.md), and a control that quietly
 * disappears teaches nothing about why. No tooltip explains the disabled state,
 * because `disabled` covers two causes — a pending approval and a running loop
 * — and only the composer is told which; a hint that is right half the time is
 * worse than the shape of a chip that plainly cannot be clicked.
 */
export function QuickReplyBar({ replies, onPick, disabled }: QuickReplyBarProps) {
  if (replies.length === 0) return null;

  return (
    <div role="group" aria-label="Suggested replies" className="flex flex-wrap gap-1.5">
      {replies.map((text, index) => (
        <button
          key={`${index}-${text}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(text)}
          className="max-w-full rounded-bubble border border-border bg-surface-raised px-3 py-1.5 text-left text-label text-text transition-colors duration-fast ease-standard hover:border-accent hover:text-accent focus-visible:focus-ring disabled:cursor-not-allowed disabled:border-border disabled:text-text-faint disabled:hover:border-border"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
