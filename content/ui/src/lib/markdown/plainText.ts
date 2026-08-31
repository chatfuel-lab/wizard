import { parseMarkdown } from './blocks';
import type { MarkdownBlock, MarkdownSpan } from './types';

function spansToText(spans: MarkdownSpan[]): string {
  return spans
    .map((span) => {
      switch (span.kind) {
        case 'text':
          return span.text;
        case 'code':
          return span.text;
        default:
          return spansToText(span.spans);
      }
    })
    .join('');
}

function blocksToText(blocks: MarkdownBlock[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case 'paragraph':
      case 'heading':
        out.push(spansToText(block.spans));
        break;
      case 'list':
        for (const item of block.list.items) {
          out.push(spansToText(item.spans));
          for (const child of item.child?.items ?? []) out.push(spansToText(child.spans));
        }
        break;
      case 'quote':
        out.push(...blocksToText(block.blocks));
        break;
      case 'code':
        out.push(block.code);
        break;
      case 'table':
        if (block.header) out.push(block.header.map(spansToText).join(' '));
        for (const row of block.rows) out.push(row.map(spansToText).join(' '));
        break;
      case 'rule':
        break;
    }
  }
  return out;
}

/**
 * The words, with the markup taken off.
 *
 * For the places a message is quoted rather than rendered: the conversation
 * list's preview line, a document title, the accessible name of a collapsed
 * card. A regex sweep over the raw text is the usual shortcut and it leaves
 * table pipes and list bullets behind; this walks the same tree the renderer
 * does, so the two never disagree about what the message says.
 */
export function markdownToPlainText(text: string): string {
  return blocksToText(parseMarkdown(text)).join(' ').replace(/\s+/g, ' ').trim();
}
