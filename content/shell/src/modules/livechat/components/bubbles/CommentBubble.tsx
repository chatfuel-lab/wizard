import { IconExternal, IconImage, IconWarning, safeHref } from '~ui';
import type { CommentSource } from '../../lib/messagePayload';

export interface CommentBubbleProps {
  text: string;
  /** What it was a comment on; null for an outgoing public reply. */
  source: CommentSource | null;
  /** The kinds-table sentence: "Comment on a reel", "Public reply to a comment". */
  label: string;
}

const SOURCE_NOUN: Record<CommentSource['kind'], string> = {
  post: 'Post',
  reel: 'Reel',
  ad: 'Ad',
  story: 'Story',
  unknown: 'Post',
};

/**
 * A comment did not arrive in the thread — it was left on a post, a reel, an
 * ad or a story and routed here — so the bubble says what it was left on
 * before it says what was said: a small source card (thumbnail, owner,
 * caption, a link out to the media) and then the comment text.
 *
 * `isUnknown` on the media is the schema's "render a placeholder and ignore
 * the other fields", so that card is a single line, "Post unavailable".
 * Facebook says only that a post exists; TikTok gives a URL and nothing else;
 * both get a card with what they have. An outgoing public reply is tied to no
 * media on the wire and gets a quiet label instead of a card.
 */
export function CommentBubble({ text, source, label }: CommentBubbleProps) {
  return (
    <div>
      {source ? <SourceCard source={source} /> : <div className="mb-1 text-xs opacity-70">{label}</div>}
      <div className="whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function SourceCard({ source }: { source: CommentSource }) {
  const noun = SOURCE_NOUN[source.kind];
  if (source.kind === 'unknown') {
    return (
      <div className="mb-1.5 flex items-center gap-1.5 rounded-control border border-border bg-surface-sunken px-2 py-1.5 text-xs text-text-muted">
        <IconWarning size={12} className="shrink-0" />
        {noun} unavailable
      </div>
    );
  }
  const heading = source.owner ? `@${source.owner}` : noun;
  /* The media address is whatever the platform sent with the comment, so it
     goes through `safeHref` before it becomes a link — and the card falls back
     to the non-clickable form, which is the same one an unlinked source gets. */
  const href = source.url ? safeHref(source.url) : null;
  const body = (
    <>
      {source.thumbnailUrl ? (
        <img src={source.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-chip object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-surface-raised text-text-faint">
          <IconImage size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-xs font-medium text-text">
          <span className="truncate">{heading}</span>
          {source.owner ? <span className="shrink-0 font-normal text-text-faint">· {noun}</span> : null}
          {href ? <IconExternal size={12} className="ml-auto shrink-0 text-text-faint" /> : null}
        </span>
        {source.caption ? <span className="line-clamp-2 text-xs text-text-muted">{source.caption}</span> : null}
      </span>
    </>
  );
  const face =
    'mb-1.5 flex w-full items-center gap-2 rounded-control border border-border bg-surface-sunken p-1.5 text-left';
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={`${face} transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring`}
      >
        {body}
      </a>
    );
  }
  return <div className={face}>{body}</div>;
}
