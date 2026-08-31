import type { ReactNode } from 'react';
import { AsciiMark } from './AsciiMark';

export interface ThreadEmptyProps {
  /**
   * The message box. Passed in rather than mounted here because the composer
   * belongs to another part of this module — and because an empty thread and a
   * full one must be the same box, or the operator learns two of them.
   */
  composer: ReactNode;
}

/**
 * A conversation with nothing in it yet: one question, and the box.
 *
 * This screen used to be a wall of thirteen picture cards from
 * `Query.env.homePageCards` — server-authored suggestions with marketing
 * renders on them ("Generate FAQ carousel", "Perform a full audit of your
 * Instagram profile"). All of it is gone, deliberately, and the whole feature
 * with it.
 *
 * Two reasons, and the second settles it. The pictures were fetched from a
 * Google Storage bucket, which is a third-party domain loading inside a
 * dashboard that is meant to be white-labelled. And the suggestions themselves
 * are product-specific copy: they name Instagram Reels, WhatsApp click-to-ads
 * and carousels, which is one company's feature list pushed into the first
 * screen of a general assistant. An assistant does not open with an
 * advertisement for the things it can sell you.
 *
 * What is left is what every assistant worth using opens with: a line saying
 * what it is for, and somewhere to type. The box sits in the middle of the
 * screen rather than pinned to the floor, because on an empty conversation it
 * is not a footer — it is the page.
 */
export function ThreadEmpty({ composer }: ThreadEmptyProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-prose flex-col justify-center gap-5 px-gutter py-10">
        <header className="text-center">
          <AsciiMark />
          <h2 className="mt-3 text-heading font-medium text-text @compact:text-title">What can I help you with?</h2>
          <p className="mx-auto mt-1.5 text-body text-text-muted">
            Ask about this bot, or have me change it — I check with you before anything is written.
          </p>
        </header>
        {composer}
      </div>
    </div>
  );
}
