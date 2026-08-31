import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { IconCheck, IconCopy, IconWarning } from '../icons';

export interface CodeBlockProps {
  code: string;
  /** The word after the fence: `json`, `graphql`. Shown as the block's label. */
  language?: string | null;
  /**
   * The fence has not closed yet — the model is still writing this. Renders a
   * quieter label instead of the language, and hides the copy button: copying
   * half a JSON object produces something that does not parse, and the person
   * who pasted it finds out somewhere else.
   */
  streaming?: boolean;
  /** Ceiling before the block scrolls vertically, px. Default 420. */
  maxHeight?: number;
  /** Off for a block inside a card that already has its own copy affordance. */
  copyable?: boolean;
  className?: string;
}

/**
 * Fenced code, in a box of its own.
 *
 * ## No syntax highlighting, on purpose
 *
 * Highlighting means a tokenizer per language, which is a dependency wearing a
 * different hat — the small ones are 40kB and still only know six grammars, and
 * the assistant emits `json`, `graphql`, `bash`, `csv` and a dozen things
 * nobody anticipated. The fallback for an unknown grammar is unstyled text,
 * which is what this renders for everything: the same result, none of the
 * weight, and no language ever looks half-supported.
 *
 * ## The scroll box is the whole point
 *
 * A code block in a chat thread is the thing that breaks the layout. One long
 * line inside a flex column widens the column, which widens the thread, which
 * puts a horizontal scrollbar on the page and leaves the message bubbles
 * measured against a width nothing else has. The `min-w-0` on the wrapper is
 * what stops that: a flex item's default `min-width: auto` refuses to shrink
 * below its content, so without it `overflow-x-auto` on the `<pre>` never gets
 * to do anything at all. The scrollbar has to be here, and it has to be inside.
 */
export function CodeBlock({
  code,
  language,
  streaming = false,
  maxHeight = 420,
  copyable = true,
  className = '',
}: CodeBlockProps) {
  const { copy, copied, failed } = useCopyToClipboard();
  const label = streaming ? 'writing…' : (language ?? 'code');
  const showCopy = copyable && !streaming && code !== '';

  return (
    <div className={`min-w-0 overflow-hidden rounded-card border border-border bg-surface-sunken ${className}`}>
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-micro lowercase text-text-faint">{label}</span>
        {showCopy ? (
          <button
            type="button"
            onClick={() => copy(code)}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className="-mr-1 flex shrink-0 items-center gap-1 rounded-chip px-1.5 py-0.5 text-micro text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
          >
            {failed ? <IconWarning size={12} /> : copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {failed ? 'Press Ctrl+C' : copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </div>

      {/* `tabIndex` on the scroller, not decoration: a region that scrolls and
          cannot be focused is unreachable by keyboard, and this one is where a
          long line of JSON lives. */}
      <pre
        tabIndex={0}
        style={{ maxHeight }}
        className="overflow-auto px-3 py-2.5 font-mono text-meta leading-relaxed text-text focus-visible:focus-ring"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
