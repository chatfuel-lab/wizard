import type { ReactNode } from 'react';
import { IconBolt, IconTrash, TOOL_FAMILY_ICONS, type IconProps } from '~ui';
import type { ToolGlyph } from '../../lib/toolCalls';

/**
 * The mark in front of a tool, wherever it appears.
 *
 * `~ui` ships `TOOL_FAMILY_ICONS`, keyed by the four tool families plus the
 * three built-ins, and that is where seven of these nine come from — a second
 * copy of "a skill is a book, the open web is a globe" in module code is two
 * vocabularies for one thing, which is the failure this file was written to
 * prevent in the first place.
 *
 * Two are kept, because the module knows something the family does not. Every
 * `chatfuel_gql-*` tool is family `data` and would draw one database glyph
 * whether it lists the catalogue or deletes a service — and which of those it
 * is is the single most important thing on an approval card. So the `data`
 * family splits by EFFECT here: a read keeps the family's own mark, a write is
 * a bolt, and a destroy is a bin. `lib/toolCalls.ts` decides which, from the
 * verb, and is tested there.
 *
 * The bare icon is what a `RunStep` wants — it draws its own chip and tints it
 * by the state of the run. `StepGlyph` is the chip for everywhere that is not a
 * step: the approval card's rows, which are about to run rather than done, and
 * therefore have no state to be tinted by.
 */

/* Where the module is more specific than the family. Nothing else belongs
   here: an entry that merely re-picks the family's own icon is the duplication
   this file exists to avoid. */
const BY_EFFECT: Partial<Record<ToolGlyph, (props: IconProps) => ReactNode>> = {
  write: IconBolt,
  destroy: IconTrash,
};

const FAMILY_OF: Record<ToolGlyph, keyof typeof TOOL_FAMILY_ICONS> = {
  read: 'data',
  write: 'data',
  destroy: 'data',
  navigate: 'navigation',
  skill: 'skill',
  screen: 'screen',
  docs: 'docs',
  web: 'web',
  tool: 'other',
};

/** The icon alone, unsized where the caller sizes it. */
export function toolIcon(glyph: ToolGlyph, size?: number): ReactNode {
  const Icon = BY_EFFECT[glyph] ?? TOOL_FAMILY_ICONS[FAMILY_OF[glyph]];
  return <Icon size={size} />;
}

/* Only two glyphs carry colour: the one that changed something and the one
   that destroys something. Tint them all and none of them is the one worth
   stopping at. */
const TONES: Record<ToolGlyph, string> = {
  read: 'text-text-faint',
  write: 'text-accent',
  destroy: 'text-danger',
  navigate: 'text-text-faint',
  skill: 'text-text-faint',
  screen: 'text-text-faint',
  docs: 'text-text-faint',
  web: 'text-text-faint',
  tool: 'text-text-faint',
};

export interface StepGlyphProps {
  glyph: ToolGlyph;
  /** The approval card's rows are a size up from a thread step. */
  large?: boolean;
}

export function StepGlyph({ glyph, large = false }: StepGlyphProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-chip bg-surface-sunken ${
        large ? 'size-6' : 'size-5'
      } ${TONES[glyph]}`}
    >
      {toolIcon(glyph, large ? 14 : 12)}
    </span>
  );
}
