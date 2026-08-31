import {
  IconBook,
  IconExternal,
  IconFile,
  IconImage,
  IconInfo,
  IconLayoutList,
  IconMic,
  IconPlay,
  IconPointer,
  IconWarning,
  Tag,
} from '~ui';
import type { MessageShape } from '../../lib/messageKinds';

/**
 * A message whose content is not on the wire, said in words.
 *
 * Sixty of the schema's seventy-three message typenames have payload fields
 * that this module's operations document does not select, so the thread
 * knows a video arrived and cannot show it. The honest rendering of that is a
 * chip naming what arrived — "Video", "Document", "List message" — beside the
 * timestamp and the delivery ticks, which ARE known and are most of what an
 * operator is scanning for.
 *
 * What it replaces printed the de-camel-cased typename followed by
 * "(not rendered yet)", which is a note to a developer sitting in the customer
 * conversation: "Out text and buttons (not rendered yet)".
 *
 * `Tag` rather than a local chip on purpose — `~ui` owns the chip and the
 * module had grown its own copy of it under the name `AttachmentChip`.
 *
 * The glyph map is exported: the chat list's preview line uses the same
 * shape → icon reading for "▣ Photo", so the two cannot drift.
 */
export const SHAPE_GLYPH: Record<MessageShape, typeof IconFile> = {
  /* 'text' never reaches here — a text payload is always rendered — but the
     map is total so that adding a shape is a compile error rather than an
     `undefined` component. */
  text: IconFile,
  image: IconImage,
  video: IconPlay,
  audio: IconMic,
  document: IconFile,
  buttons: IconPointer,
  list: IconLayoutList,
  template: IconBook,
  /* A comment did not arrive in the thread at all — it was left on a post, a
     reel or an ad and routed here, and the arrow is the only glyph in the set
     that says "from somewhere else". */
  comment: IconExternal,
  story: IconImage,
  tap: IconPointer,
  placeholder: IconWarning,
  unknown: IconWarning,
  system: IconInfo,
};

/** The two shapes that mean something went wrong rather than something arrived. */
const WARNS: ReadonlySet<MessageShape> = new Set<MessageShape>(['placeholder', 'unknown']);

export function DescribedBubble({ shape, label }: { shape: MessageShape; label: string }) {
  const Glyph = SHAPE_GLYPH[shape];
  return (
    <Tag tone={WARNS.has(shape) ? 'warning' : 'neutral'}>
      <Glyph size={12} className="mr-1 shrink-0" />
      {label}
    </Tag>
  );
}
