import type { ReactNode } from 'react';
import { Markdown } from '~ui';

/**
 * What the assistant said.
 *
 * Assistant content is markdown — `**bold**`, `-` lists and fenced ```json
 * blocks all appeared in three short answers in practice — so it is
 * rendered as markdown, by the design system's own `Markdown`, which parses to
 * a block list rather than to HTML: nothing a model wrote is ever handed to
 * `dangerouslySetInnerHTML` in a surface whose text comes from something that
 * just read the operator's account.
 *
 * `Markdown` is also streaming-safe, which is the reason it can be used here at
 * all. The same text arrives one token at a time, so a half-written `**bo`, an
 * unclosed fence and a half-typed table all have to render as stable text that
 * does not flash into something else when the next chunk lands.
 *
 * `trailing` goes THROUGH this component rather than beside it because the one
 * thing it ever carries — `StreamingText`'s caret — has to sit at the end of
 * the last line, inline with the words. A sibling element lands on its own line
 * under the paragraph, which reads as an empty prompt rather than as writing in
 * progress; only `Markdown` knows which block holds the last word.
 */
export function MessageContent({
  text,
  trailing,
  compact = false,
}: {
  text: string;
  trailing?: ReactNode;
  compact?: boolean;
}) {
  return <Markdown text={text} compact={compact} trailing={trailing} />;
}
