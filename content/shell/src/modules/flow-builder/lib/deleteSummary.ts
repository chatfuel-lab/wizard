/**
 * What the delete confirmation says is about to go.
 *
 * A sentence rather than a component because it is the only warning there is:
 * `DeleteBlock` has no inverse, so this is read once, acted on once, and the
 * result cannot be walked back. Everything it can get wrong — an off-by-one
 * plural, a count that forgets the elements inside the blocks, a name that is
 * missing — is arithmetic and grammar over a list, which is to say it is
 * testable, which is why it is not sitting inside the Dialog.
 *
 * It deliberately does not repeat the title. The Dialog already asks "Delete 3
 * blocks?"; this says what that costs.
 */
export interface DeletableBlock {
  name: string;
  blockElements: readonly unknown[];
}

export function deleteSummary(blocks: readonly DeletableBlock[]): string {
  if (blocks.length === 0) return '';

  const elements = blocks.reduce((total, block) => total + block.blockElements.length, 0);

  if (blocks.length === 1) {
    const [only] = blocks;
    const named = `“${only.name}”`;
    return elements === 0
      ? `${named} and its connections will be deleted.`
      : `${named}, its ${elements} ${elements === 1 ? 'element' : 'elements'} and its connections will be deleted.`;
  }

  /* The count, not the names. A marquee over twenty blocks is the case this
     warning exists for, and twenty names in a paragraph is not something
     anybody reads before clicking the red button. */
  return elements === 0
    ? `These ${blocks.length} blocks and all their connections will be deleted.`
    : `These ${blocks.length} blocks, their ${elements} ${
        elements === 1 ? 'element' : 'elements'
      } and all their connections will be deleted.`;
}
