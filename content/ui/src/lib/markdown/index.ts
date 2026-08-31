/**
 * A markdown subset, parsed into a block list.
 *
 * ## Why this is hand-rolled
 *
 * The assistant is the one surface in this product that renders model output,
 * and model output is markdown: bold runs, `-` lists, fenced code. Rendering it
 * as `whitespace-pre-wrap` is what the coworker module does today.
 *
 * The obvious fix is a dependency, and this repository has repeatedly decided
 * against one for exactly this class of problem: the drag-and-drop layer and
 * the entire calendar are hand-rolled here. A markdown subset is smaller than
 * either. It is also the safer half of the trade — the popular renderers hand
 * back an HTML string, which has to be sanitised and then injected through
 * `dangerouslySetInnerHTML`, and one gap in the sanitiser is a script running
 * inside the operator's dashboard on text a language model wrote. Producing a
 * tree of plain objects that React renders as elements has no such gap: there
 * is no HTML anywhere in the pipeline, so there is nothing to escape.
 *
 * ## Why it is a separate module with tests
 *
 * Streaming. The same text arrives one token at a time and is re-parsed on
 * every frame, so the parse has to be *stable*: what is on screen must not
 * flash or restructure when the next chunk lands. That is a property of the
 * grammar, not of the component, and it is only checkable in a test.
 *
 * The three rules that keep it stable, each of which was a choice against the
 * more literal reading of the format:
 *
 * 1. **An unterminated fence is a code block**, not a paragraph that happens to
 *    start with three backticks. Half of every streamed code block is
 *    unterminated, and the alternative renders the code as prose and then
 *    snaps it into a box on the closing fence.
 * 2. **A line starting with a pipe is a table row immediately**, before any
 *    delimiter row proves it is a table. The columns are laid out from the
 *    first line and stay laid out; when the `|---|---|` row arrives the first
 *    row is promoted to a header. Cells do not move — only their weight
 *    changes. Waiting for the delimiter row means rendering a paragraph of
 *    pipes and then replacing it with a grid.
 * 3. **An unmatched delimiter is literal text.** A half-written `**bo` renders
 *    as the four characters `**bo`. Speculatively emboldening an unclosed run
 *    is worse than it sounds: the weight of the tail flips on every token, and
 *    it flips back when the run turns out to be a multiplication sign.
 *
 * What is deliberately absent, and why:
 *
 * - **Setext headings** (a title underlined with `===` or `---`). They make a
 *   paragraph retroactively become a heading, which is the exact reflow rule 2
 *   exists to avoid, and no model emits them.
 * - **Images.** An image renders as its alt text. A remote image URL from a
 *   language model is an outbound request from the operator's dashboard to a
 *   host the model chose; the alt text costs nothing and leaks nothing.
 * - **Raw HTML.** It is text. `<b>x</b>` renders as those eight characters,
 *   which is both the safe reading and the honest one.
 * - **Reference links, footnotes, definition lists.** Not emitted by any
 *   assistant this renders, and each one is a second pass over the whole
 *   document to resolve.
 */

export type { MarkdownBlock, MarkdownList, MarkdownListItem, MarkdownSpan, TableAlign } from './types';
export { safeHref, safeAppHref } from './href';
export { parseInline } from './inline';
export { parseMarkdown, type ParseMarkdownOptions } from './blocks';
export { markdownToPlainText } from './plainText';
