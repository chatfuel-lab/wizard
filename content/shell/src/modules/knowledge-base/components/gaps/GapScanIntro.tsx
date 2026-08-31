import { Button, Card, IconSparkles } from '~ui';
import { GapLimits } from './GapLimits';
import { MAX_CONTACTS, MAX_CONVERSATIONS, MESSAGES_PER_CONVERSATION } from '../../lib/gapScanPolicy';

export interface GapScanIntroProps {
  onScan: () => void;
}

/**
 * What the reader sees before the first sweep.
 *
 * It says what the scan reads and how far back it looks before anybody spends
 * the API calls. The half every "AI insights" panel leaves out - what it CANNOT
 * see - is one hover away in `GapLimits` rather than a second card: it has to
 * be reachable, because a report that hides its blind spots reads as a census,
 * but it does not have to be the tallest thing on a page nobody has run yet.
 */
export function GapScanIntro({ onScan }: GapScanIntroProps) {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-accent">
              <IconSparkles size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-heading font-semibold text-text">The questions your assistant handed over</h2>
              <p className="mt-1 text-body text-text-muted">
                A scan reads the {MAX_CONTACTS} most recent chats on this bot and keeps the ones where the assistant
                gave up and passed the customer to a person. It opens up to {MAX_CONVERSATIONS} of those, reads the last{' '}
                {MESSAGES_PER_CONVERSATION} messages of each, and pulls out the question that was asked just before the
                hand-off. Questions worded differently are grouped by the words they share.
              </p>
              <p className="mt-2 text-body text-text-muted">
                Nothing is written, sent or changed. Running it costs a handful of requests, which is why it only ever
                runs when you ask.
              </p>
            </div>
          </div>
          {/* Deliberately NOT wired to `data-knowledge-create`: `n` and the
              palette's create action are for adding a row, and a keystroke
              nothing on screen advertises should not spend sixty requests. */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={onScan}>
              Scan conversations
            </Button>
            <GapLimits />
          </div>
        </div>
      </Card>
    </div>
  );
}
