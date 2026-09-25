import { useState, type FormEvent } from 'react';
import {
  Avatar,
  Button,
  EmptyState,
  IconFacebook,
  IconHeart,
  IconImage,
  IconInstagram,
  IconMessageCircle,
  IconPlay,
  IconSend,
  Input,
  Spinner,
} from '~ui';
import type { PostContext } from '../../hooks/usePostContext';
import type { PreviewComment } from '../../hooks/usePreviewSession';

export interface CommentPreviewProps {
  platform: 'instagram' | 'facebook';
  /** Whose post it is: the @handle or the page name. */
  accountName: string;
  post: PostContext;
  /** A session exists and nothing is in flight — a comment can be sent. */
  ready: boolean;
  /** A start is in flight. */
  starting: boolean;
  /** The start was refused — the sentence to show. */
  startError: string | null;
  onStart: () => void;
  comment: PreviewComment | null;
  publicReply: string | null;
  /** The automation answers comments in the DM as well (`PrivateReply` ≠ `DontReply`). */
  sendsDirectMessage: boolean;
  /** A DM has already arrived in the thread behind the post. */
  directMessageArrived: boolean;
  onSend: (text: string) => void;
  onTestDMs: () => void;
}

/**
 * The comment test: a post, the tester's comment on it, and the automation's
 * public reply nested under the comment — the dashboard's test panel for
 * Instagram · Posts & Reels and Facebook · Post comments.
 *
 * One comment per attempt: once it is sent the field goes, and Restart in the
 * panel header is how a second one is tried. When the automation answers in
 * the DM too, "AI agent sent a direct message" offers Test DMs, which hands
 * over to the ordinary chat where the conversation carries on.
 *
 * Pure from props — the render test draws each state.
 */
export function CommentPreview({
  platform,
  accountName,
  post,
  ready,
  starting,
  startError,
  onStart,
  comment,
  publicReply,
  sendsDirectMessage,
  directMessageArrived,
  onSend,
  onTestDMs,
}: CommentPreviewProps) {
  const [draft, setDraft] = useState('');
  const PlatformIcon = platform === 'instagram' ? IconInstagram : IconFacebook;
  const waiting = comment !== null && comment.error === null && publicReply === null && !directMessageArrived;
  const showDmFooter = sendsDirectMessage && comment !== null && (publicReply !== null || directMessageArrived);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !ready) return;
    setDraft('');
    onSend(text);
  };

  if (!ready && comment === null) {
    return (
      <EmptyState
        icon={<IconPlay />}
        title={startError ? 'The test could not start' : 'Leave a test comment'}
        description={
          startError ??
          'A comment on one of the posts this automation watches — it answers the way it answers a real one.'
        }
        action={
          <Button variant="primary" size="sm" loading={starting} onClick={onStart}>
            {startError ? 'Try again' : 'Start'}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised">
        <header className="flex items-center gap-2 px-3 py-2">
          <Avatar name={accountName} size={24} />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text">{accountName}</span>
          <PlatformIcon size={14} className="text-text-faint" />
        </header>

        {post.loading ? (
          <div className="flex aspect-square items-center justify-center bg-surface-sunken">
            <Spinner />
          </div>
        ) : post.imageUrl ? (
          <img src={post.imageUrl} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div
            className="flex aspect-square flex-col items-center justify-center gap-1 bg-surface-sunken text-text-faint"
            aria-label="No picture"
          >
            <IconImage size={24} />
            {post.postId === null ? <span className="text-xs">Any post</span> : null}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 pt-2 text-text-muted" aria-hidden>
          <IconHeart size={16} />
          <IconMessageCircle size={16} />
          <IconSend size={16} />
        </div>
        {post.text ? (
          <p className="line-clamp-3 px-3 pt-1 text-xs text-text">
            <span className="font-semibold">{accountName}</span> {post.text}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 px-3 py-3">
          {comment ? (
            <>
              <div className="flex items-start gap-2">
                <Avatar name="You" size={24} />
                <div className="min-w-0 text-xs">
                  <p className="text-text">
                    <span className="font-semibold">You (test)</span> {comment.text}
                  </p>
                  <p className="text-text-faint">{comment.sending ? 'Sending…' : 'Now · Reply'}</p>
                  {comment.error ? <p className="text-danger">{comment.error}</p> : null}
                </div>
              </div>
              {publicReply !== null ? (
                <div className="ml-8 flex items-start gap-2">
                  <Avatar name={accountName} size={20} />
                  <p className="min-w-0 text-xs text-text">
                    <span className="font-semibold">{accountName}</span> {publicReply}
                  </p>
                </div>
              ) : waiting ? (
                <div className="ml-8 flex items-center gap-2 text-xs text-text-muted" aria-live="polite">
                  <Spinner size={12} />
                  Waiting for the reply…
                </div>
              ) : null}
            </>
          ) : (
            <form onSubmit={submit} className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className="h-field-sm flex-1 text-xs"
              />
              <Button type="submit" variant="ghost" size="sm" disabled={!draft.trim() || !ready}>
                Post
              </Button>
            </form>
          )}
        </div>
      </article>

      {showDmFooter ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-card border border-border bg-surface-sunken px-3 py-2">
          <span className="text-xs text-text">AI agent sent a direct message</span>
          <Button variant="secondary" size="sm" onClick={onTestDMs}>
            Test DMs
          </Button>
        </div>
      ) : null}
    </div>
  );
}
