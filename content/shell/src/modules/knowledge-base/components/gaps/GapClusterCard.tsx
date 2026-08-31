import { useState } from 'react';
import { Badge, Button, Card, Collapsible, IconBook, IconPlus, Tag } from '~ui';
import { platformLabel, relativeTime, replyNote, type GapCluster } from '../../lib/gaps';

/** Samples shown when a group is expanded. Past three they all say the same thing. */
export const SAMPLES_SHOWN = 3;

export interface GapClusterCardProps {
  cluster: GapCluster;
  now: number;
  /** False without `Ai: Edit` - the FAQ page would refuse the write anyway. */
  canEdit: boolean;
  /** Seed a new FAQ with this question. */
  onCreateFaq: (question: string) => void;
  /** Open the FAQ that already covers it. */
  onOpenFaq: (key: string) => void;
  onIgnore: (question: string) => void;
  /** Rendered instead of Ignore in the "Show ignored" list. */
  ignored?: boolean;
  onRestore?: (question: string) => void;
}

/**
 * One group of questions.
 *
 * The two states it distinguishes are a genuine gap ("nobody has written this
 * down") and an answer that exists and did not fire ("the words in your FAQ
 * are not the words your customers use"). They look similar on a report and
 * need opposite work, so the second one leads with the FAQ it found and offers
 * to open it rather than offering to write a second entry beside it.
 *
 * Every number on the card is a count of real conversations. There is no score,
 * no confidence and no percentage, because there is nothing behind the words
 * here but word overlap and saying otherwise would be an invention.
 */
export function GapClusterCard({
  cluster,
  now,
  canEdit,
  onCreateFaq,
  onOpenFaq,
  onIgnore,
  ignored = false,
  onRestore,
}: GapClusterCardProps) {
  const [open, setOpen] = useState(false);
  /* Hoisted: TypeScript drops the narrowing on a property read inside a
     callback, and `cluster.faq!.key` in an onClick is a non-null assertion
     nobody should have to re-derive. */
  const faq = cluster.faq;
  const shown = cluster.samples.slice(0, SAMPLES_SHOWN);

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <Badge count={cluster.count} tone={faq ? 'muted' : 'accent'} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-heading font-semibold text-text">{cluster.question}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-text-muted">
              <span>{cluster.count === 1 ? 'asked once' : `asked by ${cluster.count} people`}</span>
              <span aria-hidden>·</span>
              <span>last {relativeTime(cluster.lastSeen, now)}</span>
              <span aria-hidden>·</span>
              <span>{cluster.platforms.map(platformLabel).join(', ')}</span>
              {cluster.allAnsweredByHuman ? <Tag tone="neutral">a person has replied</Tag> : null}
            </p>
          </div>
        </div>

        {faq ? (
          <div className="rounded-control border border-border bg-surface-sunken p-3">
            <p className="text-body text-text">
              Your FAQ already answers something close to this: <span className="font-medium">{faq.question}</span>
            </p>
            <p className="mt-1 text-meta text-text-muted">
              The assistant handed these chats over anyway, so the answer exists but did not fire. Rewriting that entry
              in the words above is more likely to help than adding a second one beside it.
            </p>
          </div>
        ) : null}

        <Collapsible
          open={open}
          onOpenChange={setOpen}
          trigger={
            open ? 'Hide the conversations' : `Show ${cluster.count === 1 ? 'the conversation' : 'the conversations'}`
          }
        >
          <ul className="flex flex-col gap-2 pt-2">
            {shown.map((sample) => (
              <li key={sample.contactId} className="rounded-control bg-surface-sunken p-3">
                <p className="text-meta text-text-muted">
                  {sample.contactName} · {platformLabel(sample.platform)} · {relativeTime(sample.askedAt, now)}
                </p>
                <p className="mt-1 text-body text-text">{sample.question}</p>
                {/* Outbound text is not in the fragment on most channels - see
                    the header of lib/gaps.ts - so this says what happened
                    rather than printing an empty quotation. */}
                <p className="mt-1.5 text-meta text-text-muted">{replyNote(sample)}</p>
              </li>
            ))}
            {cluster.samples.length > shown.length ? (
              <li className="text-meta text-text-faint">
                and {cluster.samples.length - shown.length} more conversations in this group
              </li>
            ) : null}
          </ul>
        </Collapsible>

        <div className="flex flex-wrap items-center gap-2">
          {ignored ? (
            <Button variant="secondary" size="sm" onClick={() => onRestore?.(cluster.question)}>
              Put back on the list
            </Button>
          ) : (
            <>
              {faq ? (
                <Button variant="secondary" size="sm" onClick={() => onOpenFaq(faq.key)}>
                  <IconBook />
                  Improve that answer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canEdit}
                  title={
                    canEdit ? undefined : 'Writing to the knowledge base needs the Ai: Edit permission on this bot.'
                  }
                  onClick={() => onCreateFaq(cluster.question)}
                >
                  <IconPlus />
                  Create FAQ
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onIgnore(cluster.question)}>
                Ignore
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
