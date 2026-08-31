import { Fragment, type ReactNode } from 'react';
import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownList,
  type MarkdownSpan,
  type TableAlign,
} from '../lib/markdown';
import { CodeBlock } from './CodeBlock';

export interface MarkdownProps {
  /** The message. Re-parsed on every render — see the note on streaming below. */
  text: string;
  /** Tighter spacing and a smaller table, for the dock's narrow column. */
  compact?: boolean;
  /**
   * Rendered at the end of the last line of the last block.
   *
   * This exists for one caller: `StreamingText`, whose caret has to sit after
   * the final word rather than on a line of its own. A caret rendered as a
   * sibling of the markdown lands under it, because the last block is a
   * paragraph and a paragraph is a block box — so the caret has to go INSIDE
   * that paragraph, and only this component knows which one it is. When the
   * last block cannot hold an inline node — a code block, a table, a rule — it
   * is rendered after, which is the honest fallback and looks fine because
   * those blocks end in a border rather than in a word.
   */
  trailing?: ReactNode;
  className?: string;
}

/* Two size scales, chosen by `compact`. The dock is a 320px column beside the
   thread and the same heading that anchors a full-width answer shouts in it. */
const HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: 'text-title font-semibold text-text',
  2: 'text-heading font-semibold text-text',
  3: 'text-body font-semibold text-text',
};

const COMPACT_HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: 'text-heading font-semibold text-text',
  2: 'text-body font-semibold text-text',
  3: 'text-label font-semibold text-text',
};

const ALIGN_CLASSES: Record<TableAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

function renderSpans(spans: MarkdownSpan[]): ReactNode {
  return spans.map((span, index) => {
    const key = index;
    switch (span.kind) {
      case 'text':
        return <Fragment key={key}>{span.text}</Fragment>;
      case 'strong':
        return (
          <strong key={key} className="font-semibold">
            {renderSpans(span.spans)}
          </strong>
        );
      case 'em':
        return (
          <em key={key} className="italic">
            {renderSpans(span.spans)}
          </em>
        );
      case 'code':
        /* Relative, not a role from the type scale, and this is the one place
           that is right: a monospace face renders visibly larger than the sans
           at the same size, and this span appears inside body text, inside a
           text-meta table cell and inside a compact heading. A fixed role would
           be correct in one of the three and wrong in the other two. */
        return (
          <code key={key} className="rounded-chip bg-surface-sunken px-1 py-0.5 font-mono text-[0.9em] text-text">
            {span.text}
          </code>
        );
      case 'link':
        return (
          /* Every href here has already been through `safeHref`; a target this
             renders is one of four schemes and never a relative path. The rel
             is still required: `noopener` because a new tab must not get a
             handle on the dashboard's window, `noreferrer` because the
             operator's URL is not the linked host's business. */
          <a
            key={key}
            href={span.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 transition-colors duration-fast ease-standard hover:text-accent-hover focus-visible:focus-ring"
          >
            {renderSpans(span.spans)}
          </a>
        );
    }
  });
}

function renderList(list: MarkdownList, compact: boolean, trailing?: ReactNode): ReactNode {
  const Tag = list.ordered ? 'ol' : 'ul';
  const marker = list.ordered ? 'list-decimal' : 'list-disc';
  const lastIndex = list.items.length - 1;
  return (
    <Tag
      start={list.ordered ? list.start : undefined}
      className={`${marker} pl-5 text-body text-text ${compact ? 'space-y-0.5' : 'space-y-1'}`}
    >
      {list.items.map((item, index) => (
        <li key={index} className="whitespace-pre-wrap break-words marker:text-text-faint">
          {renderSpans(item.spans)}
          {index === lastIndex && item.child === undefined ? trailing : null}
          {item.child ? (
            <div className="mt-1">{renderList(item.child, compact, index === lastIndex ? trailing : undefined)}</div>
          ) : null}
        </li>
      ))}
    </Tag>
  );
}

/**
 * One block. `trailing` is only ever passed for the last one — see the prop.
 *
 * Returns the node and whether it managed to place `trailing`, so the caller
 * can render it itself when the block could not.
 */
function renderBlock(
  block: MarkdownBlock,
  compact: boolean,
  trailing: ReactNode | undefined,
): { node: ReactNode; placed: boolean } {
  switch (block.kind) {
    case 'paragraph':
      return {
        /* `whitespace-pre-wrap`, which markdown proper would not do: a single
           newline is a soft break there and collapses to a space. Models write
           chat, not documents, and they put line breaks where they mean them —
           an address, a list of ids, a signature. Collapsing those runs the
           lines together and looks like a rendering bug. */
        node: (
          <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-text">
            {renderSpans(block.spans)}
            {trailing}
          </p>
        ),
        placed: true,
      };
    case 'heading': {
      const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1];
      const classes = compact ? COMPACT_HEADING_CLASSES[block.level] : HEADING_CLASSES[block.level];
      /* h3 and down, never h1: this renders inside a thread that already has
         a page heading, and a document outline with two h1s in it is worse
         for a screen reader than one that starts deep. */
      return {
        node: (
          <Tag className={`break-words ${classes}`}>
            {renderSpans(block.spans)}
            {trailing}
          </Tag>
        ),
        placed: true,
      };
    }
    case 'list':
      return { node: renderList(block.list, compact, trailing), placed: true };
    case 'quote':
      return {
        node: (
          <blockquote className="border-l-2 border-border-strong pl-3 text-text-muted">
            <MarkdownBlocks blocks={block.blocks} compact={compact} />
          </blockquote>
        ),
        placed: false,
      };
    case 'code':
      return {
        node: (
          <CodeBlock
            code={block.code}
            language={block.language}
            streaming={!block.closed}
            maxHeight={compact ? 260 : 420}
          />
        ),
        placed: false,
      };
    case 'table':
      return { node: <MarkdownTable block={block} compact={compact} />, placed: false };
    case 'rule':
      return { node: <hr className="border-t border-border" />, placed: false };
  }
}

function MarkdownTable({ block, compact }: { block: Extract<MarkdownBlock, { kind: 'table' }>; compact: boolean }) {
  const align = (index: number) => ALIGN_CLASSES[block.align[index] ?? 'start'];
  const cell = compact ? 'px-2 py-1' : 'px-2.5 py-1.5';
  return (
    /* The same containment argument as CodeBlock's: a six-column table inside
       a thread has to scroll in its own box, or it widens everything above it. */
    <div className="min-w-0 overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-meta">
        {block.header ? (
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {block.header.map((cells, index) => (
                <th key={index} className={`${cell} ${align(index)} font-semibold text-text`}>
                  {renderSpans(cells)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border-subtle last:border-b-0">
              {row.map((cells, index) => (
                <td key={index} className={`${cell} ${align(index)} align-top text-text`}>
                  {renderSpans(cells)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownBlocks({
  blocks,
  compact,
  trailing,
}: {
  blocks: MarkdownBlock[];
  compact: boolean;
  trailing?: ReactNode;
}) {
  const lastIndex = blocks.length - 1;
  const rendered = blocks.map((block, index) =>
    renderBlock(block, compact, index === lastIndex ? trailing : undefined),
  );
  const placed = rendered[lastIndex]?.placed ?? false;
  return (
    <>
      {rendered.map((entry, index) => (
        <Fragment key={index}>{entry.node}</Fragment>
      ))}
      {trailing !== undefined && !placed ? <div>{trailing}</div> : null}
    </>
  );
}

/**
 * Markdown, as elements.
 *
 * The parse lives in `lib/markdown` and is documented there — including why
 * it is hand-rolled, and the three rules that make a half-arrived message
 * render as something stable. This file is the other half: which token each
 * block gets, and nothing else.
 *
 * ## On re-parsing every render
 *
 * It looks wasteful and is not the thing to optimise. The parse is a single
 * linear pass over a chat message; a `useMemo` here would cache a few hundred
 * microseconds behind a dependency that changes on literally every frame of a
 * stream, which is the one case it would have to help with. What actually
 * costs is rendering sixty times a second, and that is `StreamingText`'s job —
 * it decides how often this component is called at all.
 *
 * ## What is not here
 *
 * No `dangerouslySetInnerHTML`, anywhere, for any reason. React escapes every
 * string it renders as a child, so `<img onerror=…>` in a message is eight
 * words on a page; the moment any of this becomes an HTML string that property
 * is gone, and this text was written by a language model on the strength of
 * whatever a contact typed into a chat widget.
 */
export function Markdown({ text, compact = false, trailing, className = '' }: MarkdownProps) {
  const blocks = parseMarkdown(text);
  if (blocks.length === 0) {
    /* Nothing to render, but the caret still has to go somewhere: an assistant
       message that has been created and has not produced a character yet is
       exactly when a reader most wants to see that something is happening. */
    return trailing === undefined ? null : <div className={className}>{trailing}</div>;
  }
  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-3'} ${className}`}>
      <MarkdownBlocks blocks={blocks} compact={compact} trailing={trailing} />
    </div>
  );
}
