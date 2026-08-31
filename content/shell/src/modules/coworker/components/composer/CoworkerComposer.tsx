import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  AttachmentTile,
  Button,
  Composer,
  IconMic,
  IconWarning,
  VoiceRecorder,
  formatFileSize,
  type VoiceClip,
} from '~ui';
import { useAttachments } from '../../hooks/useAttachments';
import { useEmptyThread } from '../../hooks/useEmptyThread';
import { ATTACHMENT_ACCEPT, VOICE_ACCEPT, uploadFailureText } from '../../lib/attachments';
import type { CoworkerComposerProps } from '../contracts';

/**
 * The box the operator talks to the assistant in — and four things that are
 * true about this assistant and about no other composer in the product.
 *
 * **A refused file jams the thread.** Every other composer here can send a bad
 * file and get a red bubble back. This API turns a refused attachment into a
 * `CoworkerUserMessageRejected` pending action that blocks the conversation
 * until somebody resolves it, so the rules are checked in `lib/attachments.ts`
 * before a byte is uploaded and a refusal appears on the file's own tile — in
 * the tray, next to its name, where it can be removed. Not as a toast: a toast
 * about a file you can no longer see is a sentence with no subject.
 *
 * **Audio is a different mutation.** `sendMessageWithAttachments` refuses audio
 * outright and `sendAudioMessage` takes one audio file and no text, so the tray
 * routes rather than uploads-and-hopes. See `sendPlan`.
 *
 * **The block has to be readable before anything is typed.** While an approval
 * is pending, attachments are refused by the server and a plain message is an
 * *implicit rejection of the whole batch* — a thing worth knowing before you
 * write it, not after. That is what `blocked` carries, and both halves of it
 * are stated up here rather than discovered on send.
 *
 *
 * Everything above the input row goes through `~ui`'s `attachments` slot: it is
 * the composer's own space above the textarea, inside its border, and the tray
 * is only its commonest tenant. The alternative — a second bordered strip above
 * the composer — puts the sentence explaining the box outside the box.
 */

/**
 * Whether this browser could record at all, asked without touching the
 * microphone.
 *
 * Answered before anything is rendered, because the two controls are different
 * shapes: a browser with `MediaRecorder` gets `VoiceRecorder`, one without gets
 * the file picker, and a mic button that only admits after the first click that
 * it was never going to work is the failure this decides away. Nothing is
 * prompted — a missing API is not a permission.
 */
function browserCanRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/* What the clip is called in the tray. The recorder reports the container it
   actually produced — Safari gives `audio/mp4`, not the webm everything else
   does — and a file named `.webm` holding MPEG-4 is a lie the operator reads on
   the tile. Nothing depends on it: `classifyAttachment` reads the mime type and
   only falls back to the extension when there is none. */
const VOICE_EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

function voiceNoteName(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return `voice-note.${VOICE_EXTENSION[base] ?? 'webm'}`;
}

export function CoworkerComposer({
  conversationId,
  onSendText,
  busy,
  onStop,
  blocked,
  ensureConversation,
}: CoworkerComposerProps) {
  const attachments = useAttachments(conversationId, ensureConversation);
  const { markSent } = useEmptyThread(conversationId);
  /* Rendered in the wrapper rather than inside `leftSlot`, so an <input> whose
     own file dialog is open can never be unmounted out from under the answer. */
  const voiceRef = useRef<HTMLInputElement>(null);
  /* Drag enter/leave fire for every child the pointer crosses. Counting them
     is what stops the overlay strobing as the cursor passes over a tile. */
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [micRefused, setMicRefused] = useState(false);
  const [stopping, setStopping] = useState(false);

  /* Read once. It cannot change while the composer is mounted, and asking it
     per render would be asking the same question sixty times a second. */
  const canRecord = useMemo(browserCanRecord, []);

  /* Having no conversation yet does not shut anything. Typing into an empty
     screen is HOW a conversation gets made — `onSendText` creates one — and a
     file dropped there works the same way now: the upload needs only a bot, and
     `ensureConversation` produces the conversation at send time, which is also
     the moment the operator has committed to it. The paperclip and the
     microphone used to vanish on that screen, which is exactly where somebody
     drags a price list in and wonders where the attach button went. */
  const textBlocked = blocked?.text ?? false;
  const filesBlocked = blocked?.attachments ?? false;
  const disabled = textBlocked;
  const canAttach = attachments.supported && !disabled && !filesBlocked;

  /* Under the box and nowhere else — `~ui` no longer stands this in for the
     placeholder, which used to print the same sentence twice, four pixels
     apart, in two different greys. */
  const disabledHint = textBlocked ? blocked?.reason : undefined;

  /* The request has been made and the run has not ended yet. Cleared by the run
     ending, whichever way it ended — a stop that failed leaves the loop alive,
     and a button that stayed dead after that would be the composer refusing to
     let the operator try again. */
  useEffect(() => {
    if (!busy) setStopping(false);
  }, [busy]);

  const send = (text: string) => {
    /* The tray answers whether it took the text as a caption. This API can put
       both in one message, which livechat's channels cannot — so the text only
       becomes a message of its own when nothing carried it.

       Nothing leaves the tray while attachments are blocked, and that is the
       whole point of the block: sending them anyway earns `AttachmentInvalid`,
       which arrives as a pending rejection and stops the conversation. The
       files stay staged with the reason above them and go when it lifts. */
    const captioned = filesBlocked ? false : attachments.send(text);
    if (!captioned && text !== '') onSendText(text);
    markSent();
  };

  const dragHasFiles = (event: DragEvent<HTMLDivElement>): boolean =>
    Array.from(event.dataTransfer.types).includes('Files');

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!canAttach || !dragHasFiles(event)) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canAttach || !dragHasFiles(event)) return;
    /* Not decoration: the browser's default for a dropped file is to navigate
       to it, so without this a dropped PDF replaces the whole dashboard. */
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    dragDepth.current = 0;
    setDragging(false);
    if (!canAttach || !dragHasFiles(event)) return;
    event.preventDefault();
    attachments.attach(Array.from(event.dataTransfer.files));
  };

  /* Paste and drop are handled on the wrapper because both events bubble out
     of the textarea, and `~ui`'s Composer takes no handler for either. Adding
     two props to a shared primitive so that one module can catch a screenshot
     is the wrong trade; this costs one div. */
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!canAttach) return;
    const files = Array.from(event.clipboardData.files);
    /* Only when there are files. A plain text paste must stay a text paste. */
    if (files.length === 0) return;
    event.preventDefault();
    attachments.attach(files);
  };

  const onVoicePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) attachments.attach(files);
    /* Picking the same file twice fires no change event unless the input is
       cleared, which reads to the operator as the button being broken. */
    event.target.value = '';
  };

  /* A recorded clip is a picked file from here down: the tray classifies it as
     audio, uploads it as `Audio` and routes it to `sendAudioMessage`, which is
     the same path the file picker always used. */
  const onVoiceClip = (clip: VoiceClip) => {
    attachments.attach([new File([clip.blob], voiceNoteName(clip.mimeType), { type: clip.mimeType })]);
  };

  /* Wrapping `getUserMedia` is how the module learns the answer to a question
     `VoiceRecorder` answers for itself but does not report: a refusal. On one,
     the recorder is swapped for the file picker, which is the only route to
     `sendAudioMessage` a blocked browser has left — and the notice below says
     why the control changed shape, since the recorder's own message goes with
     it. Passing this also disables the recorder's static "can this browser
     record" probe, which costs nothing: `canRecord` has already asked. */
  const requestMicrophone = useCallback(async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setMicRefused(true);
      throw error;
    }
  }, []);

  const interrupt = useCallback(() => {
    setStopping(true);
    onStop();
  }, [onStop]);

  const above: ReactNode[] = [];

  /* Only when the text can still go. When it cannot, `disabledHint` says why
     under the box, and a second copy up here would be shouting. */
  if (blocked && filesBlocked && !textBlocked) {
    above.push(
      <Notice key="blocked" tone="warning">
        {blocked.reason}
      </Notice>,
    );
  }
  if (canAttach && micRefused) {
    above.push(
      <Notice key="mic" tone="warning">
        The microphone is blocked in this browser. Attach an audio file instead — it is sent the same way.
      </Notice>,
    );
  }
  if (attachments.notice) {
    above.push(
      <Notice key="notice" tone="warning">
        {attachments.notice}
      </Notice>,
    );
  }
  if (attachments.error) {
    above.push(
      <Notice key="error" tone="danger">
        {attachments.error}
      </Notice>,
    );
  }

  if (attachments.staged.length > 0) {
    above.push(
      <div key="tray" className="flex w-full flex-wrap gap-2">
        {attachments.staged.map((attachment) => (
          <AttachmentTile
            key={attachment.id}
            kind={attachment.kind}
            name={attachment.name}
            meta={formatFileSize(attachment.size)}
            previewUrl={attachment.previewUrl}
            state={attachment.status}
            /* No `progress`: `uploadFile` is a promise and a promise has no
               progress channel, so the bar is indeterminate. An invented ramp
               that parks at 90% makes a stalled upload look like a slow one. */
            error={attachment.refusal ?? (attachment.failure ? uploadFailureText(attachment.failure) : undefined)}
            /* Only where pressing it could change the answer. A file the API
               will not take will not be taken any better the second time. */
            onRetry={attachment.failure ? () => attachments.retry(attachment.id) : undefined}
            onRemove={() => attachments.remove(attachment.id)}
          />
        ))}
      </div>,
    );
  }

  return (
    <div
      className="relative shrink-0"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      <input
        ref={voiceRef}
        type="file"
        accept={VOICE_ACCEPT}
        onChange={onVoicePicked}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />

      {dragging ? (
        <div className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center rounded-card border border-dashed border-accent bg-accent-soft/95 text-label font-medium text-accent">
          Drop to attach
        </div>
      ) : null}

      <Composer
        /* Deliberately NOT `compact`. That prop folds `leftSlot` behind a "+"
           in a popover, which is the right trade for a slot holding four
           pickers and the wrong one for a slot holding a single control — the
           "+" is the same width as the mic it hides, so it buys no room, and a
           `VoiceRecorder` inside a popover is a recording that stops the moment
           the operator clicks anywhere else. */
        onSend={send}
        disabled={disabled}
        disabledHint={disabledHint}
        placeholder="Ask the Coworker…"
        /* Audio, by the one route that carries it: a recorder where the browser
           has one, and the file picker where it does not or where the
           microphone was refused. Either way the clip becomes a staged file and
           the path below is identical. */
        leftSlot={
          !canAttach ? null : canRecord && !micRefused ? (
            <VoiceRecorder onSend={onVoiceClip} requestStream={requestMicrophone} />
          ) : (
            <Button
              iconOnly
              variant="ghost"
              onClick={() => voiceRef.current?.click()}
              aria-label="Attach an audio note"
            >
              <IconMic />
            </Button>
          )
        }
        /* No handler at all when there is no upload path or the block is on:
           a paperclip that is only ever refused is worse than no paperclip,
           and the notice above says which of the two it is. */
        onAttach={canAttach ? attachments.attach : undefined}
        accept={ATTACHMENT_ACCEPT}
        /* Zero while they are blocked: a tray of files and no text is then
           nothing that can be sent, and the button says so rather than firing
           a mutation the server answers by jamming the thread. */
        attachmentCount={filesBlocked ? 0 : attachments.sendable.length}
        /* An upload in flight greys the BUTTON, not the composer — letting the
           text go now and the picture in a moment would reorder them. */
        sending={attachments.uploading || busy}
        /* ONLY while a run is actually in flight, never as a constant: `~ui`
           replaces send with stop in place, and while `onStop` is set Enter
           neither sends nor stops. `busy` is already "there is something to
           interrupt" rather than the raw loop flag — the thread excludes a
           pending approval from it, because typing there IS the rejection and
           swallowing Enter would take the operator's answer away. */
        onStop={busy ? interrupt : undefined}
        stopping={stopping}
        attachments={above.length === 0 ? null : <div className="flex w-full flex-col gap-2">{above}</div>}
      />
    </div>
  );
}

type NoticeTone = 'warning' | 'danger';

const NOTICE_TONE: Record<NoticeTone, string> = {
  /* A rule, not a fault: the operator has done nothing wrong and there is
     nothing to retry. */
  warning: 'bg-warning-soft text-warning',
  /* Something was attempted and did not work. */
  danger: 'bg-danger-soft text-danger',
};

/** One line above the input: a rule, or something that just went wrong. */
function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <div className={`flex w-full items-start gap-1.5 rounded-control px-2 py-1 text-meta ${NOTICE_TONE[tone]}`}>
      <IconWarning size={12} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
