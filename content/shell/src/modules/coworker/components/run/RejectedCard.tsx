import { Button, IconWarning } from '~ui';
import { CoworkerUserMessageRejectionReason, FileType } from '~api/generated/coworker/graphql';
import { humanize } from '../../lib/toolCalls';
import type { RejectedCardProps } from '../contracts';

/**
 * The other half of `pendingAction`: a message the server refused to accept.
 *
 * It is conversation state, not a failed send, and it stays until it is
 * resolved one way or the other — so it is drawn where the message would have
 * been, holding its text, with the only two exits the API has: abort it, or
 * send a replacement.
 *
 * Exactly one reason exists today (`InvalidAttachments`), and its name is not
 * an explanation. Video and audio files are refused outright by the attachment
 * endpoint; a voice note is a different mutation entirely
 * (`coworkerConversationSendAudioMessage`, the mic button). Saying that is the
 * difference between a dead end and a next step, so the table below says it —
 * and falls back to the code itself for a reason the API gains later, because
 * a name a person can Google beats a shrug.
 */

interface Explanation {
  title: string;
  detail: string;
  /** What the resend button offers, when the text can go on its own. */
  resend: string;
}

const REASONS: Record<string, Explanation> = {
  [CoworkerUserMessageRejectionReason.InvalidAttachments]: {
    title: 'That attachment could not be sent',
    detail:
      'The assistant reads images and documents. Video and audio files are refused — record a voice note with the mic instead.',
    resend: 'Send the text only',
  },
};

const FALLBACK: Explanation = {
  title: 'The assistant refused this message',
  detail: 'It was not accepted, so nothing was sent.',
  resend: 'Send it again',
};

/** "a video and an image" is more than this needs; the count and the kind is not. */
function attachmentLine(attachments: readonly { type: FileType }[]): string | null {
  if (attachments.length === 0) return null;
  const kinds = [...new Set(attachments.map((file) => file.type.toLowerCase()))];
  const what = kinds.length === 1 ? kinds[0]! : 'file';
  return attachments.length === 1 ? `1 ${what} attached` : `${attachments.length} ${what}s attached`;
}

export function RejectedCard({ rejected, onAbort, onResend }: RejectedCardProps) {
  const explanation = REASONS[rejected.reason] ?? {
    ...FALLBACK,
    title: `${FALLBACK.title} (${humanize(rejected.reason)})`,
  };
  const text = rejected.rejectedMessage.content?.trim() ?? '';
  const attached = attachmentLine(rejected.rejectedMessage.attachments ?? []);

  return (
    <div role="alert" className="rounded-card border border-danger/40 bg-danger-soft p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-px shrink-0 text-danger">
          <IconWarning size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-label font-semibold text-text">{explanation.title}</h3>
          <p className="mt-0.5 text-meta text-text-muted">{explanation.detail}</p>

          {text === '' ? null : (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-card border border-border bg-surface-raised px-3 py-2 text-body text-text">
              {text}
            </p>
          )}
          {attached === null ? null : <p className="mt-1 text-micro text-text-faint">{attached}</p>}

          <div className="mt-2.5 flex flex-wrap gap-2">
            {text === '' ? null : (
              <Button size="sm" variant="secondary" onClick={() => onResend(text)}>
                {explanation.resend}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onAbort}>
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
