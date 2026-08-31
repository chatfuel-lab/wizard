import { useState } from 'react';
import { Collapsible } from '~ui';
import { applyKind } from '../../lib/composerDraft';
import { tileMedia } from '../../lib/formatTiles';
import { problemFor, type PostProblem } from '../../lib/postValidation';
import type { MediaSources } from '../../hooks/useMediaSources';
import type { MediaItem, NewPost } from '../../types';
import { FormatTiles } from './FormatTiles';
import { PostCard } from './PostCard';
import { ReelFields } from './ReelFields';

export interface ComposerFormProps {
  draft: NewPost;
  onDraft: (next: NewPost) => void;
  /**
   * Separate from `onDraft` because media arrives late: an upload resolves
   * seconds after it was dropped, and applying it to the draft this render
   * closed over would throw away whatever was typed while it was in flight.
   */
  onAddMedia: (items: MediaItem[]) => void;
  /** Already filtered — nothing is red until somebody has tried to do something. */
  problems: readonly PostProblem[];
  sources: MediaSources;
  disabled?: boolean;
  onPickLibrary: () => void;
}

/**
 * Everything that decides what gets sent, in one column.
 *
 * Three things stacked and nothing beside them: which of the four formats this
 * is, the post, and — on a Reel only — the three settings a Reel has. Nothing
 * stretches: the column is as tall as those three, because the modal around it
 * is sized by what is in it rather than by the window.
 *
 * Nothing here is conditional on a flag that means "this would not work" — a
 * control that cannot do its job is absent, not disabled with a note beside it.
 * A Story has no caption region because the API has nowhere to put one; the
 * Reel settings exist only on a Reel; and the time control lives in the footer,
 * beside the button whose meaning it changes.
 *
 * Pure props on purpose. Every decision it draws — what a kind accepts, what
 * survives a kind change, what shape a format is seen in, what is wrong with the
 * post, which figures are worth showing — is a function in `lib/` with a test,
 * and this file is the wiring between those and the design system.
 */
export function ComposerForm({
  draft,
  onDraft,
  onAddMedia,
  problems,
  sources,
  disabled = false,
  onPickLibrary,
}: ComposerFormProps) {
  const [reelOpen, setReelOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FormatTiles
        value={draft.kind}
        onChange={(kind) => onDraft(applyKind(draft, kind))}
        preview={tileMedia(draft)}
        disabled={disabled}
      />

      <PostCard
        draft={draft}
        onDraft={onDraft}
        onAddMedia={onAddMedia}
        problems={problems}
        sources={sources}
        disabled={disabled}
        onPickLibrary={onPickLibrary}
      />

      {/* A plain disclosure under the card rather than a second bordered box:
          three fields on one kind out of four do not need a frame of their own,
          and unfolding them by default would push the writing down the screen
          for everybody. */}
      {draft.kind === 'reel' ? (
        <Collapsible open={reelOpen} onOpenChange={setReelOpen} trigger="Reel settings">
          <div className="pt-3">
            <ReelFields
              options={draft.reel ?? {}}
              onChange={(reel) => onDraft({ ...draft, reel })}
              disabled={disabled}
              error={problemFor(problems, 'cover')}
            />
          </div>
        </Collapsible>
      ) : null}
    </div>
  );
}
